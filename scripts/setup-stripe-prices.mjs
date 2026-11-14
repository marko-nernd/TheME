import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey?.startsWith("sk_test_")) {
  throw new Error("STRIPE_SECRET_KEY must be a Stripe test-mode secret key.");
}

const stripe = new Stripe(secretKey);
const plans = [
  ["creator", "Creator", 800],
  ["silver", "Silver", 1900],
  ["gold", "Gold", 3900],
  ["platinum", "Platinum", 6900],
  ["diamond", "Diamond", 12900],
  ["promoter_launch", "Host Launch", 2500],
  ["promoter_growth", "Host Growth", 5000],
  ["promoter_pro", "Host Pro", 9900],
  ["promoter_agency", "Host Agency", 19900],
  ["sponsor_silver", "Sponsor Silver", 4900],
  ["sponsor_gold", "Sponsor Gold", 9900],
  ["sponsor_platinum", "Sponsor Platinum", 24900],
  ["sponsor_diamond", "Sponsor Diamond", 49900],
];

function lookupKey(plan, interval) {
  return `model_escape_${plan}_${interval === "year" ? "annual" : "monthly"}`;
}

function annualDiscountForPlan(plan) {
  if (plan === "gold" || plan === "sponsor_gold") return 0.1;
  if (plan === "platinum" || plan === "sponsor_platinum") return 0.12;
  if (plan === "diamond" || plan === "sponsor_diamond") return 0.15;
  return 0.08;
}

for (const [key, name, monthlyCents] of plans) {
  const products = await stripe.products.search({
    query: `metadata["model_escape_plan"]:"${key}"`,
    limit: 1,
  });
  const product =
    products.data[0] ??
    (await stripe.products.create(
      {
        name: `Model Escape ${name}`,
        metadata: { model_escape_plan: key },
      },
      { idempotencyKey: `model-escape-product-${key}` },
    ));

  const annualDiscount = annualDiscountForPlan(key);
  const intervals = [
    ["month", monthlyCents],
    ["year", Math.round(monthlyCents * 12 * (1 - annualDiscount))],
  ];
  for (const [interval, unitAmount] of intervals) {
    const lookup = lookupKey(key, interval);
    const existing = await stripe.prices.list({
      lookup_keys: [lookup],
      active: true,
      limit: 1,
    });
    if (!existing.data.length || existing.data[0].unit_amount !== unitAmount) {
      await stripe.prices.create(
        {
          product: product.id,
          currency: "usd",
          unit_amount: unitAmount,
          recurring: { interval },
          lookup_key: lookup,
          transfer_lookup_key: true,
          metadata: {
            model_escape_plan: key,
            billing_interval: interval,
            annual_discount: interval === "year" ? String(Math.round(annualDiscount * 100)) : "0",
          },
        },
        { idempotencyKey: `model-escape-price-${lookup}-${unitAmount}` },
      );
    }
  }
}

console.log(`Stripe test catalog ready: ${plans.length} plans, monthly and annual.`);
