import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ReceiptPrintButton from "@/components/receipt-print-button";
import { getMemberEventTransactionReceipt } from "@/db/queries";
import { getCurrentMember } from "@/lib/auth";
import QRCode from "qrcode";
import { eventCheckInPayload } from "@/lib/confirmation-code";
import { securePassPayload } from "@/lib/event-pass";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default async function EventReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const member = await getCurrentMember();
  const { id } = await params;
  if (!member?.emailVerifiedAt) {
    redirect(`/login?next=${encodeURIComponent(`/receipts/events/${id}`)}`);
  }
  const receipt = await getMemberEventTransactionReceipt(id, member.id);
  if (!receipt) notFound();
  const accommodationPriceCents = receipt.accommodationPriceCents ?? 0;
  const eventPriceCents = Math.max(0, receipt.hostNetCents - accommodationPriceCents);
  const accommodationLabel = receipt.accommodationType === "villa"
    ? "Villa accommodation"
    : receipt.accommodationType === "hotel"
      ? "Hotel accommodation"
      : "Accommodation";
  const qrDataUrl = await QRCode.toDataURL(receipt.participationId && receipt.checkInToken ? securePassPayload(receipt.participationId, receipt.checkInToken) : eventCheckInPayload(receipt.eventSlug, receipt.confirmationCode), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
    color: { dark: "#171715", light: "#ffffff" },
  });

  return (
    <main className="event-receipt-page">
      <section className="event-receipt">
        <header>
          <div><span>MODEL ESCAPE</span><strong>Payment receipt</strong></div>
          <ReceiptPrintButton />
        </header>
        <div className="event-receipt-status">
          <span>{receipt.status.replaceAll("_", " ").toUpperCase()}</span>
          <strong>{money.format(receipt.grossCents / 100)}</strong>
          <small>{receipt.paidAt.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}</small>
        </div>
        <section>
          <h1>{receipt.eventTitle}</h1>
          <p>{receipt.pathType ?? "Event"} participation · {receipt.eventStartsAt.toLocaleDateString("en-US", { dateStyle: "long" })}</p>
          <p>{receipt.eventLocation}</p>
        </section>
        <section className="event-receipt-confirmation">
          {receipt.participationId && <Link href={`/passes/${receipt.participationId}`}>Open current event pass →</Link>}
          <div><span>BOOKING CONFIRMATION</span><strong>{receipt.confirmationCode}</strong><small>Open your current event pass for entry. A receipt does not override a canceled or refunded booking.</small></div>
          {/* Generated from the transaction confirmation; no personal information is encoded. */}
          {receipt.status === "paid" && <img src={qrDataUrl} width="160" height="160" alt={`Check-in QR code for confirmation ${receipt.confirmationCode}`} />}
        </section>
        <dl className="event-receipt-breakdown">
          <div><dt>Event participation price</dt><dd>{money.format(eventPriceCents / 100)}</dd></div>
          {accommodationPriceCents > 0 && (
            <div><dt>{accommodationLabel}</dt><dd>{money.format(accommodationPriceCents / 100)}</dd></div>
          )}
          <div className="receipt-event-subtotal"><dt>Event and accommodation subtotal</dt><dd>{money.format(receipt.hostNetCents / 100)}</dd></div>
          <div className="receipt-fee-total"><dt>Service fee</dt><dd>{money.format(receipt.customerFeeCents / 100)}</dd></div>
          <div><dt>Total paid</dt><dd>{money.format(receipt.grossCents / 100)}</dd></div>
        </dl>
        <div className="event-receipt-parties">
          <div><span>Paid by</span><strong>{receipt.payerName ?? member.name}</strong><small>{receipt.payerEmail ?? member.email}</small></div>
          <div><span>Event host</span><strong>{receipt.hostName ?? "Model Escape event host"}</strong><small>Host proceeds: {money.format(receipt.hostNetCents / 100)}</small></div>
        </div>
        <footer>
          <span>Receipt ID</span>
          <strong>{receipt.id}</strong>
          <span>Stripe payment reference</span>
          <strong>{receipt.stripePaymentIntentId ?? "Recorded local transaction"}</strong>
          <Link href="/dashboard#billing">← Return to billing</Link>
        </footer>
      </section>
    </main>
  );
}
