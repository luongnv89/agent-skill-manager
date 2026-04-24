import { ShoppingCart } from "lucide-react";
import { useBundleCart } from "../hooks/useBundleCart.jsx";

/**
 * Header pill that shows the current bundle-cart count and opens
 * the builder dialog on click. Rendered in `Header.jsx` so it stays
 * visible on every route (Skills, Bundles, Docs, Changelog).
 */
export default function BundleCartButton({ onOpen }) {
  const { items } = useBundleCart();
  const count = items.length;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={
        count === 0
          ? "Open bundle builder"
          : `Open bundle builder (${count} ${count === 1 ? "skill" : "skills"} in cart)`
      }
      className="flex items-center gap-1.5 text-[var(--fg-dim)] hover:text-[var(--brand)] hover:border-[var(--brand)] text-sm px-2.5 py-1 border border-[var(--border)] rounded-md transition-colors"
      title="Bundle builder"
    >
      <ShoppingCart className="w-4 h-4" aria-hidden="true" />
      <span className="hidden sm:inline">Bundle</span>
      {count > 0 && (
        <span
          className="font-mono text-[11px] text-[var(--brand)]"
          data-testid="bundle-cart-count"
        >
          {count}
        </span>
      )}
    </button>
  );
}
