import { getProducts } from "@/actions/catalog";
import { QuoteWizard } from "@/components/quotes/QuoteWizard";

export const metadata = {
  title: "New Quote — Monetizely",
  description: "Build a new customer quote.",
};

export default async function NewQuotePage() {
  let products: Awaited<ReturnType<typeof getProducts>> = [];

  try {
    products = await getProducts();
  } catch {
    // DB not connected
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <QuoteWizard products={products} />
    </div>
  );
}
