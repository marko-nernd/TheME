export const travelFieldDefinitions = [
  ["airportName", "Airport name", 200], ["airportCode", "Airport code (IATA)", 3],
  ["arrivalWindow", "Recommended arrival window (local time)", 300], ["timezone", "Local timezone (IANA)", 80],
  ["transferDetails", "Transfer details", 1200], ["pickupLocation", "Pickup location / meeting point", 500],
  ["hostContact", "Travel host contact (name, phone or email)", 500],
] as const;
export type EventTravelDetails = Partial<Record<typeof travelFieldDefinitions[number][0], string>>;
export function validTimezone(value: string) {
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return Boolean(value); } catch { return false; }
}
export function parseEventTravel(value: unknown): EventTravelDetails {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const result: EventTravelDetails = {};
  for (const [key, , max] of travelFieldDefinitions) {
    if (source[key] !== undefined && typeof source[key] !== "string") throw new Error("INVALID_TRAVEL");
    const text = String(source[key] ?? "").trim();
    if (text.length > max) throw new Error("INVALID_TRAVEL");
    result[key] = key === "airportCode" ? text.toUpperCase() : text;
  }
  if (result.airportCode && !/^[A-Z]{3}$/.test(result.airportCode)) throw new Error("INVALID_TRAVEL");
  if (result.timezone && !validTimezone(result.timezone)) throw new Error("INVALID_TRAVEL");
  return result;
}
export function travelFromForm(form: FormData) {
  return Object.fromEntries(travelFieldDefinitions.map(([key]) => [key, String(form.get(`travel_${key}`) ?? "")]));
}
export function hasTravelDetails(value?: EventTravelDetails | null) { return Boolean(value && Object.values(value).some((text) => text?.trim())); }
export function travelFingerprint(event: { travelDetails?: EventTravelDetails | null; airportInfo?: string | null; flightInstructions?: string | null }) {
  return JSON.stringify([parseEventTravel(event.travelDetails), event.airportInfo?.trim() ?? "", event.flightInstructions?.trim() ?? ""]);
}
