import type { Subscription, TopUpPayload, TopUpResult } from "../domains/subscription";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { SubscriptionClient } from "./subscription-client";

export function createHttpSubscriptionClient(http: HttpClient = defaultHttpClient): SubscriptionClient {
	return {
		current: () => http.get<Subscription>(`/billing/subscription/`),
		topUp: (payload: TopUpPayload) => http.post<TopUpResult>(`/billing/subscription/top-up/`, { body: payload }),
	};
}
