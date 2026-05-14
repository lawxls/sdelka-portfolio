import { getPricePerRequest, type Subscription, type TopUpPayload, type TopUpResult } from "../domains/subscription";
import { delay } from "../mock-utils";
import type { SubscriptionClient } from "./subscription-client";

const DEFAULT_SUBSCRIPTION: Subscription = {
	tariff_id: "business",
	tariff_name: "Бизнес",
	requests_used: 12,
	requests_limit: 15,
	employees_used: 3,
	employees_limit: 5,
	emails_sent: 184,
};

export interface InMemorySubscriptionOptions {
	subscription?: Subscription;
}

export function createInMemorySubscriptionClient(options?: InMemorySubscriptionOptions): SubscriptionClient {
	let state: Subscription = { ...(options?.subscription ?? DEFAULT_SUBSCRIPTION) };

	return {
		async current(): Promise<Subscription> {
			await delay();
			return { ...state };
		},

		async topUp(payload: TopUpPayload): Promise<TopUpResult> {
			await delay();
			if (payload.quantity <= 0) throw new Error("quantity must be positive");
			const pricePerRequest = getPricePerRequest(state.tariff_id);
			state = { ...state, requests_limit: state.requests_limit + payload.quantity };
			return {
				requests_added: payload.quantity,
				requests_limit: state.requests_limit,
				total_price: pricePerRequest * payload.quantity,
			};
		},
	};
}
