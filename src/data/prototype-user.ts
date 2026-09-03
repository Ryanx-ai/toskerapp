export type PrototypeUser = {
  displayName: string;
  initials: string;
  role: string;
  username: string;
  tid: string;
};

export const prototypeUser: PrototypeUser = {
  displayName: "Ryan",
  initials: "RY",
  role: "Founder preview",
  username: "@ryan",
  tid: "TID-0001-RYAN",
};

export const sandboxLabel = (user: PrototypeUser) => `${user.displayName}'s Sandbox`;
