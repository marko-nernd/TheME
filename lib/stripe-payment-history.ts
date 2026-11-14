import "server-only";
import type Stripe from "stripe";
import { pool } from "@/db";
import { getStripe } from "@/lib/stripe";

export type StripePaymentRecord = {
  id: string;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  number: string | null;
  description: string;
  amountPaid: number;
  currency: string;
  status: string;
  paidAt: Date;
  hasDocument: boolean;
};

export type AdminStripeBillingSummary = {
  configured: boolean;
  totalPaidCents: number;
  recentPayments: StripePaymentRecord[];
};

async function customerIdsForMember(memberId: string, email?: string) {
  const result = await pool.query<{ stripe_customer_id: string }>(
    `select stripe_customer_id
       from billing_customers
      where member_id = $1
         or ($2::text is not null and lower(email) = lower($2::text))`,
    [memberId, email ?? null],
  );
  return [...new Set(result.rows.map((row) => row.stripe_customer_id))];
}

function mapInvoice(invoice: Stripe.Invoice): StripePaymentRecord {
  return {
    id: invoice.id,
    customerId: typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? "",
    customerName: invoice.customer_name ?? null,
    customerEmail: invoice.customer_email ?? null,
    number: invoice.number ?? null,
    description: invoice.lines.data[0]?.description || "Model Escape membership",
    amountPaid: invoice.amount_paid,
    currency: invoice.currency,
    status: invoice.status ?? "paid",
    paidAt: new Date((invoice.status_transitions.paid_at ?? invoice.created) * 1000),
    hasDocument: Boolean(invoice.invoice_pdf),
  };
}

export async function getMemberStripePayments(memberId: string, email: string) {
  if (!process.env.STRIPE_SECRET_KEY) return [] as StripePaymentRecord[];
  try {
    const customerIds = await customerIdsForMember(memberId, email);
    const stripe = getStripe();
    const invoiceGroups = await Promise.all(customerIds.map((customer) =>
      stripe.invoices.list({ customer, status: "paid", limit: 10 }),
    ));
    return invoiceGroups
      .flatMap((group) => group.data.map(mapInvoice))
      .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())
      .slice(0, 10);
  } catch (error) {
    console.warn("Member Stripe payment history is unavailable.", error);
    return [];
  }
}

export async function getAdminStripeBillingSummary(): Promise<AdminStripeBillingSummary> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { configured: false, totalPaidCents: 0, recentPayments: [] };
  }
  const stripe = getStripe();
  let totalPaidCents = 0;
  const recentPayments: StripePaymentRecord[] = [];
  for await (const invoice of stripe.invoices.list({ status: "paid", limit: 100 })) {
    totalPaidCents += invoice.amount_paid;
    if (recentPayments.length < 10) recentPayments.push(mapInvoice(invoice));
  }
  return { configured: true, totalPaidCents, recentPayments };
}

export async function getVerifiedInvoiceDocument(memberId: string, email: string, invoiceId: string) {
  const customerIds = await customerIdsForMember(memberId, email);
  const invoice = await getStripe().invoices.retrieve(invoiceId);
  const invoiceCustomer = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!invoiceCustomer || !customerIds.includes(invoiceCustomer) || !invoice.invoice_pdf) return null;
  return invoice;
}
