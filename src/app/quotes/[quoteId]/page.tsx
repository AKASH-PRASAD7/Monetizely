import { getQuote } from "@/actions/quotes";
import { notFound } from "next/navigation";
import { formatCurrency, formatPercentage, formatDate, getValidUntilDate } from "@/lib/utils";
import { getTermDetails, type TermLength } from "@/lib/pricing";
import { PrintButton } from "@/components/quotes/PrintButton";

interface Props {
  params: Promise<{ quoteId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { quoteId } = await params;
  const quote = await getQuote(quoteId);
  return {
    title: quote ? `${quote.name} — Proposal` : "Quote Not Found",
  };
}

export default async function QuoteViewPage({ params }: Props) {
  const { quoteId } = await params;
  const quote = await getQuote(quoteId);

  if (!quote) notFound();

  const term = getTermDetails(quote.termLength as TermLength);
  const validUntil = getValidUntilDate(quote.createdAt);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
      <div className="w-full max-w-4xl animate-slide-up">
        <div className="quote-document">
          {/* Header */}
          <div className="quote-header flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-indigo-200 text-sm font-semibold tracking-wider uppercase mb-2">
                Proposal For
              </p>
              <h1 className="text-4xl font-bold mb-1">{quote.customerName}</h1>
              <p className="text-indigo-100 text-lg opacity-90">{quote.name}</p>
            </div>
            <div className="text-left md:text-right">
              <div className="mb-2">
                <p className="text-indigo-200 text-xs uppercase tracking-wider">Date</p>
                <p className="font-medium">{formatDate(quote.createdAt)}</p>
              </div>
              <div>
                <p className="text-indigo-200 text-xs uppercase tracking-wider">Valid Until</p>
                <p className="font-medium">{formatDate(validUntil)}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="quote-body space-y-10">
            {/* What is being purchased */}
            <section>
              <h2 className="text-xl font-bold border-b border-slate-200 pb-2 mb-4 text-slate-800">
                What is being purchased
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Product</p>
                  <p className="font-semibold text-slate-900">{quote.productName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Tier</p>
                  <p className="font-semibold text-slate-900">{quote.tierName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Seats</p>
                  <p className="font-semibold text-slate-900">{quote.seats}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Term Length</p>
                  <p className="font-semibold text-slate-900">{term.label}</p>
                  {term.discountRate > 0 && (
                    <p className="text-xs text-emerald-600 mt-0.5">
                      {term.discountRate * 100}% discount applies to per-seat price
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Cost Breakdown */}
            <section>
              <h2 className="text-xl font-bold border-b border-slate-200 pb-2 mb-4 text-slate-800">
                Cost breakdown
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                      <th className="py-3 px-4 font-semibold w-1/3">Line item</th>
                      <th className="py-3 px-4 font-semibold w-1/3">How it was calculated</th>
                      <th className="py-3 px-4 font-semibold w-1/4">Notes</th>
                      <th className="py-3 px-4 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {quote.lineItems.map((item, index) => (
                      <tr key={item.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50">
                        <td className="py-4 px-4 align-top font-medium text-slate-900">
                          {item.label}
                        </td>
                        <td className="py-4 px-4 align-top text-slate-600">
                          {item.calculationDescription}
                        </td>
                        <td className="py-4 px-4 align-top text-slate-500 text-xs">
                          {item.notes}
                        </td>
                        <td className="py-4 px-4 align-top text-right font-mono text-slate-900">
                          {formatCurrency(parseFloat(item.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Totals */}
            <section className="flex justify-end">
              <div className="w-full sm:w-80 bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono text-slate-900">
                    {formatCurrency(parseFloat(quote.subtotal))}
                  </span>
                </div>
                {parseFloat(quote.discountPercentage) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Quote Discount ({formatPercentage(parseFloat(quote.discountPercentage))})</span>
                    <span className="font-mono">
                      −{formatCurrency(parseFloat(quote.discountAmount))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                  <span className="font-bold text-slate-900 text-lg">Total</span>
                  <span className="font-bold text-slate-900 text-2xl tracking-tight">
                    {formatCurrency(parseFloat(quote.totalAmount))}
                  </span>
                </div>
                <p className="text-xs text-center text-slate-500 mt-2">
                  All prices in USD.
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* Footer (outside document) */}
        <div className="mt-8 text-center text-sm text-[var(--text-tertiary)] flex flex-col items-center gap-2">
          <p>Powered by Monetizely Quoting Tool</p>
          <PrintButton />
        </div>
      </div>
    </div>
  );
}
