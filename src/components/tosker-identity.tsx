"use client";

import { createContext, useContext } from "react";

import type { CanonicalIdentity } from "@/server/accounts/bootstrap";

const IdentityContext = createContext<CanonicalIdentity | null>(null);

export function ToskerIdentityProvider({
  identity,
  children,
}: {
  identity: CanonicalIdentity | null;
  children: React.ReactNode;
}) {
  return (
    <IdentityContext.Provider value={identity}>
      {children}
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
