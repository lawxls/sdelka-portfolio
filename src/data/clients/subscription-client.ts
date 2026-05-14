import type { Subscription, TopUpPayload, TopUpResult } from "../domains/subscription";

/**
 * Public seam for the subscription domain. `current` returns the active
 * workspace's quota snapshot (tariff, requests used/limit, employees used/limit,
 * emails sent). `topUp` purchases extra requests at the current tariff's
 * per-request rate and returns the updated limit.
 */
export interface SubscriptionClient {
	current(): Promise<Subscription>;
	topUp(payload: TopUpPayload): Promise<TopUpResult>;
}
