/** Generate the next available T-prefixed tender slug.
 *
 * Format: `T-NNN` zero-padded to 3 digits (T-001..T-999); 4+ digits are
 * rendered naturally (T-1000, T-1001…). Always returns the lowest unused
 * positive integer (so deletes leave reusable gaps).
 *
 * Centralizing slug generation here means the `T-NNN` shape is the only
 * place to change if the format ever moves. */
export function generateTenderSlug(existingSlugs: readonly string[]): string {
	const used = new Set<number>();
	for (const slug of existingSlugs) {
		const n = parseSlug(slug);
		if (n != null) used.add(n);
	}
	let n = 1;
	while (used.has(n)) n += 1;
	return formatSlug(n);
}

function parseSlug(slug: string): number | null {
	const m = /^T-(\d+)$/.exec(slug);
	if (!m) return null;
	const n = Number(m[1]);
	return Number.isInteger(n) && n > 0 ? n : null;
}

function formatSlug(n: number): string {
	return `T-${String(n).padStart(3, "0")}`;
}
