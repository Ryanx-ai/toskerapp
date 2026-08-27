import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const montserrat = localFont({ src: [
  { path: "./fonts/Montserrat-Regular.ttf", weight: "400", style: "normal" },
  { path: "./fonts/Montserrat-Medium.ttf", weight: "500", style: "normal" },
  { path: "./fonts/Montserrat-SemiBold.ttf", weight: "600", style: "normal" },
  { path: "./fonts/Montserrat-Bold.ttf", weight: "700", style: "normal" },
], variable: "--font-montserrat", display: "swap" });
const mermaid = localFont({ src: "./fonts/Mermaid1001.ttf", variable: "--font-mermaid", display: "swap", adjustFontFallback: "Times New Roman" });

export const metadata: Metadata = { title: { default: "Tosker", template: "%s · Tosker" }, description: "A shared digital room for the things people do together." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${montserrat.variable} ${mermaid.variable}`}><body>{children}</body></html>;
}
