import type { Subscription, TariffId, TopUpPayload, TopUpResult } from "../domains/subscription";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { SubscriptionClient } from "./subscription-client";

interface WorkspaceTariffResponse {
	tariff: {
		slug: string;
		name: string;
	};
	usage: {
		monthlyUsed: number;
		monthlyLimit: number;
	};
}

const KNOWN_TARIFF_IDS: readonly TariffId[] = ["none", "start", "business", "corporate"];

function toTariffId(slug: string): TariffId {
	return KNOWN_TARIFF_IDS.includes(slug as TariffId) ? (slug as TariffId) : "none";
}

function toSubscription(payload: WorkspaceTariffResponse): Subscription {
	return {
		tariff_id: toTariffId(payload.tariff.slug),
		tariff_name: payload.tariff.name,
		requests_used: payload.usage.monthlyUsed,
		requests_limit: payload.usage.monthlyLimit,
		employees_used: 0,
		employees_limit: 0,
		emails_sent: 0,
		emails_limit: 0,
	};
}

export function createHttpSubscriptionClient(http: HttpClient = defaultHttpClient): SubscriptionClient {
	return {
		current: async () => toSubscription(await http.get<WorkspaceTariffResponse>(`/workspaces/me/tariff/`)),
		topUp: (payload: TopUpPayload) => http.post<TopUpResult>(`/workspaces/me/tariff/top-up/`, { body: payload }),
	};
}
