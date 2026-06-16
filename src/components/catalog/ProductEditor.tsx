"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  updateProduct,
  saveTiers,
  addFeature,
  deleteFeature,
  saveFeatureMatrix,
  type ProductWithDetails,
  type TierInput,
  type FeatureTierConfigInput,
} from "@/actions/catalog";
import Link from "next/link";

type Tab = "tiers" | "features" | "matrix";

export function ProductEditor({ product }: { product: ProductWithDetails }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(
    product.tiers.length > 0 && product.features.length > 0
      ? "matrix"
      : product.tiers.length > 0
      ? "features"
      : "tiers"
  );
  const [productName, setProductName] = useState(product.name);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // ── Tier state ────────────────────────────────────────────────────
  const [tierInputs, setTierInputs] = useState<TierInput[]>(
    product.tiers.map((t) => ({
      id: t.id,
      name: t.name,
      basePricePerSeat: parseFloat(t.basePricePerSeat),
      sortOrder: t.sortOrder,
    }))
  );

  // ── Feature name input ────────────────────────────────────────────
  const [newFeatureName, setNewFeatureName] = useState("");
  const [addingFeature, setAddingFeature] = useState(false);

  // ── Matrix state ──────────────────────────────────────────────────
  const [matrixConfigs, setMatrixConfigs] = useState<Record<string, FeatureTierConfigInput>>(() => {
    const map: Record<string, FeatureTierConfigInput> = {};
    for (const config of product.featureTierConfigs) {
      const key = `${config.featureId}:${config.tierId}`;
      map[key] = {
        featureId: config.featureId,
        tierId: config.tierId,
        availability: config.availability as "included" | "addon" | "not_available",
        pricingModel: config.pricingModel as FeatureTierConfigInput["pricingModel"],
        addonPrice: config.addonPrice ? parseFloat(config.addonPrice) : null,
      };
    }
    return map;
  });

  // ── Helpers ───────────────────────────────────────────────────────

  function showStatus(msg: string) {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(""), 3000);
  }

  function getConfig(featureId: string, tierId: string): FeatureTierConfigInput {
    const key = `${featureId}:${tierId}`;
    return matrixConfigs[key] ?? {
      featureId,
      tierId,
      availability: "not_available",
      pricingModel: null,
      addonPrice: null,
    };
  }

  function updateConfig(featureId: string, tierId: string, updates: Partial<FeatureTierConfigInput>) {
    const key = `${featureId}:${tierId}`;
    setMatrixConfigs((prev) => ({
      ...prev,
      [key]: {
        ...getConfig(featureId, tierId),
        ...updates,
      },
    }));
  }

  // ── Actions ───────────────────────────────────────────────────────

  async function handleSaveProductName() {
    if (!productName.trim()) return;
    setSaving(true);
    try {
      await updateProduct(product.id, productName.trim());
      showStatus("Product name saved!");
    } catch {
      showStatus("Failed to save.");
    }
    setSaving(false);
  }

  async function handleSaveTiers() {
    setSaving(true);
    try {
      await saveTiers(product.id, tierInputs);
      showStatus("Tiers saved! Refreshing...");
      router.refresh();
    } catch {
      showStatus("Failed to save tiers.");
    }
    setSaving(false);
  }

  async function handleAddFeature() {
    if (!newFeatureName.trim()) return;
    setAddingFeature(true);
    try {
      await addFeature(product.id, newFeatureName.trim());
      setNewFeatureName("");
      showStatus("Feature added!");
      router.refresh();
    } catch {
      showStatus("Failed to add feature.");
    }
    setAddingFeature(false);
  }

  async function handleDeleteFeature(featureId: string) {
    if (!confirm("Remove this feature?")) return;
    try {
      await deleteFeature(featureId, product.id);
      showStatus("Feature removed.");
      router.refresh();
    } catch {
      showStatus("Failed to remove feature.");
    }
  }

  async function handleSaveMatrix() {
    setSaving(true);
    try {
      const configs = Object.values(matrixConfigs);
      await saveFeatureMatrix(product.id, configs);
      showStatus("Feature matrix saved!");
      router.refresh();
    } catch {
      showStatus("Failed to save matrix.");
    }
    setSaving(false);
  }

  const addTierInput = useCallback(() => {
    setTierInputs((prev) => [
      ...prev,
      { name: "", basePricePerSeat: 0, sortOrder: prev.length },
    ]);
  }, []);

  const removeTierInput = useCallback((index: number) => {
    setTierInputs((prev) =>
      prev.filter((_, i) => i !== index).map((t, i) => ({ ...t, sortOrder: i }))
    );
  }, []);

  // ── Render ────────────────────────────────────────────────────────

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "tiers", label: "Tiers", count: product.tiers.length },
    { key: "features", label: "Features", count: product.features.length },
    { key: "matrix", label: "Feature Matrix" },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/catalog" className="btn btn-ghost btn-sm">
            ← Back
          </Link>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              onBlur={handleSaveProductName}
              className="text-2xl font-bold bg-transparent border-none outline-none hover:bg-[var(--bg-elevated)] focus:bg-[var(--bg-elevated)] px-3 py-1 rounded-lg transition-colors"
            />
          </div>
        </div>
        {statusMessage && (
          <span className="text-sm text-[var(--success)] animate-fade-in">
            ✓ {statusMessage}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-8 p-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] w-fit">
        {TABS.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
              activeTab === key
                ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {label}
            {count !== undefined && (
              <span className="ml-2 text-xs opacity-60">({count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {activeTab === "tiers" && (
          <TiersTab
            tiers={tierInputs}
            onAdd={addTierInput}
            onRemove={removeTierInput}
            onUpdate={(index, field, value) =>
              setTierInputs((prev) =>
                prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
              )
            }
            onSave={handleSaveTiers}
            saving={saving}
          />
        )}
        {activeTab === "features" && (
          <FeaturesTab
            features={product.features}
            newName={newFeatureName}
            onNewNameChange={setNewFeatureName}
            onAdd={handleAddFeature}
            onDelete={handleDeleteFeature}
            adding={addingFeature}
          />
        )}
        {activeTab === "matrix" && (
          <MatrixTab
            features={product.features}
            tiers={product.tiers}
            getConfig={getConfig}
            updateConfig={updateConfig}
            onSave={handleSaveMatrix}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}

// ── Tiers Tab ─────────────────────────────────────────────────────────

function TiersTab({
  tiers,
  onAdd,
  onRemove,
  onUpdate,
  onSave,
  saving,
}: {
  tiers: TierInput[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: string, value: string | number) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Pricing Tiers</h2>
          <p className="text-sm text-[var(--text-tertiary)]">
            Each tier has a name and a base per-seat monthly price.
          </p>
        </div>
        <button type="button" onClick={onAdd} className="btn btn-secondary btn-sm">
          + Add Tier
        </button>
      </div>

      <div className="space-y-3">
        {tiers.map((tier, index) => (
          <div
            key={index}
            className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-primary)]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-primary)] text-sm font-mono text-[var(--text-tertiary)]">
              {index + 1}
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4">
              <input
                type="text"
                className="input"
                placeholder="Tier name"
                value={tier.name}
                onChange={(e) => onUpdate(index, "name", e.target.value)}
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">$</span>
                <input
                  type="number"
                  className="input pl-7"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={tier.basePricePerSeat || ""}
                  onChange={(e) =>
                    onUpdate(index, "basePricePerSeat", parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </div>
            {tiers.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="btn btn-ghost btn-sm text-[var(--text-tertiary)] hover:text-[var(--error)]"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={onSave} className="btn btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Save Tiers"}
        </button>
      </div>
    </div>
  );
}

// ── Features Tab ──────────────────────────────────────────────────────

function FeaturesTab({
  features,
  newName,
  onNewNameChange,
  onAdd,
  onDelete,
  adding,
}: {
  features: { id: string; name: string; sortOrder: number }[];
  newName: string;
  onNewNameChange: (v: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  adding: boolean;
}) {
  return (
    <div className="glass-card p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Features</h2>
        <p className="text-sm text-[var(--text-tertiary)]">
          Add features for this product. You'll configure availability per tier in the Feature Matrix tab.
        </p>
      </div>

      {/* Add feature */}
      <div className="flex gap-3">
        <input
          type="text"
          className="input flex-1"
          placeholder="e.g., Single Sign-On (SSO)"
          value={newName}
          onChange={(e) => onNewNameChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
        />
        <button onClick={onAdd} className="btn btn-primary" disabled={adding}>
          {adding ? "Adding..." : "Add Feature"}
        </button>
      </div>

      {/* Feature list */}
      {features.length === 0 ? (
        <p className="text-center py-8 text-[var(--text-tertiary)]">
          No features yet. Add your first feature above.
        </p>
      ) : (
        <div className="space-y-2">
          {features.map((feature, index) => (
            <div
              key={feature.id}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-primary)]"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-tertiary)] font-mono w-6">
                  {index + 1}.
                </span>
                <span className="text-sm">{feature.name}</span>
              </div>
              <button
                onClick={() => onDelete(feature.id)}
                className="btn btn-ghost btn-sm text-[var(--text-tertiary)] hover:text-[var(--error)]"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Matrix Tab ────────────────────────────────────────────────────────

function MatrixTab({
  features,
  tiers,
  getConfig,
  updateConfig,
  onSave,
  saving,
}: {
  features: { id: string; name: string }[];
  tiers: { id: string; name: string; basePricePerSeat: string }[];
  getConfig: (featureId: string, tierId: string) => FeatureTierConfigInput;
  updateConfig: (featureId: string, tierId: string, updates: Partial<FeatureTierConfigInput>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  if (features.length === 0 || tiers.length === 0) {
    return (
      <div className="glass-card p-16 text-center">
        <h3 className="text-lg font-semibold mb-2">Set up tiers and features first</h3>
        <p className="text-[var(--text-secondary)]">
          You need at least one tier and one feature to configure the feature matrix.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Feature Matrix</h2>
          <p className="text-sm text-[var(--text-tertiary)]">
            For each feature, set availability per tier. Configure add-on pricing inline.
          </p>
        </div>
        <button onClick={onSave} className="btn btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Save Matrix"}
        </button>
      </div>

      <div className="table-container overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="min-w-[200px] sticky left-0 bg-[var(--bg-elevated)] z-10">Feature</th>
              {tiers.map((tier) => (
                <th key={tier.id} className="min-w-[260px]">
                  <div>{tier.name}</div>
                  <div className="text-[var(--accent-secondary)] font-normal text-xs mt-0.5">
                    ${parseFloat(tier.basePricePerSeat)}/seat/mo
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => (
              <tr key={feature.id}>
                <td className="font-medium sticky left-0 bg-[var(--bg-card)] z-10 border-r border-[var(--border-primary)]">
                  {feature.name}
                </td>
                {tiers.map((tier) => {
                  const config = getConfig(feature.id, tier.id);
                  return (
                    <td key={tier.id} className="p-3">
                      <MatrixCell
                        config={config}
                        onChange={(updates) =>
                          updateConfig(feature.id, tier.id, updates)
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

// ── Matrix Cell ───────────────────────────────────────────────────────

function MatrixCell({
  config,
  onChange,
}: {
  config: FeatureTierConfigInput;
  onChange: (updates: Partial<FeatureTierConfigInput>) => void;
}) {
  return (
    <div className="space-y-2">
      <select
        className="select text-sm"
        value={config.availability}
        onChange={(e) =>
          onChange({
            availability: e.target.value as FeatureTierConfigInput["availability"],
            pricingModel: e.target.value === "addon" ? "fixed_monthly" : null,
            addonPrice: e.target.value === "addon" ? 0 : null,
          })
        }
      >
        <option value="not_available">Not Available</option>
        <option value="included">Included</option>
        <option value="addon">Add-on</option>
      </select>

      {config.availability === "addon" && (
        <div className="space-y-2 p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)]">
          <select
            className="select text-xs"
            value={config.pricingModel ?? "fixed_monthly"}
            onChange={(e) =>
              onChange({
                pricingModel: e.target.value as FeatureTierConfigInput["pricingModel"],
              })
            }
          >
            <option value="fixed_monthly">Fixed monthly</option>
            <option value="per_seat">Per seat/month</option>
            <option value="percentage_of_product">% of product cost</option>
          </select>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-xs">
              {config.pricingModel === "percentage_of_product" ? "%" : "$"}
            </span>
            <input
              type="number"
              className="input text-xs pl-7"
              min="0"
              step={config.pricingModel === "percentage_of_product" ? "0.1" : "0.01"}
              value={config.addonPrice ?? ""}
              onChange={(e) =>
                onChange({ addonPrice: parseFloat(e.target.value) || 0 })
              }
              placeholder={
                config.pricingModel === "percentage_of_product"
                  ? "e.g., 10"
                  : "e.g., 200"
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
