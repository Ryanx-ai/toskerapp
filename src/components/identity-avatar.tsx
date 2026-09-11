"use client";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { approvedAvatarUrl, identityHash, identityPalette, roomShorthand } from "@/lib/identity-visual";
import { Box } from "lucide-react";

export function SandboxAvatar({ className = "" }: { className?: string }) {
  return <span className={`avatar avatar-room sandbox-avatar ${className}`} aria-hidden="true"><Box size={20} strokeWidth={1.8} /></span>;
}

export function PersonAvatar({ seed, initials, imageUrl, className = "", children }: { seed?: string; initials: string; imageUrl?: string | null; className?: string; children?: ReactNode }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const photo = approvedAvatarUrl(imageUrl);
  const [base, accent, detail] = identityPalette(seed ?? initials);
  const variation = identityHash(seed ?? initials) % 4;
  return <span className={`avatar person-avatar ${className}`}>
    {photo && failedUrl !== photo ? <Image src={photo} alt="" width={80} height={80} unoptimized onError={() => setFailedUrl(photo)} /> : seed ? <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" fill={base} />
      <g transform={`rotate(${variation * 90} 32 32)`}>
        <path d="M8 36a24 24 0 0 1 48 0v20H8Z" fill={accent} />
        <circle cx="32" cy="27" r={variation % 2 ? 12 : 9} fill={base} />
        <path d="M18 51 32 37 46 51 32 61Z" fill={detail} />
        <circle cx="49" cy="12" r="5" fill={detail} />
      </g>
    </svg> : <span>{initials || "?"}</span>}
    {children}
  </span>;
}

export function RoomAvatar({ name, seed, className = "", subroom = false }: { name: string; seed: string; className?: string; subroom?: boolean }) {
  const [base, accent] = identityPalette(seed);
  return <span className={`avatar avatar-room room-identity-avatar ${className}`} style={{ background: base, color: accent }} aria-hidden="true"><span>{roomShorthand(name)}</span>{subroom ? <i /> : null}</span>;
}
