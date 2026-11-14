import { getCurrentMember } from "@/lib/auth";
import { getEventPass } from "@/lib/event-pass";
import { getSiteUrl } from "@/lib/stripe";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember();
  const pass = await getEventPass((await params).id, member?.id, new URL(request.url).searchParams.get("token") ?? undefined);
  if (!pass?.valid) return new Response("A valid event pass is required.", { status: 404 });
  const text = (value: string) => value.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;").replaceAll("\r", "");
  const date = (value: Date) => value.toISOString().replaceAll(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Model Escape//Event pass//EN", "BEGIN:VEVENT", `UID:${pass.id}@modelescape`, `DTSTAMP:${date(new Date())}`, `DTSTART:${date(pass.startsAt)}`, ...(pass.endsAt ? [`DTEND:${date(pass.endsAt)}`] : []), `SUMMARY:${text(pass.title)}`, `LOCATION:${text([pass.venue, pass.location].filter(Boolean).join(", "))}`, `DESCRIPTION:${text(`Confirmation: ${pass.confirmationCode}\n${getSiteUrl()}/events/${pass.slug}`)}`, "END:VEVENT", "END:VCALENDAR"];
  const folded = lines.flatMap((line) => { const chunks: string[] = []; let segment = ""; for (const c of line) { if (Buffer.byteLength(segment + c) > 73) { chunks.push(segment); segment = " " + c; } else segment += c; } chunks.push(segment); return chunks; }).join("\r\n");
  return new Response(folded + "\r\n", { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": "attachment; filename=model-escape-event.ics", "cache-control": "private, no-store" } });
}
