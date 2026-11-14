import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { getVerifiedInvoiceDocument } from "@/lib/stripe-payment-history";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const member = await getCurrentMember();
  if (!member?.emailVerifiedAt) {
    return NextResponse.json({ error: "Sign in to download billing documents." }, { status: 401 });
  }
  try {
    const { invoiceId } = await params;
    const invoice = await getVerifiedInvoiceDocument(member.id, member.email, invoiceId);
    if (!invoice?.invoice_pdf) {
      return NextResponse.json({ error: "Billing document not found." }, { status: 404 });
    }
    const documentResponse = await fetch(invoice.invoice_pdf, { cache: "no-store" });
    if (!documentResponse.ok) {
      return NextResponse.json({ error: "Stripe could not provide this document." }, { status: 502 });
    }
    const type = new URL(request.url).searchParams.get("type") === "receipt" ? "receipt" : "invoice";
    const number = (invoice.number || invoice.id).replace(/[^a-zA-Z0-9_-]/g, "-");
    return new Response(await documentResponse.arrayBuffer(), {
      headers: {
        "content-type": documentResponse.headers.get("content-type") || "application/pdf",
        "content-disposition": `attachment; filename="model-escape-${type}-${number}.pdf"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Stripe billing document download failed.", error);
    return NextResponse.json({ error: "Billing document is temporarily unavailable." }, { status: 503 });
  }
}
