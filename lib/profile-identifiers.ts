export function normalizeProfileIdentifier(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function profileIdentifierIsValid(value: string) {
  return (
    value.length >= 3 &&
    value.length <= 48 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

export function profileIdentifierSuggestions(value: string) {
  const base = normalizeProfileIdentifier(value) || "member";
  return [`${base}-creative`, `${base}-${new Date().getFullYear()}`, `${base}-${Math.random().toString(36).slice(2, 6)}`];
}
