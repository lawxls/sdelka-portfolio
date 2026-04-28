import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { CompaniesClient } from "./clients/companies-client";
import type { ItemsClient } from "./clients/items-client";
import type { SuppliersClient } from "./clients/suppliers-client";

/**
 * Map of all data clients available to the app. As more domains migrate to the
 * seam, additional fields land here. Each is optional — a missing client
 * triggers a clear "client not provided" error if a hook tries to use it.
 */
export interface DataClients {
	companies?: CompaniesClient;
	items?: ItemsClient;
	suppliers?: SuppliersClient;
}

const DataClientsContext = createContext<DataClients | null>(null);

export interface DataClientsProviderProps {
	clients: DataClients;
	children: ReactNode;
}

export function DataClientsProvider({ clients, children }: DataClientsProviderProps) {
	const value = useMemo(() => clients, [clients]);
	return <DataClientsContext.Provider value={value}>{children}</DataClientsContext.Provider>;
}

function useClients(): DataClients {
	const ctx = useContext(DataClientsContext);
	if (!ctx) throw new Error("DataClientsProvider not mounted");
	return ctx;
}

export function useCompaniesClient(): CompaniesClient {
	const { companies } = useClients();
	if (!companies) throw new Error("companies client not provided");
	return companies;
}

export function useItemsClient(): ItemsClient {
	const { items } = useClients();
	if (!items) throw new Error("items client not provided");
	return items;
}

export function useSuppliersClient(): SuppliersClient {
	const { suppliers } = useClients();
	if (!suppliers) throw new Error("suppliers client not provided");
	return suppliers;
}
