/**
 * Subscription domain — quotas and tariff snapshot for the active workspace.
 * Backs `useSubscription` and the «Подписка» block on the profile page. A
 * single-row domain like profile — every operation works on the active
 * session's workspace, no list shape.
 *
 * `tariff_id` keys into the pricing table for the top-up dialog (price per
 * extra request depends on the active tariff).
 */
export type TariffId = "none" | "start" | "business" | "corporate";

export interface Subscription {
	tariff_id: TariffId;
	tariff_name: string;
	requests_used: number;
	requests_limit: number;
	employees_used: number;
	employees_limit: number;
	emails_sent: number;
}

export interface TopUpPayload {
	quantity: number;
}

export interface TopUpResult {
	requests_added: number;
	requests_limit: number;
	total_price: number;
}

/**
 * Per-tariff price for additional requests purchased on top of the plan limit.
 * Lives on the domain (not the adapter) so the UI and both adapters share one
 * source of truth — swapping adapters does not change pricing. The `none` tier
 * is the "no subscription" rate so the dialog can quote a price even for a
 * trial user.
 */
const PRICE_PER_REQUEST: Record<TariffId, number> = {
	none: 4_900,
	start: 3_900,
	business: 2_900,
	corporate: 2_900,
};

export function getPricePerRequest(tariffId: TariffId): number {
	return PRICE_PER_REQUEST[tariffId];
}
