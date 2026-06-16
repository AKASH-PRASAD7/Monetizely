"use server";

import { db } from "@/lib/db";
import {
  products,
  tiers,
  features,
  featureTierConfigs,
  type Product,
  type Tier,
  type Feature,
  type FeatureTierConfig,
} from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ── Types ──────────────────────────────────────────────────────────────

export interface TierInput {
  id?: string;
  name: string;
  basePricePerSeat: number;
  sortOrder: number;
}

export interface FeatureInput {
  id?: string;
  name: string;
  sortOrder: number;
}

export interface FeatureTierConfigInput {
  featureId: string;
  tierId: string;
  availability: "included" | "addon" | "not_available";
  pricingModel?: "fixed_monthly" | "per_seat" | "percentage_of_product" | null;
  addonPrice?: number | null;
}

export interface ProductWithDetails extends Product {
  tiers: Tier[];
  features: Feature[];
  featureTierConfigs: FeatureTierConfig[];
}

// ── Queries ────────────────────────────────────────────────────────────

export async function getProducts(): Promise<ProductWithDetails[]> {
  const allProducts = await db
    .select()
    .from(products)
    .orderBy(asc(products.createdAt));

  const result: ProductWithDetails[] = [];

  for (const product of allProducts) {
    const productTiers = await db
      .select()
      .from(tiers)
      .where(eq(tiers.productId, product.id))
      .orderBy(asc(tiers.sortOrder));

    const productFeatures = await db
      .select()
      .from(features)
      .where(eq(features.productId, product.id))
      .orderBy(asc(features.sortOrder));

    const configs = await db
      .select()
      .from(featureTierConfigs)
      .where(
        eq(featureTierConfigs.featureId, productFeatures[0]?.id ?? "00000000-0000-0000-0000-000000000000")
      );

    // Get all configs for this product's features
    const allConfigs: FeatureTierConfig[] = [];
    for (const feature of productFeatures) {
      const featureConfigs = await db
        .select()
        .from(featureTierConfigs)
        .where(eq(featureTierConfigs.featureId, feature.id));
      allConfigs.push(...featureConfigs);
    }

    result.push({
      ...product,
      tiers: productTiers,
      features: productFeatures,
      featureTierConfigs: allConfigs,
    });
  }

  return result;
}

export async function getProduct(id: string): Promise<ProductWithDetails | null> {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, id));

  if (!product) return null;

  const productTiers = await db
    .select()
    .from(tiers)
    .where(eq(tiers.productId, id))
    .orderBy(asc(tiers.sortOrder));

  const productFeatures = await db
    .select()
    .from(features)
    .where(eq(features.productId, id))
    .orderBy(asc(features.sortOrder));

  const allConfigs: FeatureTierConfig[] = [];
  for (const feature of productFeatures) {
    const featureConfigs = await db
      .select()
      .from(featureTierConfigs)
      .where(eq(featureTierConfigs.featureId, feature.id));
    allConfigs.push(...featureConfigs);
  }

  return {
    ...product,
    tiers: productTiers,
    features: productFeatures,
    featureTierConfigs: allConfigs,
  };
}

// ── Mutations ──────────────────────────────────────────────────────────

export async function createProduct(
  name: string,
  tierInputs: TierInput[]
): Promise<string> {
  // Create product
  const [product] = await db
    .insert(products)
    .values({ name })
    .returning({ id: products.id });

  // Create tiers
  if (tierInputs.length > 0) {
    await db.insert(tiers).values(
      tierInputs.map((t) => ({
        productId: product.id,
        name: t.name,
        basePricePerSeat: t.basePricePerSeat.toString(),
        sortOrder: t.sortOrder,
      }))
    );
  }

  revalidatePath("/catalog");
  return product.id;
}

export async function updateProduct(
  id: string,
  name: string
): Promise<void> {
  await db
    .update(products)
    .set({ name, updatedAt: new Date() })
    .where(eq(products.id, id));

  revalidatePath("/catalog");
  revalidatePath(`/catalog/${id}`);
}

export async function saveTiers(
  productId: string,
  tierInputs: TierInput[]
): Promise<void> {
  // Delete existing tiers that are not in the input
  const existingTiers = await db
    .select()
    .from(tiers)
    .where(eq(tiers.productId, productId));

  const inputIds = tierInputs.filter((t) => t.id).map((t) => t.id);

  for (const existing of existingTiers) {
    if (!inputIds.includes(existing.id)) {
      await db.delete(tiers).where(eq(tiers.id, existing.id));
    }
  }

  // Upsert tiers
  for (const tierInput of tierInputs) {
    if (tierInput.id) {
      await db
        .update(tiers)
        .set({
          name: tierInput.name,
          basePricePerSeat: tierInput.basePricePerSeat.toString(),
          sortOrder: tierInput.sortOrder,
        })
        .where(eq(tiers.id, tierInput.id));
    } else {
      await db.insert(tiers).values({
        productId,
        name: tierInput.name,
        basePricePerSeat: tierInput.basePricePerSeat.toString(),
        sortOrder: tierInput.sortOrder,
      });
    }
  }

  revalidatePath("/catalog");
  revalidatePath(`/catalog/${productId}`);
}

export async function addFeature(
  productId: string,
  name: string
): Promise<string> {
  // Get current max sort order
  const existingFeatures = await db
    .select()
    .from(features)
    .where(eq(features.productId, productId));

  const maxOrder = existingFeatures.reduce(
    (max, f) => Math.max(max, f.sortOrder),
    -1
  );

  const [feature] = await db
    .insert(features)
    .values({
      productId,
      name,
      sortOrder: maxOrder + 1,
    })
    .returning({ id: features.id });

  // Create default configs (not_available) for all tiers
  const productTiers = await db
    .select()
    .from(tiers)
    .where(eq(tiers.productId, productId));

  if (productTiers.length > 0) {
    await db.insert(featureTierConfigs).values(
      productTiers.map((tier) => ({
        featureId: feature.id,
        tierId: tier.id,
        availability: "not_available" as const,
      }))
    );
  }

  revalidatePath(`/catalog/${productId}`);
  return feature.id;
}

export async function deleteFeature(featureId: string, productId: string): Promise<void> {
  await db.delete(featureTierConfigs).where(eq(featureTierConfigs.featureId, featureId));
  await db.delete(features).where(eq(features.id, featureId));

  revalidatePath(`/catalog/${productId}`);
}

export async function saveFeatureMatrix(
  productId: string,
  configs: FeatureTierConfigInput[]
): Promise<void> {
  for (const config of configs) {
    // Try to find existing config
    const existing = await db
      .select()
      .from(featureTierConfigs)
      .where(eq(featureTierConfigs.featureId, config.featureId))
      .then((rows) => rows.find((r) => r.tierId === config.tierId));

    const values = {
      featureId: config.featureId,
      tierId: config.tierId,
      availability: config.availability,
      pricingModel:
        config.availability === "addon" ? config.pricingModel ?? null : null,
      addonPrice:
        config.availability === "addon" && config.addonPrice != null
          ? config.addonPrice.toString()
          : null,
    };

    if (existing) {
      await db
        .update(featureTierConfigs)
        .set(values)
        .where(eq(featureTierConfigs.id, existing.id));
    } else {
      await db.insert(featureTierConfigs).values(values);
    }
  }

  revalidatePath(`/catalog/${productId}`);
}
