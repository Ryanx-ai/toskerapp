import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import { AUTH_REDIRECT_ORIGINS } from "@/config/app";
import "./globals.css";
import "./fp3-shell.css";
import "./fp4-alignment.css";
import "./fp5-synthesis.css";
import "./ms73-workspace.css";
import "./ms73-search.css";
import "./ms73-fp1.css";
import "./ms73-fp2.css";

// Official Inter 4.1, bundled under SIL OFL; no external font request.
const inter = localFont({ src: "./fonts/InterVariable.woff2", weight: "100 900", style: "normal", variable: "--font-inter", display: "swap" });
const mermaid = localFont({ src: "./fonts/Mermaid1001.ttf", variable: "--font-mermaid", display: "swap", adjustFontFallback: "Times New Roman" });

export const metadata: Metadata = { title: { default: "Tosker", template: "%s · Tosker" }, description: "A shared digital room for the things people do together." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${inter.variable} ${mermaid.variable}`}><body><ClerkProvider allowedRedirectOrigins={AUTH_REDIRECT_ORIGINS}>{children}</ClerkProvider></body></html>;
}
