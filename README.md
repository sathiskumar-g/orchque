# saas-template

A reusable Next.js 15 SaaS starter. Copy → configure → ship.

## Stack

- **Next.js 15** (App Router, TypeScript, `src/` layout)
- **Tailwind CSS v4** (CSS-based config, shadcn base-nova)
- **Supabase** (auth + database, cookie sessions)
- **Resend** (transactional email)
- **Sonner** (toasts)
- Payments: placeholder (501) — wire Lemon Squeezy per product

## Quick start

### 1. Clone and install

```bash
cp -r saas-template my-product
cd my-product
npm install
```

### 2. Configure your product

Edit `src/lib/config.ts` — change `name`, `description`, `color`, `hero`, `features`, `pricing`.

### 3. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project settings
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings > API > service role
- `RESEND_API_KEY` — from resend.com
- Sender emails (must match verified domain in Resend)

### 4. Supabase database

In your Supabase project → SQL Editor, run the schema from `docs/schema.sql` (or paste from `template-plan.md`).

Enable **Email auth** in Authentication > Providers. Set Site URL to your domain and add `http://localhost:3000/**` to redirect URLs.

### 5. Run

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Project structure

```
src/
  app/
    page.tsx                    # Landing page
    dashboard/
      layout.tsx                # Auth guard + sidebar
      page.tsx                  # Dashboard home
      product/page.tsx          # Product feature
      settings/page.tsx
      support/
        page.tsx
        [id]/page.tsx
    auth/
      signin/ signup/ forgot-password/ reset-password/ callback/ error/
    api/
      auth/signin|signup|signout|reset-password|update-password
      action/                   # ← Replace with your product logic
      credits/balance/
      notifications/
      payments/checkout/        # 501 placeholder — wire Lemon Squeezy
      support/[id]/
  components/
    marketing/  Navbar Hero Features PricingSection Footer
    dashboard/  Sidebar MobileSidebar CreditChip StatsCard EmptyState
    settings/   ProfileForm PlanCard DangerZone
    support/    TicketForm TicketList TicketDetail
    product/    ProductInput ProductResult UpgradeGate
    shared/     UserMenu
  lib/
    config.ts           ← Edit this for each product
    supabase.ts
    supabase-server.ts
    supabase-admin.ts
    credits-service.ts
    email.ts
    rate-limit.ts
    retry.ts
    validate-email.ts
```

## Per-product checklist

- [ ] Edit `src/lib/config.ts`
- [ ] Fill `.env.local`
- [ ] Run Supabase schema SQL
- [ ] Replace `src/app/api/action/route.ts` with real logic
- [ ] Replace `src/components/product/ProductInput.tsx` label/placeholder
- [ ] Replace `src/components/product/ProductResult.tsx` rendering
- [ ] Wire Lemon Squeezy in `src/app/api/payments/checkout/route.ts`

## Payments

Payments are disabled by default (501 placeholder). When ready:
1. Create a Lemon Squeezy store + product
2. Set `LEMONSQUEEZY_API_KEY` + `LEMONSQUEEZY_STORE_ID` + `LEMONSQUEEZY_WEBHOOK_SECRET`
3. Set `PRODUCT.pricing.pro.variantId` in `config.ts`
4. Replace checkout route and `PlanCard` / `UpgradeGate` upgrade buttons

See `template.md` Part 2.6 for full wiring guide.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
