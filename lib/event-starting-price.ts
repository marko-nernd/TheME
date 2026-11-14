type PricedEvent = { priceCents: number; participationPaths: ReadonlyArray<{ type: string; enabled: boolean; priceCents: number }> };
export function eventStartingPriceCents(event: PricedEvent): number | null {
  if (!event.participationPaths.length) return event.priceCents;
  const prices = event.participationPaths.filter((path) => path.enabled && ["model", "photographer", "attendee"].includes(path.type)).map((path) => path.priceCents);
  return prices.length ? Math.min(...prices) : null;
}
export function eventStartingPriceLabel(event: PricedEvent): string {
  const price = eventStartingPriceCents(event);
  return price === null ? "Application only" : price === 0 ? "Free" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(price / 100);
}
