import { describe, it, expect } from "vitest";
import {
  calculateBaseCost,
  calculateAddonCost,
  calculateQuoteTotal,
  type AddonInput,
} from "@/lib/pricing";

describe("Pricing Math", () => {
  describe("calculateBaseCost", () => {
    it("calculates monthly correctly (no discount)", () => {
      const result = calculateBaseCost(50, 10, "monthly");
      expect(result.amount).toBe(500); // 10 * 50 * 1
      expect(result.discountRate).toBe(0);
      expect(result.months).toBe(1);
    });

    it("calculates annual correctly (15% discount)", () => {
      const result = calculateBaseCost(50, 10, "annual");
      // 10 seats * $50 * 12 months = 6000
      // 6000 * (1 - 0.15) = 5100
      expect(result.amount).toBe(5100);
      expect(result.discountRate).toBe(0.15);
      expect(result.months).toBe(12);
    });

    it("calculates two-year correctly (25% discount)", () => {
      const result = calculateBaseCost(50, 10, "two_year");
      // 10 seats * $50 * 24 months = 12000
      // 12000 * (1 - 0.25) = 9000
      expect(result.amount).toBe(9000);
      expect(result.discountRate).toBe(0.25);
      expect(result.months).toBe(24);
    });
  });

  describe("calculateAddonCost", () => {
    it("calculates fixed_monthly addon", () => {
      const addon: AddonInput = {
        featureName: "SSO",
        pricingModel: "fixed_monthly",
        addonPrice: 200,
        quantity: 1, // unused for fixed_monthly
      };
      // For 12 months
      const result = calculateAddonCost(addon, 5100, 12);
      expect(result.amount).toBe(2400); // 200 * 12
    });

    it("calculates per_seat addon", () => {
      const addon: AddonInput = {
        featureName: "API",
        pricingModel: "per_seat",
        addonPrice: 50,
        quantity: 5, // 5 seats of API
      };
      // For 12 months
      const result = calculateAddonCost(addon, 5100, 12);
      expect(result.amount).toBe(3000); // 5 * 50 * 12
    });

    it("calculates percentage_of_product addon", () => {
      const addon: AddonInput = {
        featureName: "Premium Support",
        pricingModel: "percentage_of_product",
        addonPrice: 10, // 10%
        quantity: 1,
      };
      // 10% of 5100
      const result = calculateAddonCost(addon, 5100, 12);
      expect(result.amount).toBe(510);
    });
  });

  describe("calculateQuoteTotal (Sample Quote Match)", () => {
    it("matches the exact math from sample-quote.xlsx", () => {
      const addons: AddonInput[] = [
        {
          featureName: "Single Sign-On (SSO)",
          pricingModel: "fixed_monthly",
          addonPrice: 200,
          quantity: 1,
        },
        {
          featureName: "API access",
          pricingModel: "per_seat",
          addonPrice: 50,
          quantity: 5, // 5 seats, different from the 25 product seats
        },
      ];

      const result = calculateQuoteTotal({
        productName: "Analytics Suite",
        tierName: "Growth",
        basePricePerSeat: 50,
        seats: 25,
        termLength: "annual",
        addons,
        discountPercentage: 0,
      });

      // Assert base cost
      expect(result.baseCost.amount).toBe(12750); // 25 * 50 * 12 * 0.85

      // Assert line items
      expect(result.lineItems).toHaveLength(3);
      
      const baseLineItem = result.lineItems.find(li => li.label.includes("Growth tier"));
      expect(baseLineItem?.amount).toBe(12750);

      const ssoItem = result.lineItems.find(li => li.label.includes("SSO"));
      expect(ssoItem?.amount).toBe(2400); // 200 * 12

      const apiItem = result.lineItems.find(li => li.label.includes("API"));
      expect(apiItem?.amount).toBe(3000); // 5 * 50 * 12

      // Assert totals
      expect(result.subtotal).toBe(18150); // 12750 + 2400 + 3000
      expect(result.discountAmount).toBe(0);
      expect(result.total).toBe(18150);
    });

    it("applies quote-level discount correctly", () => {
      const addons: AddonInput[] = [
        {
          featureName: "SSO",
          pricingModel: "fixed_monthly",
          addonPrice: 200,
          quantity: 1,
        },
      ];

      const result = calculateQuoteTotal({
        productName: "Product",
        tierName: "Tier",
        basePricePerSeat: 100,
        seats: 10,
        termLength: "monthly",
        addons,
        discountPercentage: 10, // 10% off the whole quote
      });

      // Base: 10 * 100 * 1 = 1000
      // Addon: 200 * 1 = 200
      // Subtotal: 1200
      // Discount: 120 (10%)
      // Total: 1080

      expect(result.subtotal).toBe(1200);
      expect(result.discountAmount).toBe(120);
      expect(result.total).toBe(1080);
    });
  });
});
