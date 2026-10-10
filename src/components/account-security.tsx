"use client";
import { useClerk, useUser } from "@clerk/nextjs";
import { useState } from "react";
import { REALTIME_SIGNOUT } from "@/lib/live-contract";
import { SettingsSection } from "./settings-shell";

/** No credential fields, provider mutation or account-delete affordance. */
export function AccountSecurity({ disabled = false }: { disabled?: boolean }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    if (pending) return;
    setPending(true); setError("");
    window.dispatchEvent(new Event(REALTIME_SIGNOUT));
    try {
      const response = await fetch("/api/realtime/logout", { method: "POST", credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!response.ok && response.status !== 401) throw new Error("Sign-out unavailable");
      await signOut({ redirectUrl: "/" });
    } catch { setError("Live has stopped on this page. Sign-out could not be completed; please try again."); setPending(false); }
  }
  return <SettingsSection title="Account" description="Your sign-in account. Your Tosker identity and conversations stay separate.">
    {!isLoaded ? <p role="status">Loading account…</p> : !user ? <p role="alert">Sign in to view your account.</p> : <>
      <dl className="owner-profile-identifiers"><div><dt>Email</dt><dd>{user.primaryEmailAddress?.emailAddress ?? "No primary email"}</dd></div><div><dt>Password</dt><dd>{user.passwordEnabled ? "Set" : "Not used for this account"}</dd></div><div><dt>Two-step verification</dt><dd>{user.twoFactorEnabled ? "Enabled" : "Not enabled"}</dd></div></dl>
      <p className="settings-scope">Account management is being prepared with our sign-in provider. Account deletion isn’t available here while Room ownership and retention safeguards are incomplete.</p>
      <div className="account-signout"><button className="quiet-action danger" type="button" disabled={disabled || pending} onClick={() => void logout()}>{pending ? "Logging out…" : "Log out"}</button></div>
      {error ? <p role="alert">{error}</p> : null}
      {disabled ? <p className="settings-scope">Save or discard your changes first.</p> : null}
    </>}
  </SettingsSection>;
}
