import type { Metadata } from "next";

// generateMetadata runs server-side — fetches the product name and description
// so Google sees a meaningful title per product page, not a generic one.
export async function generateMetadata(
  { params }: { params: Promise<{ productId: string }> }
): Promise<Metadata> {
  const { productId } = await params;

  try {
    // Use absolute URL — required in server components / metadata functions
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://astrotarot.in";
    const res = await fetch(`${baseUrl}/api/products`, { next: { revalidate: 3600 } });
    const data = await res.json();
    const product = (data.products ?? []).find(
      (p: { id: string; name: string; description: string | null; price: number }) =>
        p.id === productId
    );

    if (product) {
      const desc = product.description
        ? `${product.description.slice(0, 140)}…`
        : `Buy ${product.name} from AstroTarot. ₹${product.price}. Curated by Ishita Nag.`;

      return {
        title: `${product.name} — AstroTarot Shop`,
        description: desc,
      };
    }
  } catch {
    // Fallback — product fetch failed, use generic title
  }

  return {
    title: "Product — AstroTarot Shop",
    description: "Explore our curated range of crystals and spiritual tools at AstroTarot.",
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}