"use client";

import { createContext, useContext, type ReactNode } from "react";

export const NamecardContext = createContext<((userId: string) => void) | null>(null);

/** Static in demo/unknown-identity contexts; never pretends to open a profile. */
export function NamecardButton({ userId, name, children, className = "", onOpen }: { userId?: string; name: string; children: ReactNode; className?: string; onOpen?: () => void }) {
  const open = useContext(NamecardContext);
  if (!userId || !open) return <>{children}</>;
  return <button type="button" className={`namecard-trigger ${className}`} aria-label={`Open ${name}'s Namecard`} aria-haspopup="dialog" onClick={(event) => { event.stopPropagation(); onOpen?.(); open(userId); }}>{children}</button>;
}
