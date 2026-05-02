-- ─────────────────────────────────────────────────────────────────────────────
-- Orchque — Supabase Schema  (fully idempotent — safe to re-run at any time)
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── user_credits ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_credits (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan             text        NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  monthly_credits  integer     NOT NULL DEFAULT 10,
  bonus_credits    integer     NOT NULL DEFAULT 0,
  reset_at         timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_credits_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_credits: owner read"   ON public.user_credits;
DROP POLICY IF EXISTS "user_credits: owner update" ON public.user_credits;

CREATE POLICY "user_credits: owner read"
  ON public.user_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_credits: owner update"
  ON public.user_credits FOR UPDATE
  USING (auth.uid() = user_id);

-- ── skills ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.skills (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  context     text        CHECK (context IS NULL OR char_length(context) <= 250),
  source      text        CHECK (source IS NULL OR source IN ('optimized', 'generated')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Add context column if upgrading existing schema
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS context text CHECK (context IS NULL OR char_length(context) <= 250);

-- Add source column if upgrading existing schema
ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS source text CHECK (source IS NULL OR source IN ('optimized', 'generated'));

CREATE INDEX IF NOT EXISTS skills_user_id_idx ON public.skills (user_id, created_at DESC);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skills: owner all" ON public.skills;

CREATE POLICY "skills: owner all"
  ON public.skills FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── skill_versions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.skill_versions (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id             uuid        NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  version              text        NOT NULL DEFAULT 'v1.0',
  content              text        NOT NULL,
  score                integer     CHECK (score BETWEEN 0 AND 100),
  token_estimate       integer,
  token_reduction_pct  integer,
  security_flags       text[]      NOT NULL DEFAULT '{}',
  improvements         text[]      NOT NULL DEFAULT '{}',
  axes                 jsonb       NOT NULL DEFAULT '{}',
  is_active            boolean     NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS skill_versions_skill_id_idx ON public.skill_versions (skill_id, created_at DESC);

ALTER TABLE public.skill_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skill_versions: owner all" ON public.skill_versions;

CREATE POLICY "skill_versions: owner all"
  ON public.skill_versions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.skills
      WHERE skills.id = skill_versions.skill_id
        AND skills.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.skills
      WHERE skills.id = skill_versions.skill_id
        AND skills.user_id = auth.uid()
    )
  );

-- ── support_tickets ───────────────────────────────────────────────────────────
-- NOTE: message body is stored in support_messages, not here.
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject     text        NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 200),
  status      text        NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority    text        NOT NULL DEFAULT 'normal'
                CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- If the old schema was run with a 'body' column, drop it safely
ALTER TABLE public.support_tickets DROP COLUMN IF EXISTS body;

CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx ON public.support_tickets (user_id, created_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_tickets: owner read/insert" ON public.support_tickets;

CREATE POLICY "support_tickets: owner read/insert"
  ON public.support_tickets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── support_messages ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.support_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   uuid        NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  body        text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  is_staff    boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_messages_ticket_id_idx ON public.support_messages (ticket_id, created_at ASC);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_messages: owner read"   ON public.support_messages;
DROP POLICY IF EXISTS "support_messages: owner insert" ON public.support_messages;

CREATE POLICY "support_messages: owner read"
  ON public.support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_messages.ticket_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "support_messages: owner insert"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_messages.ticket_id
        AND t.user_id = auth.uid()
    )
  );

-- ── SQL Functions ─────────────────────────────────────────────────────────────

-- Atomically check balance and deduct. Called from credits-service.ts.
-- monthly_credits is used as the lifetime credit pool for free users.
-- Pro users bypass this function entirely (checked at API layer by plan).
CREATE OR REPLACE FUNCTION public.check_and_deduct_credits(
  p_user_id uuid,
  p_cost    integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_monthly integer;
  v_bonus   integer;
  v_total   integer;
  v_new_monthly integer;
  v_new_bonus   integer;
BEGIN
  -- Lock the row for this user
  SELECT monthly_credits, bonus_credits
  INTO v_monthly, v_bonus
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'credits_row_missing', 'balance', 0);
  END IF;

  v_total := v_monthly + v_bonus;

  IF v_total < p_cost THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_credits', 'balance', v_total);
  END IF;

  -- Deduct from bonus first, then monthly
  IF v_bonus >= p_cost THEN
    v_new_bonus   := v_bonus - p_cost;
    v_new_monthly := v_monthly;
  ELSE
    v_new_bonus   := 0;
    v_new_monthly := v_monthly - (p_cost - v_bonus);
  END IF;

  UPDATE public.user_credits
  SET monthly_credits = v_new_monthly,
      bonus_credits   = v_new_bonus,
      updated_at      = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object('ok', true, 'balance_after', v_new_monthly + v_new_bonus);
END;
$$;

-- Refund credits (called on action failure)
CREATE OR REPLACE FUNCTION public.refund_credits(
  p_user_id uuid,
  p_amount  integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_credits
  SET monthly_credits = monthly_credits + p_amount,
      updated_at      = now()
  WHERE user_id = p_user_id;
END;
$$;

-- ── Trigger: auto-create user_credits row on new signup ───────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, plan, monthly_credits, bonus_credits)
  VALUES (NEW.id, 'free', 10, 0)  -- 10 lifetime credits for free tier
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Backfill: create credits row for existing users without one ───────────────
INSERT INTO public.user_credits (user_id, plan, monthly_credits, bonus_credits)
SELECT id, 'free', 10, 0
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_credits)
ON CONFLICT (user_id) DO NOTHING;
