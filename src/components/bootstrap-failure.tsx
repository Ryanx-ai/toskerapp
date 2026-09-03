"use client";

import { SignOutButton } from "@clerk/nextjs";

export function BootstrapFailure() {
  return (
    <main className="auth-page">
      <section className="auth-card" role="alert">
        <h1>We couldn’t open your workspace.</h1>
        <p>Your Clerk account is safe. Tosker could not reach its development database.</p>
        <div className="auth-actions">
          <button className="button button-primary" onClick={() => window.location.reload()}>
            Try again
          </button>
          <SignOutButton>
            <button className="button">Sign out</button>
          </SignOutButton>
        </div>
      </section>
    </main>
  );
}
