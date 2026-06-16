/**
 * Pure pricing math module.
 *
 * Every calculation lives here so it can be unit-tested without touching
 * the database or any framework code.  All monetary values are in USD
 * and represented as numbers (we round to 2 decimal places at the edges).
 */

// ── Term-length constants ──────────────────────────────────────────────

export const TERM_LENGTHS = ["monthly", "annual", "two_year"] as const;
export type TermLength = (typeof TERM_LENGTHS)[number];

export interface TermDetails {
  months: number;
  discountRate: number; // 0 – 1
  label: string;
}

const TERM_CONFIG: Record<TermLength, TermDetails> = {
  monthly: { months: 1, discountRate: 0, label: "Monthly" },
  annual: { months: 12, discountRate: 0.15, label: "Annual (12 months)" },
  two_year: { months: 24, discountRate: 0.25, label: "Two-year (24 months)" },
};

export function getTermDetails(term: TermLength): TermDetails {
  return TERM_CONFIG[term];
}

// ── Pricing-model types ────────────────────────────────────────────────

export const PRICING_MODELS = [
  "fixed_monthly",
  "per_seat",
  "percentage_of_product",
] as const;
export type PricingModel = (typeof PRICING_MODELS)[number];

export const AVAILABILITY_OPTIONS = [
  "included",
  "addon",
  "not_available",
] as const;
export type Availability = (typeof AVAILABILITY_OPTIONS)[number];

// ── Calculation helpers ────────────────────────────────────────────────

export interface BaseCostResult {
  amount: number;
  seats: number;
  basePricePerSeat: number;
  months: number;
  discountRate: number;
  termLabel: string;
}

/**
 * Computes the base product cost.
 *
 *   seats × basePricePerSeat × months × (1 − termDiscount)
 */
export function calculateBaseCost(
  basePricePerSeat: number,
  seats: number,
  termLength: TermLength
): BaseCostResult {
  const term = getTermDetails(termLength);
  const amount =
    seats * basePricePerSeat * term.months * (1 - term.discountRate);
  return {
    amount: roundCurrency(amount),
    seats,
    basePricePerSeat,
    months: term.months,
    discountRate: term.discountRate,
    termLabel: term.label,
  };
}

// ── Add-on cost ────────────────────────────────────────────────────────

export interface AddonInput {
  featureName: string;
  pricingModel: PricingModel;
  addonPrice: number; // the stored "value" (dollar amount or percentage)
  quantity: number; // seats for per_seat, 1 for others
}

export interface AddonCostResult {
  featureName: string;
  amount: number;
  calculationDescription: string;
  notes: string;
}

/**
 * Computes the cost of a single add-on over the full term.
 *
 * @param addon       Add-on configuration + user-chosen quantity
 * @param baseCost    The *discounted* base product cost (used for %-of-product)
 * @param months      Number of months in the term
 */
export function calculateAddonCost(
  addon: AddonInput,
  baseCost: number,
  months: number
): AddonCostResult {
  let amount: number;
  let calculationDescription: string;
  let notes: string;

  switch (addon.pricingModel) {
    case "fixed_monthly":
      amount = addon.addonPrice * months;
      calculationDescription = `$${formatNumber(addon.addonPrice)} per month × ${months} months`;
      notes = "Fixed monthly add-on price";
      break;

    case "per_seat":
      amount = addon.quantity * addon.addonPrice * months;
      calculationDescription = `${addon.quantity} seats × $${formatNumber(addon.addonPrice)} per seat per month × ${months} months`;
      notes =
        addon.quantity > 0
          ? "Per-seat add-on — seat count is independent of the product seat count"
          : "Per-seat add-on";
      break;

    case "percentage_of_product":
      amount = (addon.addonPrice / 100) * baseCost;
      calculationDescription = `${formatNumber(addon.addonPrice)}% of base product cost ($${formatNumber(baseCost)})`;
      notes = "Percentage of discounted base product cost";
      break;

    default: {
      const _exhaustive: never = addon.pricingModel;
      throw new Error(`Unknown pricing model: ${_exhaustive}`);
    }
  }

  return {
    featureName: addon.featureName,
    amount: roundCurrency(amount),
    calculationDescription,
    notes,
  };
}

// ── Full quote calculation ─────────────────────────────────────────────

export interface QuoteLineItem {
  label: string;
  calculationDescription: string;
  notes: string;
  amount: number;
  sortOrder: number;
}

export interface QuoteCalculationInput {
  productName: string;
  tierName: string;
  basePricePerSeat: number;
  seats: number;
  termLength: TermLength;
  addons: AddonInput[];
  discountPercentage: number; // 0–100
}

export interface QuoteCalculationResult {
  lineItems: QuoteLineItem[];
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  total: number;
  baseCost: BaseCostResult;
}

/**
 * Master calculation — produces all line items, subtotal, discount, and total.
 */
export function calculateQuoteTotal(
  input: QuoteCalculationInput
): QuoteCalculationResult {
  const { productName, tierName, basePricePerSeat, seats, termLength, addons, discountPercentage } =
    input;

  // 1. Base cost
  const baseCost = calculateBaseCost(basePricePerSeat, seats, termLength);
  const term = getTermDetails(termLength);

  const lineItems: QuoteLineItem[] = [];
  let sortOrder = 0;

  // Base product line
  const baseDiscountNote =
    term.discountRate > 0
      ? ` × (1 − ${(term.discountRate * 100).toFixed(0)}% ${term.label.split(" ")[0].toLowerCase()} discount)`
      : "";

  lineItems.push({
    label: `${productName} — ${tierName} tier`,
    calculationDescription: `${seats} seats × $${formatNumber(basePricePerSeat)} per seat per month × ${term.months} months${baseDiscountNote}`,
    notes: "Base product cost",
    amount: baseCost.amount,
    sortOrder: sortOrder++,
  });

  // 2. Add-on costs
  for (const addon of addons) {
    const addonResult = calculateAddonCost(addon, baseCost.amount, term.months);
    lineItems.push({
      label: `Add-on: ${addonResult.featureName}`,
      calculationDescription: addonResult.calculationDescription,
      notes: addonResult.notes,
      amount: addonResult.amount,
      sortOrder: sortOrder++,
    });
  }

  // 3. Subtotal
  const subtotal = roundCurrency(
    lineItems.reduce((sum, li) => sum + li.amount, 0)
  );

  // 4. Quote-level discount
  const clampedDiscount = Math.max(0, Math.min(100, discountPercentage));
  const discountAmount = roundCurrency(subtotal * (clampedDiscount / 100));
  const total = roundCurrency(subtotal - discountAmount);

  return {
    lineItems,
    subtotal,
    discountPercentage: clampedDiscount,
    discountAmount,
    total,
    baseCost,
  };
}

// ── Utility ────────────────────────────────────────────────────────────

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
