import { createHash } from "node:crypto";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function eventConfirmationCode(source: string) {
  const digest = createHash("sha256").update(`model-escape:${source}`).digest();
  return Array.from({ length: 6 }, (_, index) => alphabet[digest[index] % alphabet.length]).join("");
}

export function eventCheckInPayload(eventSlug: string, confirmationCode: string) {
  return `MODEL_ESCAPE|EVENT:${eventSlug}|CONFIRMATION:${confirmationCode}`;
}
