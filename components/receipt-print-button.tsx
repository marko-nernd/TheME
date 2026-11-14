"use client";

export default function ReceiptPrintButton() {
  return <button className="button receipt-print-button" type="button" onClick={() => window.print()}>Print or save PDF</button>;
}
