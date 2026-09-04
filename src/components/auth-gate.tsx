"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useSyncExternalStore } from "react";
import { prototypeStore } from "@/lib/prototype-store";

const demoStore = {
  subscribe(listener: () => void) {
    window.addEventListener("storage", listener);
    window.addEventListener("tosker:demo", listener);
    return () => { window.removeEventListener("storage", listener); window.removeEventListener("tosker:demo", listener); };
  },
  getSnapshot: () => window.localStorage.getItem("tosker.demo.mode") === "true",
  getServerSnapshot: () => false,
};

export function AuthGate({ children, allowDemo = true }: { children: React.ReactNode; allowDemo?: boolean }) {
  const pathname = usePathname();
  const demo = useSyncExternalStore(demoStore.subscribe, demoStore.getSnapshot, demoStore.getServerSnapshot);
  if (pathname.startsWith("/join/")) return children;
  if (allowDemo && demo) return <div className="demo-shell"><div className="demo-indicator" role="status">Demo</div>{children}<button className="demo-exit" onClick={() => { window.localStorage.removeItem("tosker.demo.mode"); window.dispatchEvent(new Event("tosker:demo")); }}>Exit Demo</button></div>;

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
              <button className="button demo-button" onClick={() => { window.localStorage.setItem("tosker.demo.mode", "true"); prototypeStore.setMode("demo"); window.dispatchEvent(new Event("tosker:demo")); }}>View Demo</button>
            </div>
          </section>
        </main>
      }
    >
      {children}
    </Show>
  );
}
