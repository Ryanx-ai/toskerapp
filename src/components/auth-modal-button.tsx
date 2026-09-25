"use client";

import { cloneElement, useState, type ReactElement, type ButtonHTMLAttributes } from "react";
import { SignIn, SignUp } from "@clerk/nextjs";
import { X } from "lucide-react";
import { ModalLayer } from "./modal-layer";

/** Tosker owns dismissal; Clerk owns every credential/verification/OAuth step.
 * Supported embedded components, not interception of provider DOM or events.
 */
export function AuthModalButton({ children, initial = "sign-in", redirectUrl = "/app" }: {
  children: ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>;
  initial?: "sign-in" | "sign-up";
  redirectUrl?: string;
}) {
  const [mode, setMode] = useState<"sign-in" | "sign-up" | null>(null);
  const [previousHash, setPreviousHash] = useState("");
  const close = () => {
    setMode(null);
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}${previousHash}`);
  };
  const appearance = {
    variables: { colorBackground: "#10181c", colorForeground: "#f4efe6", colorPrimary: "#c89c5d", colorInputBackground: "#121b20", colorInputText: "#f4efe6", colorMutedForeground: "#aaa69f", borderRadius: "0.75rem", fontFamily: "var(--font-montserrat), sans-serif" },
    elements: {
      rootBox: { width: "100%" }, cardBox: { width: "100%", boxShadow: "none" }, card: { boxShadow: "none", padding: "20px" },
      footerAction__signIn: { display: "none" }, footerAction__signUp: { display: "none" },
      headerTitle: { fontFamily: "var(--font-montserrat), sans-serif", fontSize: "24px", lineHeight: "1.3", fontWeight: "600", color: "#f4efe6" },
      socialButtonsBlockButton: { background: "#182329", color: "#f4efe6", minHeight: "44px" },
      socialButtonsBlockButtonText: { color: "#f4efe6" },
      formFieldInput: { background: "#121b20", color: "#f4efe6", minHeight: "44px", border: "1px solid #52616a" },
      formFieldInputShowPasswordButton: { color: "#aaa69f" },
      formButtonPrimary: { background: "#b82560", color: "#ffffff", minHeight: "44px" },
    },
  };
  return <>{cloneElement(children, { onClick: () => { setPreviousHash(window.location.hash); setMode(initial); } })}
    {mode ? <ModalLayer dismissOutside={false} dismissEscape={false} onClose={close}><section className="auth-dialog" aria-label={mode === "sign-in" ? "Sign in to Tosker" : "Join Tosker"}>
      <button className="overlay-close" aria-label="Close authentication" onClick={close}><X size={18} /></button>
      {mode === "sign-in" ? <SignIn routing="hash" withSignUp forceRedirectUrl={redirectUrl} signUpForceRedirectUrl={redirectUrl} appearance={appearance} /> : <SignUp routing="hash" forceRedirectUrl={redirectUrl} signInForceRedirectUrl={redirectUrl} appearance={appearance} />}
      <button className="auth-dialog-switch" onClick={() => { window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`); setMode(mode === "sign-in" ? "sign-up" : "sign-in"); }}>{mode === "sign-in" ? "New here? Create account" : "Already have an account? Sign in"}</button>
    </section></ModalLayer> : null}
  </>;
}
