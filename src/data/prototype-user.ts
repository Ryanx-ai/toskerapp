export type PrototypeUser = {
  displayName: string;
  initials: string;
  role: string;
};

export const prototypeUser: PrototypeUser = {
  displayName: "Ryan",
  initials: "RY",
  role: "Founder preview",
};

export const dashboardLabel = (user: PrototypeUser) => `${user.displayName}'s Dashboard`;
