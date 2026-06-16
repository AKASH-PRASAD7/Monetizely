"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { type ProductWithDetails } from "@/actions/catalog";
import { createQuote, type CreateQuoteInput } from "@/actions/quotes";
import {
  calculateQuoteTotal,
  type TermLength,
  type AddonInput,
  TERM_LENGTHS,
  getTermDetails,
} from "@/lib/pricing";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import Link from "next/link";

interface SelectedAddon {
  featureTierConfigId: string;
  featureName: string;
  pricingModel: "fixed_monthly" | "per_seat" | "percentage_of_product";
  addonPrice: number;
  quantity: number;
}

const STEPS = [
  { key: "basics", label: "Quote Details" },
  { key: "product", label: "Product & Tier" },
  { key: "config", label: "Seats & Term" },
  { key: "addons", label: "Add-ons" },
  { key: "review", label: "Review & Save" },
] as const;

type Step = (typeof STEPS)[number]["key"];

export function QuoteWizard({
  products,
}: {
  products: ProductWithDetails[];
}) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("basics");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Form state ────────────────────────────────────────────────────
  const [quoteName, setQuoteName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedTierId, setSelectedTierId] = useState("");
  const [seats, setSeats] = useState(10);
  const [termLength, setTermLength] = useState<TermLength>("annual");
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);

  // ── Derived data ──────────────────────────────────────────────────
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedTier = selectedProduct?.tiers.find((t) => t.id === selectedTierId);

  // Available add-ons for the selected tier
  const availableAddons = useMemo(() => {
    if (!selectedProduct || !selectedTier) return [];
    return selectedProduct.featureTierConfigs
      .filter(
        (config) =>
          config.tierId === selectedTier.id && config.availability === "addon"
      )
      .map((config) => {
        const feature = selectedProduct.features.find(
          (f) => f.id === config.featureId
        );
        return {
          configId: config.id,
          featureName: feature?.name ?? "Unknown",
          pricingModel: config.pricingModel as
            | "fixed_monthly"
            | "per_seat"
            | "percentage_of_product",
          addonPrice: parseFloat(config.addonPrice ?? "0"),
        };
      });
  }, [selectedProduct, selectedTier]);

  // Live calculation
  const calculation = useMemo(() => {
    if (!selectedProduct || !selectedTier) return null;

    const addonInputs: AddonInput[] = selectedAddons.map((a) => ({
      featureName: a.featureName,
      pricingModel: a.pricingModel,
      addonPrice: a.addonPrice,
      quantity: a.quantity,
    }));

    return calculateQuoteTotal({
      productName: selectedProduct.name,
      tierName: selectedTier.name,
      basePricePerSeat: parseFloat(selectedTier.basePricePerSeat),
      seats,
      termLength,
      addons: addonInputs,
      discountPercentage,
    });
  }, [selectedProduct, selectedTier, seats, termLength, selectedAddons, discountPercentage]);

  // ── Step navigation ───────────────────────────────────────────────
  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);

  function canAdvance(): boolean {
    switch (currentStep) {
      case "basics":
        return quoteName.trim().length > 0 && customerName.trim().length > 0;
      case "product":
        return !!selectedProductId && !!selectedTierId;
      case "config":
        return seats > 0;
      case "addons":
        return true;
      case "review":
        return true;
    }
  }

  function nextStep() {
    if (!canAdvance()) return;
    const next = STEPS[stepIndex + 1];
    if (next) setCurrentStep(next.key);
  }

  function prevStep() {
    const prev = STEPS[stepIndex - 1];
    if (prev) setCurrentStep(prev.key);
  }

  // ── Add-on toggling ──────────────────────────────────────────────
  function toggleAddon(configId: string) {
    setSelectedAddons((prev) => {
      const exists = prev.find((a) => a.featureTierConfigId === configId);
      if (exists) {
        return prev.filter((a) => a.featureTierConfigId !== configId);
      }
      const avail = availableAddons.find((a) => a.configId === configId);
      if (!avail) return prev;
      return [
        ...prev,
        {
          featureTierConfigId: configId,
          featureName: avail.featureName,
          pricingModel: avail.pricingModel,
          addonPrice: avail.addonPrice,
          quantity: avail.pricingModel === "per_seat" ? 1 : 1,
        },
      ];
    });
  }

  function updateAddonQuantity(configId: string, quantity: number) {
    setSelectedAddons((prev) =>
      prev.map((a) =>
        a.featureTierConfigId === configId ? { ...a, quantity } : a
      )
    );
  }

  // ── Submit ────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!selectedProduct || !selectedTier) return;
    setError("");
    setSaving(true);

    try {
      const input: CreateQuoteInput = {
        name: quoteName.trim(),
        customerName: customerName.trim(),
        productId: selectedProduct.id,
        tierId: selectedTier.id,
        seats,
        termLength,
        discountPercentage,
        selectedAddons: selectedAddons.map((a) => ({
          featureTierConfigId: a.featureTierConfigId,
          quantity: a.quantity,
        })),
      };

      const quoteId = await createQuote(input);
      router.push(`/quotes/${quoteId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create quote.");
      setSaving(false);
    }
  }

  // ── No products guard ─────────────────────────────────────────────
  if (products.length === 0) {
    return (
      <div className="glass-card p-16 text-center animate-fade-in">
        <h2 className="text-xl font-semibold mb-4">No products in catalog</h2>
        <p className="text-[var(--text-secondary)] mb-6">
          You need to create a product before you can build a quote.
        </p>
        <Link href="/catalog/new" className="btn btn-primary">
          Create a Product
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Build a Quote</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Steps + Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stepper */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {STEPS.map((step, i) => (
              <button
                key={step.key}
                onClick={() => i <= stepIndex && setCurrentStep(step.key)}
                className={`stepper-step flex-shrink-0 ${
                  currentStep === step.key
                    ? "stepper-step-active"
                    : i < stepIndex
                    ? "stepper-step-completed"
                    : "stepper-step-inactive"
                }`}
                disabled={i > stepIndex}
              >
                <span
                  className={`stepper-dot ${
                    currentStep === step.key
                      ? "stepper-dot-active"
                      : i < stepIndex
                      ? "stepper-dot-completed"
                      : "stepper-dot-inactive"
                  }`}
                >
                  {i < stepIndex ? "✓" : i + 1}
                </span>
                <span className="text-sm font-medium whitespace-nowrap">{step.label}</span>
              </button>
            ))}
          </div>

          {/* Step content */}
          <div className="glass-card p-6 animate-fade-in" key={currentStep}>
            {currentStep === "basics" && (
              <div className="space-y-5">
                <h2 className="text-xl font-semibold">Quote Details</h2>
                <div>
                  <label className="block text-sm font-medium mb-2">Quote Name</label>
                  <input
                    id="quote-name"
                    type="text"
                    className="input"
                    placeholder="e.g., Acme Corp - Q3 2026 Proposal"
                    value={quoteName}
                    onChange={(e) => setQuoteName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Customer Name</label>
                  <input
                    id="customer-name"
                    type="text"
                    className="input"
                    placeholder="e.g., Acme Corporation"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {currentStep === "product" && (
              <div className="space-y-5">
                <h2 className="text-xl font-semibold">Select Product & Tier</h2>
                <div>
                  <label className="block text-sm font-medium mb-2">Product</label>
                  <select
                    id="product-select"
                    className="select"
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      setSelectedTierId("");
                      setSelectedAddons([]);
                    }}
                  >
                    <option value="">Choose a product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProduct && (
                  <div>
                    <label className="block text-sm font-medium mb-3">Tier</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {selectedProduct.tiers.map((tier) => (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => {
                            setSelectedTierId(tier.id);
                            setSelectedAddons([]);
                          }}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            selectedTierId === tier.id
                              ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 shadow-[var(--shadow-glow)]"
                              : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]"
                          }`}
                        >
                          <p className="font-semibold">{tier.name}</p>
                          <p className="text-sm text-[var(--accent-secondary)] mt-1">
                            ${parseFloat(tier.basePricePerSeat)}/seat/mo
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === "config" && (
              <div className="space-y-5">
                <h2 className="text-xl font-semibold">Seats & Term</h2>
                <div>
                  <label className="block text-sm font-medium mb-2">Number of Seats</label>
                  <input
                    id="seat-count"
                    type="number"
                    className="input"
                    min="1"
                    value={seats}
                    onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-3">Term Length</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {TERM_LENGTHS.map((term) => {
                      const details = getTermDetails(term);
                      return (
                        <button
                          key={term}
                          type="button"
                          onClick={() => setTermLength(term)}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            termLength === term
                              ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 shadow-[var(--shadow-glow)]"
                              : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]"
                          }`}
                        >
                          <p className="font-semibold">{details.label}</p>
                          {details.discountRate > 0 && (
                            <p className="text-sm text-[var(--success)] mt-1">
                              {(details.discountRate * 100).toFixed(0)}% discount
                            </p>
                          )}
                          {details.discountRate === 0 && (
                            <p className="text-sm text-[var(--text-tertiary)] mt-1">
                              No discount
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {currentStep === "addons" && (
              <div className="space-y-5">
                <h2 className="text-xl font-semibold">Add-ons</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Select optional add-on features available for the {selectedTier?.name} tier.
                </p>

                {availableAddons.length === 0 ? (
                  <div className="p-8 text-center text-[var(--text-tertiary)]">
                    <p>No add-ons available for this tier.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableAddons.map((addon) => {
                      const isSelected = selectedAddons.some(
                        (a) => a.featureTierConfigId === addon.configId
                      );
                      const selected = selectedAddons.find(
                        (a) => a.featureTierConfigId === addon.configId
                      );

                      return (
                        <div
                          key={addon.configId}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            isSelected
                              ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5"
                              : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => toggleAddon(addon.configId)}
                                className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
                                  isSelected
                                    ? "bg-[var(--accent-primary)] border-[var(--accent-primary)]"
                                    : "border-[var(--border-secondary)]"
                                }`}
                              >
                                {isSelected && (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 6 9 17l-5-5" />
                                  </svg>
                                )}
                              </button>
                              <div>
                                <p className="font-medium">{addon.featureName}</p>
                                <p className="text-xs text-[var(--text-tertiary)]">
                                  {addon.pricingModel === "fixed_monthly" && `$${addon.addonPrice}/month`}
                                  {addon.pricingModel === "per_seat" && `$${addon.addonPrice}/seat/month`}
                                  {addon.pricingModel === "percentage_of_product" && `${addon.addonPrice}% of product cost`}
                                </p>
                              </div>
                            </div>
                            <span className="badge badge-addon">
                              {addon.pricingModel === "fixed_monthly" && "Fixed"}
                              {addon.pricingModel === "per_seat" && "Per Seat"}
                              {addon.pricingModel === "percentage_of_product" && "% Based"}
                            </span>
                          </div>

                          {isSelected && addon.pricingModel === "per_seat" && (
                            <div className="mt-3 ml-8">
                              <label className="block text-xs text-[var(--text-tertiary)] mb-1">
                                Number of seats for this add-on
                              </label>
                              <input
                                type="number"
                                className="input w-32"
                                min="1"
                                value={selected?.quantity ?? 1}
                                onChange={(e) =>
                                  updateAddonQuantity(
                                    addon.configId,
                                    parseInt(e.target.value) || 1
                                  )
                                }
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Discount */}
                <div className="mt-6 pt-6 border-t border-[var(--border-primary)]">
                  <label className="block text-sm font-medium mb-2">
                    Quote Discount (%)
                  </label>
                  <input
                    id="discount-input"
                    type="number"
                    className="input w-32"
                    min="0"
                    max="100"
                    step="0.1"
                    value={discountPercentage || ""}
                    onChange={(e) =>
                      setDiscountPercentage(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0"
                  />
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    Applied to the total quote amount.
                  </p>
                </div>
              </div>
            )}

            {currentStep === "review" && calculation && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Review Quote</h2>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[var(--bg-elevated)]">
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Customer</p>
                    <p className="font-medium">{customerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Quote Name</p>
                    <p className="font-medium">{quoteName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Product & Tier</p>
                    <p className="font-medium">
                      {selectedProduct?.name} — {selectedTier?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Seats × Term</p>
                    <p className="font-medium">
                      {seats} seats · {getTermDetails(termLength).label}
                    </p>
                  </div>
                </div>

                {/* Line items */}
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Line Item</th>
                        <th>Calculation</th>
                        <th className="text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculation.lineItems.map((item, i) => (
                        <tr key={i}>
                          <td className="font-medium">{item.label}</td>
                          <td className="text-sm text-[var(--text-secondary)]">
                            {item.calculationDescription}
                          </td>
                          <td className="text-right font-mono">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="p-4 rounded-xl bg-[var(--bg-elevated)] space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Subtotal</span>
                    <span className="font-mono">{formatCurrency(calculation.subtotal)}</span>
                  </div>
                  {calculation.discountPercentage > 0 && (
                    <div className="flex justify-between text-sm text-[var(--success)]">
                      <span>Discount ({formatPercentage(calculation.discountPercentage)})</span>
                      <span className="font-mono">−{formatCurrency(calculation.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-[var(--border-primary)]">
                    <span>Total</span>
                    <span className="gradient-text">{formatCurrency(calculation.total)}</span>
                  </div>
                </div>

                {error && (
                  <div className="p-4 rounded-lg bg-[var(--error-bg)] border border-[var(--error)] text-[var(--error)] text-sm">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={prevStep}
              className="btn btn-secondary"
              disabled={stepIndex === 0}
            >
              ← Back
            </button>
            <div className="flex gap-3">
              {currentStep === "review" ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="btn btn-primary btn-lg"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Quote"
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={nextStep}
                  className="btn btn-primary"
                  disabled={!canAdvance()}
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Live preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 glass-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
              Live Preview
            </h3>

            {calculation ? (
              <>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Product</span>
                    <span className="font-medium">{selectedProduct?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Tier</span>
                    <span className="font-medium">{selectedTier?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Seats</span>
                    <span className="font-medium">{seats}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Term</span>
                    <span className="font-medium">{getTermDetails(termLength).label}</span>
                  </div>
                </div>

                <div className="border-t border-[var(--border-primary)] pt-4 space-y-2">
                  {calculation.lineItems.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)] truncate mr-2">
                        {item.label}
                      </span>
                      <span className="font-mono text-xs">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>

                {calculation.discountPercentage > 0 && (
                  <div className="flex justify-between text-sm text-[var(--success)]">
                    <span>Discount</span>
                    <span className="font-mono">
                      −{formatCurrency(calculation.discountAmount)}
                    </span>
                  </div>
                )}

                <div className="border-t border-[var(--border-primary)] pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total</span>
                    <span className="text-2xl font-bold gradient-text">
                      {formatCurrency(calculation.total)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--text-tertiary)]">
                Select a product and tier to see a live cost preview.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
