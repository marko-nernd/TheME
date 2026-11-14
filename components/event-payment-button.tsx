import Link from "next/link";

export default function EventPaymentButton({
  participationId,
}: {
  participationId: string;
}) {
  return (
    <div className="event-payment-action">
      <Link className="button" href={`/checkout/event/${participationId}`}>
        Pay securely on-site ↗
      </Link>
    </div>
  );
}
