import { useQuery } from "@tanstack/react-query";
import { useTariffsClient } from "./clients-context";
import { keys } from "./query-keys";

/**
 * Active, public tariff catalog. Backs the `/settings/tariffs` page; the cache
 * is shared so any future entry points (upgrade modals, billing overview) hit
 * the same query. Long stale time — the catalog changes via deploys, not user
 * action.
 */
export function useTariffs() {
	const client = useTariffsClient();
	return useQuery({
		queryKey: keys.tariffs.list(),
		queryFn: () => client.list(),
		staleTime: 60 * 60_000,
	});
}
