"use server";

import { db } from "@/lib/db";
import {
  quotes,
  quoteLineItems,
  quoteAddons,
  tiers,
  features,
  featureTierConfigs,
  products,
  type Quote,
  type QuoteLineItem,
  type QuoteAddon,
} from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  calculateQuoteTotal,
  type AddonInput,
  type TermLength,
} from "@/lib/pricing";

// ── Types ──────────────────────────────────────────────────────────────

export interface QuoteWithDetails extends Quote {
  lineItems: QuoteLineItem[];
  addons: QuoteAddon[];
}

export interface CreateQuoteInput {
  name: string;
  customerName: string;
  productId: string;
  tierId: string;
  seats: number;
  termLength: TermLength;
  discountPercentage: number;
  selectedAddons: {
    featureTierConfigId: string;
    quantity: number;
  }[];
}

// ── Queries ────────────────────────────────────────────────────────────

export async function getQuotes(): Promise<QuoteWithDetails[]> {
  const allQuotes = await db
    .select()
    .from(quotes)
    .orderBy(desc(quotes.createdAt));

  const result: QuoteWithDetails[] = [];

  for (const quote of allQuotes) {
    const lineItems = await db
      .select()
      .from(quoteLineItems)
      .where(eq(quoteLineItems.quoteId, quote.id))
      .orderBy(asc(quoteLineItems.sortOrder));

    const addons = await db
      .select()
      .from(quoteAddons)
      .where(eq(quoteAddons.quoteId, quote.id));

    result.push({ ...quote, lineItems, addons });
  }

  return result;
}

export async function getQuote(id: string): Promise<QuoteWithDetails | null> {
  const [quote] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, id));

  if (!quote) return null;

  const lineItems = await db
    .select()
    .from(quoteLineItems)
    .where(eq(quoteLineItems.quoteId, id))
    .orderBy(asc(quoteLineItems.sortOrder));

  const addons = await db
    .select()
    .from(quoteAddons)
    .where(eq(quoteAddons.quoteId, id));

  return { ...quote, lineItems, addons };
}

// ── Create quote ───────────────────────────────────────────────────────

export async function createQuote(input: CreateQuoteInput): Promise<string> {
  // 1. Fetch product & tier details
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, input.productId));

  if (!product) throw new Error("Product not found");

  const [tier] = await db
    .select()
    .from(tiers)
    .where(eq(tiers.id, input.tierId));

  if (!tier) throw new Error("Tier not found");

  // 2. Fetch add-on details
  const addonInputs: (AddonInput & { configId: string; quantity: number })[] = [];

  for (const selected of input.selectedAddons) {
    const [config] = await db
      .select()
      .from(featureTierConfigs)
      .where(eq(featureTierConfigs.id, selected.featureTierConfigId));

    if (!config || config.availability !== "addon") continue;

    const [feature] = await db
      .select()
      .from(features)
      .where(eq(features.id, config.featureId));

    if (!feature) continue;

    addonInputs.push({
      configId: config.id,
      featureName: feature.name,
      pricingModel: config.pricingModel!,
      addonPrice: parseFloat(config.addonPrice ?? "0"),
      quantity: selected.quantity,
    });
  }

  // 3. Calculate pricing
  const calculation = calculateQuoteTotal({
    productName: product.name,
    tierName: tier.name,
    basePricePerSeat: parseFloat(tier.basePricePerSeat),
    seats: input.seats,
    termLength: input.termLength,
    addons: addonInputs,
    discountPercentage: input.discountPercentage,
  });

  // 4. Insert quote
  const [quote] = await db
    .insert(quotes)
    .values({
      name: input.name,
      customerName: input.customerName,
      productId: input.productId,
      tierId: input.tierId,
      productName: product.name,
      tierName: tier.name,
      basePricePerSeat: tier.basePricePerSeat,
      seats: input.seats,
      termLength: input.termLength,
      discountPercentage: input.discountPercentage.toString(),
      subtotal: calculation.subtotal.toString(),
      discountAmount: calculation.discountAmount.toString(),
      totalAmount: calculation.total.toString(),
    })
    .returning({ id: quotes.id });

  // 5. Insert line items
  if (calculation.lineItems.length > 0) {
    await db.insert(quoteLineItems).values(
      calculation.lineItems.map((li) => ({
        quoteId: quote.id,
        label: li.label,
        calculationDescription: li.calculationDescription,
        notes: li.notes,
        amount: li.amount.toString(),
        sortOrder: li.sortOrder,
      }))
    );
  }

  // 6. Insert addon records
  for (const addon of addonInputs) {
    await db.insert(quoteAddons).values({
      quoteId: quote.id,
      featureTierConfigId: addon.configId,
      featureName: addon.featureName,
      pricingModel: addon.pricingModel,
      addonPrice: addon.addonPrice.toString(),
      quantity: addon.quantity,
    });
  }

  revalidatePath("/quotes");
  return quote.id;
}
