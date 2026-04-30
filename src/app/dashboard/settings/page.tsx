// Two-column settings layout: sidebar nav + right content panel
// Sections: Account | Security | Profile | Subscription | Legal | API Key | Sign Out | Danger Zone

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { toast } from "sonner";

import {
  User, Lock, Briefcase, FileText, Key, LogOut, ShieldAlert,
  Eye, EyeOff, CheckCircle2, Loader2, ExternalLink, Trash2,
  CreditCard, Zap, ArrowRight, Crown,
} from "lucide-react";
import Link from "next/link";
import { PRODUCT } from "@/lib/config";
import CreditChip from "@/components/dashboard/CreditChip";

// ─── Types ────────────────────────────────────────────────────────────────────

const PROFILE_ROLES = ["Developer", "Team Lead", "Student", "Researcher", "Other"] as const;
type ProfileRole = (typeof PROFILE_ROLES)[number];

type SectionId = "account" | "security" | "profile" | "subscription" | "legal" | "api" | "signout" | "danger";

interface NavItem {
  id: SectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "account",      label: "Account",      icon: User },
  { id: "security",     label: "Security",     icon: Lock },
  { id: "profile",      label: "Profile",      icon: Briefcase },
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "legal",        label: "Legal",        icon: FileText },
  { id: "api",          label: "API Key",      icon: Key },
  { id: "signout",      label: "Sign Out",     icon: LogOut },
  { id: "danger",       label: "Danger Zone",  icon: ShieldAlert, danger: true },
];

// ─── Shared ───────────────────────────────────────────────────────────────────

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
    </div>
  );
}

function FieldError({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return <p className="text-xs text-red-500 mt-1">{msg}</p>;
}

// ─── Section: Account ─────────────────────────────────────────────────────────

function AccountSection({
  email, displayName, setDisplayName, displayNameError, setDisplayNameError, saving, onSave,
}: {
  email: string; displayName: string; setDisplayName: (v: string) => void;
  displayNameError: string | null; setDisplayNameError: (v: string | null) => void;
  saving: boolean; onSave: () => void;
}) {
  return (
    <div>
      <SectionHeader title="Account" description="Your account details and display name." />
      <div className="space-y-4 max-w-md">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Email address</label>
          <input
            value={email}
            readOnly
            disabled
            className="flex h-9 w-full rounded-md border bg-muted px-3 text-sm text-muted-foreground cursor-not-allowed"
          />
          <p className="text-[11px] text-muted-foreground">Email cannot be changed.</p>
        </div>
        <div className="space-y-1">
          <label htmlFor="display-name" className="text-xs font-medium text-muted-foreground">
            Display name
          </label>
          <input
            id="display-name"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); setDisplayNameError(null); }}
            placeholder="Your name"
            maxLength={64}
            className={cn(
              "flex h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
              displayNameError && "border-red-500/60"
            )}
          />
          <FieldError msg={displayNameError} />
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Section: Security ────────────────────────────────────────────────────────

function SecuritySection({
  newPassword, setNewPassword, confirmPassword, setConfirmPassword,
  showNew, setShowNew, showConfirm, setShowConfirm,
  errors, setErrors, saving, onSave,
}: {
  newPassword: string; setNewPassword: (v: string) => void;
  confirmPassword: string; setConfirmPassword: (v: string) => void;
  showNew: boolean; setShowNew: (v: boolean) => void;
  showConfirm: boolean; setShowConfirm: (v: boolean) => void;
  errors: { new: string | null; confirm: string | null };
  setErrors: (v: { new: string | null; confirm: string | null }) => void;
  saving: boolean; onSave: () => void;
}) {
  return (
    <div>
      <SectionHeader title="Security" description="Change your account password." />
      <div className="space-y-4 max-w-md">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">New password</label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setErrors({ ...errors, new: null }); }}
              placeholder="Min. 8 characters"
              maxLength={72}
              autoComplete="new-password"
              className={cn(
                "flex h-9 w-full rounded-md border bg-background px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
                errors.new && "border-red-500/60"
              )}
            />
            <button type="button" onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <FieldError msg={errors.new} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Confirm password</label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setErrors({ ...errors, confirm: null }); }}
              placeholder="Re-enter new password"
              maxLength={72}
              autoComplete="new-password"
              className={cn(
                "flex h-9 w-full rounded-md border bg-background px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
                errors.confirm && "border-red-500/60"
              )}
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <FieldError msg={errors.confirm} />
        </div>
        <button
          onClick={onSave}
          disabled={saving || !newPassword}
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
          {saving ? "Updating…" : "Update Password"}
        </button>
      </div>
    </div>
  );
}

// ─── Section: Profile ─────────────────────────────────────────────────────────

