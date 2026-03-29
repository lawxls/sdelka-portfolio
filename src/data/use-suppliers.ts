import { useQuery } from "@tanstack/react-query";
import { getSuppliers } from "./supplier-mock-data";

export function useSuppliers(itemId: string | null) {
	return useQuery({
		queryKey: ["suppliers", itemId],
		queryFn: () => getSuppliers(itemId as string),
		enabled: itemId !== null,
	});
}
