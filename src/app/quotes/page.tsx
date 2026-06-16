import Link from "next/link";
import { getQuotes } from "@/actions/quotes";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getTermDetails, type TermLength } from "@/lib/pricing";

export const metadata = {
  title: "Quotes — Monetizely",
  description: "View and manage your customer quotes.",
};

export default async function QuotesPage() {
  let quotes: Awaited<ReturnType<typeof getQuotes>> = [];

  try {
    quotes = await getQuotes();
  } catch {
    // DB not connected
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quotes</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            View all generated quotes. Each has a shareable URL.
          </p>
        </div>
        <Link href="/quotes/new" className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          New Quote
        </Link>
      </div>

      {quotes.length === 0 ? (
        <div className="glass-card p-16 text-center animate-slide-up">
          <div className="flex justify-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-elevated)]">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
                <path d="M10 9H8" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">No quotes yet</h3>
          <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
            Build your first quote by selecting a product from your catalog.
          </p>
          <Link href="/quotes/new" className="btn btn-primary">
            Build Your First Quote
          </Link>
        </div>
      ) : (
        <div className="space-y-4 animate-slide-up">
          {quotes.map((quote) => {
            const term = getTermDetails(quote.termLength as TermLength);
            return (
              <Link
                key={quote.id}
                href={`/quotes/${quote.id}`}
                className="glass-card glass-card-interactive p-6 flex items-center justify-between group block"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-semibold group-hover:text-[var(--accent-secondary)] transition-colors">
                    {quote.name}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-[var(--text-secondary)]">
                    <span>{quote.customerName}</span>
                    <span>·</span>
                    <span>{quote.productName} — {quote.tierName}</span>
                    <span>·</span>
                    <span>{quote.seats} seats</span>
                    <span>·</span>
                    <span>{term.label}</span>
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] mt-2">
                    Created {formatDate(quote.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold gradient-text">
                    {formatCurrency(parseFloat(quote.totalAmount))}
                  </p>
                  {parseFloat(quote.discountPercentage) > 0 && (
                    <p className="text-xs text-[var(--success)] mt-1">
                      {quote.discountPercentage}% discount applied
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