function ProfileSection({
  profileRole, setProfileRole, saving, onSave,
}: {
  profileRole: ProfileRole | ""; setProfileRole: (v: ProfileRole | "") => void;
  saving: boolean; onSave: () => void;
}) {
  return (
    <div>
      <SectionHeader title="Profile" description="Tell us how you use Orchque." />
      <div className="space-y-4 max-w-md">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Role / Purpose</label>
          <select
            value={profileRole}
            onChange={(e) => setProfileRole(e.target.value as ProfileRole)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="" disabled>Select your role…</option>
            {PROFILE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <button
          onClick={onSave}
          disabled={saving || !profileRole}
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </div>
    </div>
  );
}

// ─── Section: Subscription ────────────────────────────────────────────────────

function SubscriptionSection() {
  return (
    <div>
      <SectionHeader title="Subscription" description="Manage your plan and credits." />
      <div className="space-y-4 max-w-lg">
        {/* Current plan */}
        <div className="rounded-lg border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold">Free Plan</p>
              <p className="text-xs text-muted-foreground mt-0.5">{PRODUCT.pricing.free.actions} credits / month</p>
            </div>
            <span className="text-xs font-medium rounded-full border px-2.5 py-1">Free</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Credits remaining: <CreditChip />
          </div>
        </div>

        {/* Pro upgrade */}
        <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
          <div className="flex items-start gap-3 mb-3">
            <Crown className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Upgrade to Pro</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                ${PRODUCT.pricing.pro.price}/mo · {PRODUCT.pricing.pro.actions} credits/month
              </p>
            </div>
          </div>
          <ul className="space-y-1.5 mb-4">
            {PRODUCT.pricing.pro.features.slice(0, 4).map((f) => (
              <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />{f}
              </li>
            ))}
          </ul>
          <button
            disabled
            title="Payments coming soon"
            className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
          >
            <Zap className="h-4 w-4" />
            Upgrade to Pro — ${PRODUCT.pricing.pro.price}/mo
          </button>
          <p className="text-xs text-muted-foreground mt-2 text-center">Payments coming soon.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Section: Legal ───────────────────────────────────────────────────────────

function LegalSection() {
  const links = [
    { label: "Privacy Policy",       desc: "How we handle your data.",              href: "/legal/privacy-policy" },
    { label: "Terms of Service",     desc: "Rules and conditions of use.",           href: "/legal/terms-of-service" },
    { label: "Acceptable Use",       desc: "What you can and can't do.",             href: "/legal/acceptable-use" },
    { label: "Refund Policy",        desc: "Refund eligibility and how to request.", href: "/legal/refund-policy" },
  ];
  return (
    <div>
      <SectionHeader title="Legal" description="Terms and privacy information." />
      <div className="space-y-2 max-w-md">
        {links.map(({ label, desc, href }) => (
          <a key={href} href={href} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-3 hover:bg-muted/40 transition-colors group">
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Section: API Key ─────────────────────────────────────────────────────────

function ApiKeySection() {
  return (
    <div>
      <SectionHeader title="API Key" description="Use Orchque programmatically via REST API." />
      <div className="max-w-md">
        <div className="flex items-start justify-between gap-4 rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium">Personal API Key</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted border px-2 py-0.5 text-xs font-medium">
                <Crown className="h-3 w-3" /> Coming Soon
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-xs">
              Access skill optimization and generation programmatically. Under development.
            </p>
          </div>
          <button disabled
            className="h-8 px-3 rounded-md border text-xs font-medium flex items-center gap-1.5 opacity-40 cursor-not-allowed shrink-0">
            <Key className="h-3.5 w-3.5" /> Generate Key
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionId>("account");

  // Sync active section with URL hash
  useEffect(() => {
    const VALID: SectionId[] = ["account", "security", "profile", "subscription", "legal", "api", "signout", "danger"];
    function applyHash() {
      const hash = window.location.hash.replace("#", "") as SectionId;
      if (VALID.includes(hash)) setActiveSection(hash);
    }
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  // Account
  const [displayName, setDisplayName] = useState("");
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);

  // Security
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{ new: string | null; confirm: string | null }>({ new: null, confirm: null });
  const [savingPassword, setSavingPassword] = useState(false);

  // Profile
  const [profileRole, setProfileRole] = useState<ProfileRole | "">("");
  const [savingRole, setSavingRole] = useState(false);

  // Danger
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sign out
  const [signingOut, setSigningOut] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.push("/auth/signin"); return; }
      const u = session.user;
      setUser(u);
      setDisplayName(u.user_metadata?.display_name ?? u.email?.split("@")[0] ?? "");
      setProfileRole((u.user_metadata?.profile_role as ProfileRole) ?? "");
    } catch {
      router.push("/auth/signin");
    } finally {
      setPageLoading(false);
    }
  }, [router, supabase.auth]);

  useEffect(() => { loadUser(); }, [loadUser]);

  async function handleSaveAccount() {
    setDisplayNameError(null);
    const name = displayName.trim();
    if (!name) { setDisplayNameError("Display name cannot be empty."); return; }
    if (name.length > 64) { setDisplayNameError("Must be 64 characters or fewer."); return; }
    setSavingAccount(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { display_name: name } });
      if (error) { toast.error(error.message); return; }
      toast.success("Display name updated.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleChangePassword() {
    const errs = { new: null as string | null, confirm: null as string | null };
    if (!newPassword) errs.new = "New password is required.";
    else if (newPassword.length < 8) errs.new = "Must be at least 8 characters.";
    else if (newPassword.length > 72) errs.new = "Must be 72 characters or fewer.";
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      errs.confirm = "Passwords do not match.";
    }
    setPasswordErrors(errs);
    if (errs.new || errs.confirm) return;

    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update password."); return; }
      toast.success("Password updated successfully.");
      setNewPassword(""); setConfirmPassword("");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSaveProfile() {
    if (!profileRole) { toast.error("Please select a role first."); return; }
    setSavingRole(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { profile_role: profileRole } });
      if (error) { toast.error(error.message); return; }
      toast.success("Profile updated.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSavingRole(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/auth/signin");
    } catch {
      toast.error("Sign-out failed. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to delete account."); setDeleting(false); return; }
      setDeleteOpen(false);
      toast.success("Account permanently deleted.");
      router.push("/auth/signin");
    } catch {
      toast.error("Network error. Please try again.");
      setDeleting(false);
    }
  }

  if (pageLoading) {
    return (
      <div className="flex gap-6">
        <div className="w-48 shrink-0 space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 rounded-md bg-muted/50 animate-pulse" />
          ))}
        </div>
        <div className="flex-1 space-y-4">
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          <div className="h-28 bg-muted/40 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  const email = user?.email ?? "";

  function renderSection() {
    switch (activeSection) {
      case "account":
        return (
          <AccountSection
            email={email} displayName={displayName} setDisplayName={setDisplayName}
            displayNameError={displayNameError} setDisplayNameError={setDisplayNameError}
            saving={savingAccount} onSave={handleSaveAccount}
          />
        );
      case "security":
        return (
          <SecuritySection
            newPassword={newPassword} setNewPassword={setNewPassword}
            confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
            showNew={showNew} setShowNew={setShowNew}
            showConfirm={showConfirm} setShowConfirm={setShowConfirm}
            errors={passwordErrors} setErrors={setPasswordErrors}
            saving={savingPassword} onSave={handleChangePassword}
          />
        );
      case "profile":
        return (
          <ProfileSection
            profileRole={profileRole} setProfileRole={setProfileRole}
            saving={savingRole} onSave={handleSaveProfile}
          />
        );
      case "subscription":
        return <SubscriptionSection />;
      case "legal":
        return <LegalSection />;
      case "api":
        return <ApiKeySection />;
      case "signout":
        return (
          <div>
            <SectionHeader title="Sign Out" description="Sign out of your Orchque account." />
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="h-9 px-4 rounded-md border border-orange-500/40 text-orange-600 dark:text-orange-400 text-sm font-medium flex items-center gap-2 hover:bg-orange-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              {signingOut ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        );
      case "danger":
        return (
          <div>
            <SectionHeader title="Danger Zone" description="Irreversible actions. Proceed with caution." />
            <div className="max-w-md rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-4">
              {!deleteOpen ? (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Delete Account</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Permanently deletes your account, skills, and all data. Cannot be undone.
                    </p>
                  </div>
                  <button
                    onClick={() => setDeleteOpen(true)}
                    className="h-8 px-3 rounded-md border border-red-500/40 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-1.5 hover:bg-red-500/10 transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    This will permanently delete your account and all data.
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc ml-4">
                    <li>All skills and version history</li>
                    <li>All optimization results</li>
                    <li>Your profile and credits</li>
                  </ul>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">
                      Type your email to confirm:{" "}
                      <span className="font-mono text-primary">{email}</span>
                    </label>
                    <input
                      value={deleteEmail}
                      onChange={(e) => setDeleteEmail(e.target.value)}
                      placeholder={email}
                      className="flex h-9 w-full rounded-md border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      autoComplete="off"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting || deleteEmail.trim().toLowerCase() !== email.toLowerCase()}
                      className="h-9 px-4 rounded-md bg-red-600 text-white text-sm font-medium flex items-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      {deleting ? "Deleting…" : "Yes, delete my account"}
                    </button>
                    <button
                      onClick={() => { setDeleteOpen(false); setDeleteEmail(""); }}
                      disabled={deleting}
                      className="h-9 px-4 rounded-md border text-sm font-medium hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="max-w-4xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account, security and preferences.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6 min-h-[400px]">
        {/* Left sidebar nav */}
        <aside className="w-48 shrink-0 border-r border-border/40 pr-4">
          <nav className="space-y-0.5">
            {NAV_ITEMS.map(({ id, label, icon: Icon, danger }) => (
              <button
                key={id}
                onClick={() => { setActiveSection(id); window.location.hash = id; }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left",
                  activeSection === id
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  danger && "text-red-600 hover:text-red-600 dark:text-red-400 dark:hover:text-red-400"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", danger && "text-red-600 dark:text-red-400")} />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Right content */}
        <div className="flex-1 min-w-0">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}

