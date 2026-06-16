import Link from "next/link";
import { getProducts } from "@/actions/catalog";
import { getQuotes } from "@/actions/quotes";

export default async function DashboardPage() {
  let productCount = 0;
  let quoteCount = 0;

  try {
    const products = await getProducts();
    productCount = products.length;
  } catch {
    // DB not connected yet
  }

  try {
    const quotes = await getQuotes();
    quoteCount = quotes.length;
  } catch {
    // DB not connected yet
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <div className="animate-fade-in mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          Welcome to{" "}
          <span className="gradient-text">Monetizely</span>
        </h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-2xl">
          Design SaaS pricing catalogs and generate transparent, shareable
          quotes for your customers.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 animate-slide-up">
        <StatCard
          label="Products"
          value={productCount}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m7.5 4.27 9 5.15" />
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 22V12" />
            </svg>
          }
          color="from-indigo-500 to-purple-500"
        />
        <StatCard
          label="Quotes"
          value={quoteCount}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
              <path d="M14 2v6h6" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
              <path d="M10 9H8" />
            </svg>
          }
          color="from-emerald-500 to-teal-500"
        />
        <div className="glass-card glass-card-interactive p-6 flex items-center gap-4 sm:col-span-2 lg:col-span-1">
          <div className="flex-1">
            <p className="text-sm text-[var(--text-tertiary)] mb-1">Quick Actions</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Link href="/catalog/new" className="btn btn-primary btn-sm">
                + New Product
              </Link>
              <Link href="/quotes/new" className="btn btn-secondary btn-sm">
                + New Quote
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Getting started */}
      <div className="glass-card p-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
        <h2 className="text-xl font-semibold mb-6">Getting Started</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Step
            number={1}
            title="Set Up Your Catalog"
            description="Create products with tiers, define features, and configure pricing for each tier."
            href="/catalog/new"
            cta="Create Product"
          />
          <Step
            number={2}
            title="Build a Quote"
            description="Select a product, choose a tier and seat count, pick add-ons, and set discounts."
            href="/quotes/new"
            cta="Build Quote"
          />
          <Step
            number={3}
            title="Share with Customers"
            description="Each quote gets a unique URL showing a professional, read-only cost breakdown."
            href="/quotes"
            cta="View Quotes"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-md`}
        >
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-[var(--text-tertiary)] mt-1">{label}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
  href,
  cta,
}: {
  number: number;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] text-white text-sm font-semibold">
          {number}
        </span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-[var(--text-secondary)] mb-4 flex-1">
        {description}
      </p>
      <Link href={href} className="btn btn-ghost btn-sm self-start">
        {cta} →
      </Link>
    </div>
  );
}
