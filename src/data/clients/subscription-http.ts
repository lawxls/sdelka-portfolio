import type { Subscription, TariffId, TopUpPayload, TopUpResult } from "../domains/subscription";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { SubscriptionClient } from "./subscription-client";

interface UsageBlock {
	used: number;
	limit: number | null;
	remaining: number | null;
}

interface WorkspaceTariffResponse {
	tariff: {
		slug: string;
		name: string;
	};
	usage: {
		monthlyInquiries: UsageBlock;
		dailyInquiries: UsageBlock;
		employees: UsageBlock;
		companies: UsageBlock;
		dailyEmails: UsageBlock;
	};
}

const KNOWN_TARIFF_IDS: readonly TariffId[] = ["none", "start", "business", "corporate"];

function toTariffId(slug: string): TariffId {
	return KNOWN_TARIFF_IDS.includes(slug as TariffId) ? (slug as TariffId) : "none";
}

function toSubscription(payload: WorkspaceTariffResponse): Subscription {
	const { monthlyInquiries, employees, dailyEmails } = payload.usage;
	return {
		tariff_id: toTariffId(payload.tariff.slug),
		tariff_name: payload.tariff.name,
		requests_used: monthlyInquiries.used,
		requests_limit: monthlyInquiries.limit ?? 0,
		employees_used: employees.used,
		employees_limit: employees.limit ?? 0,
		emails_sent: dailyEmails.used,
		emails_limit: dailyEmails.limit ?? 0,
	};
}

export function createHttpSubscriptionClient(http: HttpClient = defaultHttpClient): SubscriptionClient {
	return {
		current: async () => toSubscription(await http.get<WorkspaceTariffResponse>(`/workspaces/me/tariff/`)),
		topUp: (payload: TopUpPayload) => http.post<TopUpResult>(`/workspaces/me/tariff/top-up/`, { body: payload }),
	};
}
