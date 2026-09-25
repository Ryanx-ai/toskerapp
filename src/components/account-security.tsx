"use client";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { SettingsSection } from "./settings-shell";

/** No credential fields, provider mutation or account-delete affordance. */
export function AccountSecurity({ disabled = false }: { disabled?: boolean }) {
  const { user, isLoaded } = useUser();
  return <SettingsSection title="Account" description="Your sign-in account. Your Tosker identity and conversations stay separate.">
    {!isLoaded ? <p role="status">Loading account…</p> : !user ? <p role="alert">Sign in to view your account.</p> : <>
      <dl className="owner-profile-identifiers"><div><dt>Email</dt><dd>{user.primaryEmailAddress?.emailAddress ?? "No primary email"}</dd></div><div><dt>Password</dt><dd>{user.passwordEnabled ? "Set" : "Not used for this account"}</dd></div><div><dt>Two-step verification</dt><dd>{user.twoFactorEnabled ? "Enabled" : "Not enabled"}</dd></div></dl>
      <p className="settings-scope">Account management is being prepared with our sign-in provider. Account deletion isn’t available here while Room ownership and retention safeguards are incomplete.</p>
      <div className="account-signout"><SignOutButton redirectUrl="/"><button className="quiet-action danger" type="button" disabled={disabled}>Log out</button></SignOutButton></div>
      {disabled ? <p className="settings-scope">Save or discard your changes first.</p> : null}
    </>}
  </SettingsSection>;
}
