export type AccommodationOption = { description: string; bookingUrl: string };
export function parseAccommodationOptions(input: unknown): { accommodationDetails: string[]; accommodationLinks: string[] } {
 if (!Array.isArray(input) || input.length > 30) throw new Error("INVALID_ACCOMMODATION_OPTIONS");
 const options: AccommodationOption[] = [];
 for (const value of input) {
  if (!value || typeof value !== "object" || typeof value.description !== "string" || typeof value.bookingUrl !== "string") throw new Error("INVALID_ACCOMMODATION_OPTIONS");
  const description = value.description.trim(); let bookingUrl = value.bookingUrl.trim();
  if (!description && !bookingUrl) continue;
  if (!description || description.length > 1000 || bookingUrl.length > 2048) throw new Error("INVALID_ACCOMMODATION_OPTIONS");
  if (bookingUrl) {
   try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(bookingUrl) ? bookingUrl : `https://${bookingUrl}`);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || !url.hostname.includes(".")) throw new Error();
    bookingUrl = url.toString();
   } catch { throw new Error("INVALID_ACCOMMODATION_OPTIONS"); }
  }
  options.push({ description, bookingUrl });
 }
 return { accommodationDetails: options.map((item) => item.description), accommodationLinks: options.map((item) => item.bookingUrl) };
}
