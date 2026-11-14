export const participationTypes = [
  {
    type: "model",
    label: "Model",
    description: "Reserve a model place and pay to confirm your booking.",
  },
  {
    type: "photographer",
    label: "Photographer",
    description: "Reserve a photographer place and pay to confirm your booking.",
  },
  {
    type: "sponsor",
    label: "Sponsor",
    description: "Offer funding or product support for an agreed partnership package.",
  },
  {
    type: "attendee",
    label: "General attendee",
    description: "Join networking and open-access event programming.",
  },
] as const;

export type ParticipationType = (typeof participationTypes)[number]["type"];

export type ParticipationPathInput = {
  type: ParticipationType;
  enabled: boolean;
  title: string;
  description: string;
  priceCents: number;
  capacity: number;
  approvalRequired: boolean;
};

export function participationDescription(path: Pick<ParticipationPathInput, "type" | "description">) {
  const legacy = path.type === "model" ? "Apply for a talent place and pay the model rate after approval." : path.type === "photographer" ? "Reserve a shooting place and pay the photographer rate after approval." : null;
  return path.description === legacy ? participationTypes.find((item) => item.type === path.type)!.description : path.description;
}

export const defaultParticipationPaths: ParticipationPathInput[] =
  participationTypes.map((path) => ({
    type: path.type,
    enabled: true,
    title: path.label,
    description: path.description,
    priceCents:
      path.type === "model"
        ? 25000
        : path.type === "photographer"
          ? 35000
          : path.type === "sponsor"
            ? 100000
            : 5000,
    capacity: path.type === "attendee" ? 50 : path.type === "sponsor" ? 4 : 8,
    approvalRequired: path.type !== "attendee",
  }));

const participationTypeValues = new Set<string>(
  participationTypes.map((path) => path.type),
);

export function parseParticipationPaths(value: unknown): ParticipationPathInput[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const paths: ParticipationPathInput[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const type = typeof record.type === "string" ? record.type : "";
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const description =
      typeof record.description === "string" ? record.description.trim() : "";
    const priceCents = Number(record.priceCents);
    const capacity = Number(record.capacity);
    if (
      !participationTypeValues.has(type) ||
      seen.has(type) ||
      !title ||
      title.length > 80 ||
      description.length > 500 ||
      !Number.isInteger(priceCents) ||
      priceCents < 0 ||
      priceCents > 100_000_000 ||
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 100_000
    ) {
      continue;
    }
    seen.add(type);
    paths.push({
      type: type as ParticipationType,
      enabled: record.enabled === true,
      title,
      description,
      priceCents,
      capacity,
      approvalRequired: record.approvalRequired === true,
    });
  }
  return paths;
}
