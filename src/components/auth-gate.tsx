"use client";

import Image from "next/image";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";

export function AuthGate({ children }: { children: React.ReactNode }) {
  return (
    <Show
      when="signed-in"
      fallback={
        <main className="auth-page">
          <section className="auth-card">
            <Image
              src="/brand/toskerlogo-full-white.svg"
              alt="Tosker"
              width={168}
              height={80}
              priority
            />
            <h1>Your people, Rooms, and conversations—kept together.</h1>
            <p>Sign in to enter your Tosker workspace.</p>
            <div className="auth-actions">
              <SignInButton mode="modal">
                <button className="button button-primary">Sign in</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="button">Create account</button>
              </SignUpButton>
            </div>
          </section>
        </main>
      }
    >
      {children}
    </Show>
  );
}
