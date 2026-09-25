"use client";

import { createContext, useContext, type CSSProperties } from "react";
import { interfacePalette } from "@/lib/profile-contract";

import type { CanonicalIdentity } from "@/server/accounts/bootstrap";

const IdentityContext = createContext<CanonicalIdentity | null>(null);

export function ToskerIdentityProvider({
  identity,
  children,
}: {
  identity: CanonicalIdentity | null;
  children: React.ReactNode;
}) {
  const accent=identity?.ownProfile.interfaceAccent ?? "tosker", palette=interfacePalette[accent];
  return (
    <IdentityContext.Provider value={identity}>
      <div className="viewer-appearance" data-interface-accent={accent} style={{"--action-fill":palette.fill,"--ui-highlight":palette.highlight} as CSSProperties}>{children}</div>
    </IdentityContext.Provider>
  );
}

export function useToskerIdentity() {
  return useContext(IdentityContext);
}

export function useCurrentToskerUser() {
  const identity = useToskerIdentity();

  if (!identity) {
    return null;
  }

  const initials = identity.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return {
    ...identity,
    initials: initials || "TO",
    role: "Tosker member",
    username: `@${identity.username}`,
  };
}
