"use client";

import { createContext, useContext, type ReactNode } from "react";

export const NamecardContext = createContext<((userId: string, roomId?: string) => void) | null>(null);
export const NamecardRoomContext = createContext<string | undefined>(undefined);

/** Static in demo/unknown-identity contexts; never pretends to open a profile. */
export function NamecardButton({ userId, name, children, className = "", onOpen, roomId }: { userId?: string; name: string; children: ReactNode; className?: string; onOpen?: () => void; roomId?: string }) {
  const open = useContext(NamecardContext);
  const contextRoom = useContext(NamecardRoomContext);
  if (!userId || !open) return <>{children}</>;
  return <button type="button" className={`namecard-trigger ${className}`} aria-label={`Open ${name}'s Namecard`} aria-haspopup="dialog" onClick={(event) => { event.stopPropagation(); onOpen?.(); open(userId,roomId ?? contextRoom); }}>{children}</button>;
}
