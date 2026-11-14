"use client";

import Link from "next/link";

export type MemberEventTransaction = {
  id: string;
  eventTitle: string;
  eventSlug: string;
  pathType: string;
  accommodationType: string | null;
  accommodationPriceCents: number | null;
  grossCents: number;
  platformFeeCents: number;
  processingFeeCents: number;
  customerFeeCents: number;
  hostNetCents: number;
  currency: string;
  status: string;
  stripePaymentIntentId: string | null;
  confirmationCode: string;
  paidAt: string;
};

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default function MemberEventTransactions({
  transactions,
}: {
  transactions: MemberEventTransaction[];
}) {
  return (
    <section className="member-event-payment-history">
      <div className="section-heading">
        <div><p className="eyebrow"><span />Event payments</p><h2>Your event transactions.</h2></div>
        <p className="section-intro">Select a transaction to see the complete fee breakdown and open a printable Model Escape receipt.</p>
      </div>
      <div className="member-event-transaction-list">
        {transactions.length ? transactions.map((transaction) => (
          <details key={transaction.id}>
            <summary>
              <div>
                <strong>{transaction.eventTitle}</strong>
                <small>{transaction.pathType} participation · {date.format(new Date(transaction.paidAt))}</small>
              </div>
              <b>{money.format(transaction.grossCents / 100)}</b>
              <span className="payment-status-paid">{transaction.status}</span>
              <i aria-hidden="true">⌄</i>
            </summary>
            <div className="member-event-transaction-detail">
              <dl>
                <div><dt>Event participation price</dt><dd>{money.format(Math.max(0, transaction.hostNetCents - (transaction.accommodationPriceCents ?? 0)) / 100)}</dd></div>
                {(transaction.accommodationPriceCents ?? 0) > 0 && (
                  <div><dt>{transaction.accommodationType === "villa" ? "Villa accommodation" : transaction.accommodationType === "hotel" ? "Hotel accommodation" : "Accommodation"}</dt><dd>{money.format((transaction.accommodationPriceCents ?? 0) / 100)}</dd></div>
                )}
                <div><dt>Event and accommodation subtotal</dt><dd>{money.format(transaction.hostNetCents / 100)}</dd></div>
                <div className="transaction-fee-total"><dt>Service fee</dt><dd>{money.format(transaction.customerFeeCents / 100)}</dd></div>
                <div className="transaction-total"><dt>Total paid</dt><dd>{money.format(transaction.grossCents / 100)}</dd></div>
              </dl>
              <div className="member-event-transaction-meta">
                <span><strong>Confirmation number</strong>{transaction.confirmationCode}</span>
                <span><strong>Payment reference</strong>{transaction.stripePaymentIntentId ?? transaction.id}</span>
                <span><strong>Currency</strong>{transaction.currency.toUpperCase()}</span>
                <Link href={`/events/${transaction.eventSlug}`}>View event →</Link>
                <Link className="button" href={`/receipts/events/${transaction.id}`} target="_blank">Open receipt ↗</Link>
                <a href={`/api/event-transactions/${transaction.id}/invoice`} download>Download invoice PDF</a>
              </div>
            </div>
          </details>
        )) : <p className="dashboard-empty">You have no completed event payments yet.</p>}
      </div>
    </section>
  );
}
