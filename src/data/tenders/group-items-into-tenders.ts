import type { NewItemInput } from "../types";

export interface TenderProposal {
	/** Suggested tender name (derived from the group's first position name). */
	name: string;
	items: NewItemInput[];
}

/** Mock heuristic: group parsed positions into proposed tenders by name affinity.
 *
 * This is a stand-in for the real backend AI. The heuristic groups by the first
 * meaningful word in the position name (case-insensitive); items without a
 * shared first word land in their own single-item tenders. Folder hints, once
 * the AI is wired up, will come from the parent tender (the
 * CreateTenderDrawer flow in slice #8 lets the user pick the category for
 * each proposed group).
 *
 * Pinned by tests so demo grouping behavior stays stable across refactors;
 * re-baselined when the real AI replaces the mock. */
export function groupItemsIntoTenders(items: readonly NewItemInput[]): TenderProposal[] {
	const groups = new Map<string, NewItemInput[]>();
	const order: string[] = [];

	for (const item of items) {
		const key = groupKey(item.name);
		const existing = groups.get(key);
		if (existing) {
			existing.push(item);
		} else {
			groups.set(key, [item]);
			order.push(key);
		}
	}

	return order.map((key) => {
		const groupItems = groups.get(key) ?? [];
		const first = groupItems[0];
		return {
			name: first?.name ?? key,
			items: groupItems,
		};
	});
}

const SKIP_TOKENS = new Set(["", "и", "для", "с", "от", "в", "на"]);

function groupKey(name: string): string {
	const tokens = name.trim().toLowerCase().split(/\s+/).filter(Boolean);
	for (const token of tokens) {
		if (!SKIP_TOKENS.has(token)) return token;
	}
	return name.trim().toLowerCase() || name;
}
