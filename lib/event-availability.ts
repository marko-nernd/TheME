export function shouldRevealRemainingSpots(capacity: number, remaining: number) {
  if (!Number.isFinite(capacity) || capacity <= 0) return false;
  if (!Number.isFinite(remaining) || remaining < 0) return false;
  return remaining / capacity < 0.1;
}

export function publicAvailabilityLabel(capacity: number, remaining: number) {
  if (remaining <= 0) return "Sold out";
  return shouldRevealRemainingSpots(capacity, remaining)
    ? `${remaining} ${remaining === 1 ? "spot" : "spots"} left`
    : "Registration open";
}
