/** Sandbox is a personal space, not the owner's person/avatar identity. */
export function sandboxName(displayName: string) {
  const firstName = displayName.trim().split(/\s+/u)[0];
  return firstName ? `${firstName}'s Sandbox` : "Your Sandbox";
}

/** Disclose only the current Room family, on either of its surfaces. */
export function activeRoomSlug(selected?: { kind: string; slug: string }, workspace?: string) {
  return !workspace && selected?.kind === "room" ? selected.slug.split("--")[0] : null;
}
