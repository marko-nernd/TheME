import test from "node:test";
import assert from "node:assert/strict";
import { parseAccommodationOptions } from "../lib/accommodation-options.ts";
test("optional links stay attached to ordered accommodation descriptions", () => {
 const a = { description: "Models: Shared villa", bookingUrl: "https://booking.example/villa?room=2" };
 const b = { description: "Double: Queen beds", bookingUrl: "" };
 assert.deepEqual(parseAccommodationOptions([b,a]), { accommodationDetails: [b.description,a.description], accommodationLinks: ["",a.bookingUrl] });
 assert.deepEqual(parseAccommodationOptions([{ description: "", bookingUrl: "" }]), { accommodationDetails: [], accommodationLinks: [] });
});
test("booking links reject executable URLs, credentials and missing descriptions", () => {
 for (const bookingUrl of ["javascript:alert(1)","data:text/html,test","https://user:secret@booking.example/a"]) assert.throws(() => parseAccommodationOptions([{ description: "Villa", bookingUrl }]), /INVALID_ACCOMMODATION_OPTIONS/);
 assert.throws(() => parseAccommodationOptions([{description: "", bookingUrl: "https://booking.example"}]), /INVALID_ACCOMMODATION_OPTIONS/);
 assert.throws(() => parseAccommodationOptions(Array(31).fill({ description: "Villa", bookingUrl: "" })), /INVALID_ACCOMMODATION_OPTIONS/);
});
