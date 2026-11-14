export const primaryRoles = [
  {
    value: "host",
    label: "Host",
    description: "I create, promote, and operate events.",
  },
  {
    value: "model",
    label: "Model",
    description: "I build my portfolio and join shoots and events.",
  },
  {
    value: "photographer",
    label: "Photographer",
    description: "I photograph events, find collaborators, and share my work.",
  },
  {
    value: "sponsor",
    label: "Sponsor",
    description: "I support events, models, or photographers on behalf of a brand.",
  },
] as const;

export type PrimaryRole = (typeof primaryRoles)[number]["value"];

export const primaryRoleValues = new Set<string>(
  primaryRoles.map((role) => role.value),
);

export function primaryRoleLabel(value: string) {
  if (value === "organizer" || value === "promoter") return "Host";
  return primaryRoles.find((role) => role.value === value)?.label ?? value;
}

export function isHostRole(value: string | null | undefined) {
  return value === "host" || value === "organizer" || value === "promoter";
}

export function isGuestOnlyEventRole(value: string | null | undefined) {
  return isHostRole(value) || value === "sponsor";
}
