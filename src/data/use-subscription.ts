import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSubscriptionClient } from "./clients-context";
import type { Subscription, TopUpPayload, TopUpResult } from "./domains/subscription";
import { keys } from "./query-keys";

/**
 * Active workspace subscription snapshot — tariff name, requests used/limit,
 * employee headcount, emails sent. Profile page reads this for the «Подписка»
 * block; the top-up dialog reads `tariff_id` to look up the per-request rate.
 */
export function useSubscription() {
	const client = useSubscriptionClient();
	return useQuery({
		queryKey: keys.subscription.current(),
		queryFn: () => client.current(),
		staleTime: 5 * 60_000,
	});
}

export function useTopUpRequests() {
	const client = useSubscriptionClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: TopUpPayload) => client.topUp(payload),
		onSuccess: (result: TopUpResult) => {
			const key = keys.subscription.current();
			const prev = queryClient.getQueryData<Subscription>(key);
			if (prev) {
				queryClient.setQueryData<Subscription>(key, { ...prev, requests_limit: result.requests_limit });
			}
		},
	});
}
