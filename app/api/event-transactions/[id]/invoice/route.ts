import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { getMemberEventTransactionReceipt } from "@/db/queries";
import { createTextPdf } from "@/lib/simple-pdf";
import QRCode from "qrcode";
import { eventCheckInPayload } from "@/lib/confirmation-code";
import { securePassPayload } from "@/lib/event-pass";

export const runtime = "nodejs";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) {
    return NextResponse.json({ error: "Sign in to download this invoice." }, { status: 401 });
  }
  const { id } = await params;
  const invoice = await getMemberEventTransactionReceipt(id, member.id);
  if (!invoice) {
    return NextResponse.json({ error: "Event transaction not found." }, { status: 404 });
  }

  const accommodationCents = invoice.accommodationPriceCents ?? 0;
  const eventPriceCents = Math.max(0, invoice.hostNetCents - accommodationCents);
  const accommodationLabel = invoice.accommodationType === "villa" ? "Villa accommodation" : "Hotel accommodation";
  const qr = QRCode.create(invoice.participationId && invoice.checkInToken ? securePassPayload(invoice.participationId, invoice.checkInToken) : eventCheckInPayload(invoice.eventSlug, invoice.confirmationCode), { errorCorrectionLevel: "M" });
  const pdf = createTextPdf([
    { text: "MODEL ESCAPE", size: 13, gap: 24 },
    { text: "EVENT PAYMENT INVOICE", size: 22, gap: 34 },
    { text: `Invoice: ${invoice.id}` },
    { text: `Status: ${invoice.status.toUpperCase()}` },
    { text: `Confirmation: ${invoice.confirmationCode}`, size: 15 },
    { text: `Paid: ${invoice.paidAt.toLocaleString("en-US")}`, gap: 28 },
    { text: `Event: ${invoice.eventTitle}`, size: 16, gap: 25 },
    { text: `Event date: ${invoice.eventStartsAt.toLocaleString("en-US")}` },
    { text: `Location: ${invoice.eventLocation}` },
    { text: `Participation: ${invoice.pathType ?? "Event"}`, gap: 28 },
    { text: `Event participation price: ${money.format(eventPriceCents / 100)}` },
    ...(accommodationCents > 0 ? [{ text: `${accommodationLabel}: ${money.format(accommodationCents / 100)}` }] : []),
    { text: `Event and accommodation subtotal: ${money.format(invoice.hostNetCents / 100)}` },
    { text: `Service fee: ${money.format(invoice.customerFeeCents / 100)}` },
    { text: `TOTAL PAID: ${money.format(invoice.grossCents / 100)}`, size: 15, gap: 30 },
    { text: `Paid by: ${invoice.payerName ?? member.name} (${invoice.payerEmail ?? member.email})` },
    { text: `Event host: ${invoice.hostName ?? "Model Escape event host"}` },
    { text: `Stripe payment reference: ${invoice.stripePaymentIntentId ?? "Recorded local transaction"}` },
  ], { size: qr.modules.size, data: qr.modules.data });
  const safeId = invoice.id.replace(/[^a-zA-Z0-9_-]/g, "-");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="model-escape-event-invoice-${safeId}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
