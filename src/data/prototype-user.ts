export type PrototypeUser = {
  name: string;
  initials: string;
  role: string;
};

export const prototypeUser: PrototypeUser = {
  name: "Ryan",
  initials: "RY",
  role: "Founder preview",
};

export const dashboardLabel = (user: PrototypeUser) => `${user.name}'s Dashboard`;
