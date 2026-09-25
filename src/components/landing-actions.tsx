"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { AuthModalButton } from "./auth-modal-button";
import { ArrowRight } from "lucide-react";
import styles from "@/app/landing.module.css";

export function LandingActions() {
  const { isLoaded, isSignedIn } = useAuth();
  return <div className={styles.actions}>
    {isSignedIn ? <>
      <Link className={styles.primary} href="/app">Open Tosker <ArrowRight size={16} aria-hidden="true" /></Link>
      <Link className={styles.secondary} href="/app">Join Tosker</Link>
    </> : <>
      <AuthModalButton>
        <button className={styles.primary} disabled={!isLoaded}>Open Tosker <ArrowRight size={16} aria-hidden="true" /></button>
      </AuthModalButton>
      <AuthModalButton initial="sign-up">
        <button className={styles.secondary} disabled={!isLoaded}>Join Tosker</button>
      </AuthModalButton>
    </>}
  </div>;
}
