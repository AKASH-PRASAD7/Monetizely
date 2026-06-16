import {
  pgTable,
  uuid,
  text,
  decimal,
  integer,
  timestamp,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────────────────────

export const availabilityEnum = pgEnum("availability", [
  "included",
  "addon",
  "not_available",
]);

export const pricingModelEnum = pgEnum("pricing_model", [
  "fixed_monthly",
  "per_seat",
  "percentage_of_product",
]);

export const termLengthEnum = pgEnum("term_length", [
  "monthly",
  "annual",
  "two_year",
]);

// ── Products ───────────────────────────────────────────────────────────

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Tiers ──────────────────────────────────────────────────────────────

export const tiers = pgTable("tiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  basePricePerSeat: decimal("base_price_per_seat", {
    precision: 12,
    scale: 2,
  }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ── Features ───────────────────────────────────────────────────────────

export const features = pgTable("features", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ── Feature ↔ Tier configuration (the matrix) ─────────────────────────

export const featureTierConfigs = pgTable(
  "feature_tier_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    featureId: uuid("feature_id")
      .notNull()
      .references(() => features.id, { onDelete: "cascade" }),
    tierId: uuid("tier_id")
      .notNull()
      .references(() => tiers.id, { onDelete: "cascade" }),
    availability: availabilityEnum("availability").notNull().default("not_available"),
    pricingModel: pricingModelEnum("pricing_model"),
    addonPrice: decimal("addon_price", { precision: 12, scale: 2 }),
  },
  (table) => [
    uniqueIndex("feature_tier_unique").on(table.featureId, table.tierId),
  ]
);

// ── Quotes ─────────────────────────────────────────────────────────────

export const quotes = pgTable("quotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  customerName: text("customer_name").notNull(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  tierId: uuid("tier_id")
    .notNull()
    .references(() => tiers.id),
  productName: text("product_name").notNull(),
  tierName: text("tier_name").notNull(),
  basePricePerSeat: decimal("base_price_per_seat", {
    precision: 12,
    scale: 2,
  }).notNull(),
  seats: integer("seats").notNull(),
  termLength: termLengthEnum("term_length").notNull(),
  discountPercentage: decimal("discount_percentage", {
    precision: 5,
    scale: 2,
  })
    .notNull()
    .default("0"),
  subtotal: decimal("subtotal", { precision: 14, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", {
    precision: 14,
    scale: 2,
  }).notNull(),
  totalAmount: decimal("total_amount", { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Quote line items ───────────────────────────────────────────────────

export const quoteLineItems = pgTable("quote_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  quoteId: uuid("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  calculationDescription: text("calculation_description").notNull(),
  notes: text("notes").notNull().default(""),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ── Quote add-ons (for reference) ──────────────────────────────────────

export const quoteAddons = pgTable("quote_addons", {
  id: uuid("id").primaryKey().defaultRandom(),
  quoteId: uuid("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  featureTierConfigId: uuid("feature_tier_config_id")
    .notNull()
    .references(() => featureTierConfigs.id),
  featureName: text("feature_name").notNull(),
  pricingModel: pricingModelEnum("pricing_model").notNull(),
  addonPrice: decimal("addon_price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
});

// ── Type exports ───────────────────────────────────────────────────────

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type Tier = typeof tiers.$inferSelect;
export type NewTier = typeof tiers.$inferInsert;

export type Feature = typeof features.$inferSelect;
export type NewFeature = typeof features.$inferInsert;

export type FeatureTierConfig = typeof featureTierConfigs.$inferSelect;
export type NewFeatureTierConfig = typeof featureTierConfigs.$inferInsert;

export type Quote = typeof quotes.$inferSelect;
export type NewQuote = typeof quotes.$inferInsert;

export type QuoteLineItem = typeof quoteLineItems.$inferSelect;
export type NewQuoteLineItem = typeof quoteLineItems.$inferInsert;

export type QuoteAddon = typeof quoteAddons.$inferSelect;
export type NewQuoteAddon = typeof quoteAddons.$inferInsert;
