import type { Metadata } from "next";
import { RealmShell } from "@/components/realm-shell";
export const metadata: Metadata = { title: "Tokyo 2027" };
export default function TokyoLayout({ children }: { children: React.ReactNode }) { return <RealmShell>{children}</RealmShell>; }
