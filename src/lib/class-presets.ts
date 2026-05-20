export const OVERFLOW_ROW_BTN =
	"flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Subtle surface tint used for drawer header, footer, and form-card chrome —
 * slightly darker than `--muted` so chrome reads as a layer above the popover
 * body in both themes. */
export const SURFACE_TINT =
	"bg-[color-mix(in_oklch,var(--muted)_99%,var(--foreground)_0.4%)] dark:bg-[color-mix(in_oklch,var(--muted)_95%,var(--foreground)_1.5%)]";
