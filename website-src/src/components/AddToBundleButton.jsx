import { Check, Plus } from "lucide-react";
import { useBundleCart } from "../hooks/useBundleCart.jsx";
import { cn } from "../lib/cn.js";

/**
 * Toggle button that adds/removes a skill from the bundle cart.
 *
 * The `compact` variant is a 24px icon button used inside the
 * `SkillListItem` card. Because that card is wrapped in a
 * `<Link>`, the click handler must stop propagation and prevent
 * default — otherwise the browser navigates to the skill detail
 * route on click instead of toggling cart membership.
 *
 * The `default` variant is a full button for the `SkillDetail`
 * action area.
 */
export default function AddToBundleButton({ skill, compact = false }) {
  const { add, remove, has } = useBundleCart();
  if (!skill || !skill.id || !skill.installUrl) return null;
  const inCart = has(skill.id);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCart) remove(skill.id);
    else add(skill);
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={
          inCart
            ? `Remove ${skill.name} from bundle`
            : `Add ${skill.name} to bundle`
        }
        aria-pressed={inCart}
        className={cn(
          "shrink-0 inline-flex items-center justify-center rounded h-6 w-6 text-[11px] transition-colors",
          inCart
            ? "bg-[var(--brand)] text-[var(--bg)] hover:bg-[var(--brand-dim)]"
            : "border border-[var(--border)] text-[var(--fg-dim)] hover:text-[var(--brand)] hover:border-[var(--brand)]",
        )}
        title={inCart ? "In bundle — click to remove" : "Add to bundle"}
      >
        {inCart ? (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={inCart}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors h-9 px-3 py-2",
        inCart
          ? "bg-[var(--brand)] text-[var(--bg)] hover:bg-[var(--brand-dim)]"
          : "border border-[var(--border)] bg-transparent text-[var(--fg-dim)] hover:border-[var(--brand)] hover:text-[var(--fg)]",
      )}
    >
      {inCart ? (
        <>
          <Check className="h-4 w-4" aria-hidden="true" />
          In bundle
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add to bundle
        </>
      )}
    </button>
  );
}
