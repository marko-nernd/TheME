export const eventPlatformFeeRate = 0.02;
export const eventPlatformFixedFeeCents = 0;

export function eventPlatformFeeCents(grossCents: number) {
  if (!Number.isInteger(grossCents) || grossCents <= 0) return 0;
  return Math.min(
    grossCents,
    Math.round(grossCents * eventPlatformFeeRate) + eventPlatformFixedFeeCents,
  );
}

function configuredRate() {
  const value = Number(process.env.EVENT_PROCESSING_FEE_RATE ?? "0.029");
  return Number.isFinite(value) && value >= 0 && value < 0.2 ? value : 0.029;
}

function configuredFixedFeeCents() {
  const value = Number(process.env.EVENT_PROCESSING_FIXED_FEE_CENTS ?? "30");
  return Number.isInteger(value) && value >= 0 && value <= 1000 ? value : 30;
}

export function eventCustomerCheckoutCents(baseAmountCents: number) {
  if (!Number.isInteger(baseAmountCents) || baseAmountCents <= 0) {
    return {
      baseAmountCents: 0,
      platformFeeCents: 0,
      processingFeeCents: 0,
      customerFeeCents: 0,
      totalCents: 0,
    };
  }
  const platformFeeCents = eventPlatformFeeCents(baseAmountCents);
  const rate = configuredRate();
  const fixedFeeCents = configuredFixedFeeCents();
  // Gross up the customer total so the disclosed booking fee covers the
  // configured processor estimate as well as the Model Escape platform fee.
  const totalCents = Math.ceil(
    (baseAmountCents + platformFeeCents + fixedFeeCents) / (1 - rate),
  );
  const customerFeeCents = totalCents - baseAmountCents;
  const processingFeeCents = customerFeeCents - platformFeeCents;
  return {
    baseAmountCents,
    platformFeeCents,
    processingFeeCents,
    customerFeeCents,
    totalCents,
  };
}
