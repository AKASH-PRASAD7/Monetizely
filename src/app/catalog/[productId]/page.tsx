import { getProduct } from "@/actions/catalog";
import { notFound } from "next/navigation";
import { ProductEditor } from "@/components/catalog/ProductEditor";

interface Props {
  params: Promise<{ productId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { productId } = await params;
  const product = await getProduct(productId);
  return {
    title: product ? `${product.name} — Catalog` : "Product Not Found",
  };
}

export default async function ProductEditorPage({ params }: Props) {
  const { productId } = await params;
  const product = await getProduct(productId);

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <ProductEditor product={product} />
    </div>
  );
}
