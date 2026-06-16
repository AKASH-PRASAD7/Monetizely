"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct, type TierInput } from "@/actions/catalog";

export default function NewProductPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tiers, setTiers] = useState<TierInput[]>([
    { name: "Starter", basePricePerSeat: 25, sortOrder: 0 },
    { name: "Growth", basePricePerSeat: 50, sortOrder: 1 },
    { name: "Enterprise", basePricePerSeat: 100, sortOrder: 2 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addTier() {
    setTiers((prev) => [
      ...prev,
      { name: "", basePricePerSeat: 0, sortOrder: prev.length },
    ]);
  }

  function removeTier(index: number) {
    setTiers((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((t, i) => ({ ...t, sortOrder: i }))
    );
  }

  function updateTier(index: number, field: keyof TierInput, value: string | number) {
    setTiers((prev) =>
      prev.map((t, i) =>
        i === index ? { ...t, [field]: value } : t
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (tiers.length === 0) {
      setError("At least one tier is required.");
      return;
    }

    for (const tier of tiers) {
      if (!tier.name.trim()) {
        setError("All tiers must have a name.");
        return;
      }
    }

    setSaving(true);
    try {
      const productId = await createProduct(name.trim(), tiers);
      router.push(`/catalog/${productId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="animate-fade-in mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create Product</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Define your product and its pricing tiers.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 animate-slide-up">
        {/* Product name */}
        <div className="glass-card p-6">
          <label className="block text-sm font-medium mb-2">Product Name</label>
          <input
            id="product-name"
            type="text"
            className="input"
            placeholder="e.g., Analytics Suite"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        {/* Tiers */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Pricing Tiers</h2>
              <p className="text-sm text-[var(--text-tertiary)]">
                Define tiers with base per-seat monthly prices.
              </p>
            </div>
            <button type="button" onClick={addTier} className="btn btn-secondary btn-sm">
              + Add Tier
            </button>
          </div>

          <div className="space-y-4">
            {tiers.map((tier, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-primary)]"
              >
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[var(--text-tertiary)] mb-1">
                      Tier Name
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., Starter"
                      value={tier.name}
                      onChange={(e) => updateTier(index, "name", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-tertiary)] mb-1">
                      Base Price ($/seat/month)
                    </label>
                    <input
                      type="number"
                      className="input"
                      min="0"
                      step="0.01"
                      value={tier.basePricePerSeat || ""}
                      onChange={(e) =>
                        updateTier(
                          index,
                          "basePricePerSeat",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </div>
                {tiers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTier(index)}
                    className="btn btn-ghost btn-sm text-[var(--text-tertiary)] hover:text-[var(--error)]"
                    title="Remove tier"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-lg bg-[var(--error-bg)] border border-[var(--error)] text-[var(--error)] text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push("/catalog")}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              "Create Product"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
