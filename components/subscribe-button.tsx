"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MembershipPlanKey } from "@/lib/membership-plans";

export default function SubscribeButton({
  plan,
  annualDiscount,
}: {
  plan: MembershipPlanKey;
  annualDiscount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"month" | "year" | null>(null);

  function startCheckout(billingInterval: "month" | "year") {
    setLoading(billingInterval);
    router.push(`/checkout?plan=${encodeURIComponent(plan)}&interval=${billingInterval}`);
  }

  return (
    <div className="subscription-form">
      <button className="button" type="button" disabled={Boolean(loading)} onClick={() => startCheckout("month")}>
        {loading === "month" ? "Opening…" : "Pay monthly ↗"}
      </button>
      <button className="annual-checkout" type="button" disabled={Boolean(loading)} onClick={() => startCheckout("year")}>
        {loading === "year" ? "Opening…" : `Pay annually · save ${annualDiscount}%`}
      </button>
    </div>
  );
}
