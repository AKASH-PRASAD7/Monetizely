import Link from "next/link";
import { getProducts } from "@/actions/catalog";

export const metadata = {
  title: "Catalog — Monetizely",
  description: "Manage your product catalog with tiers, features, and pricing.",
};

export default async function CatalogPage() {
  let products: Awaited<ReturnType<typeof getProducts>> = [];

  try {
    products = await getProducts();
  } catch {
    // DB not connected
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Catalog</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Define your products, tiers, features, and add-on pricing.
          </p>
        </div>
        <Link href="/catalog/new" className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          New Product
        </Link>
      </div>

      {/* Product grid */}
      {products.length === 0 ? (
        <div className="glass-card p-16 text-center animate-slide-up">
          <div className="flex justify-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-elevated)]">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m7.5 4.27 9 5.15" />
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="m3.3 7 8.7 5 8.7-5" />
                <path d="M12 22V12" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">No products yet</h3>
          <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
            Create your first product to start building a catalog with tiers, features, and pricing.
          </p>
          <Link href="/catalog/new" className="btn btn-primary">
            Create Your First Product
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/catalog/${product.id}`}
              className="glass-card glass-card-interactive p-6 block group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-[var(--accent-secondary)]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m7.5 4.27 9 5.15" />
                    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                    <path d="m3.3 7 8.7 5 8.7-5" />
                    <path d="M12 22V12" />
                  </svg>
                </div>
                <svg
                  width="16" height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-tertiary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="group-hover:stroke-[var(--accent-primary)] transition-colors"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-[var(--accent-secondary)] transition-colors">
                {product.name}
              </h3>
              <div className="flex items-center gap-4 text-sm text-[var(--text-tertiary)]">
                <span>{product.tiers.length} tiers</span>
                <span>·</span>
                <span>{product.features.length} features</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
