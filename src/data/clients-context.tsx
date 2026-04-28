import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { CompaniesClient } from "./clients/companies-client";

/**
 * Map of all data clients available to the app. As more domains migrate to the
 * seam, additional fields land here. Each is optional — a missing client
 * triggers a clear "client not provided" error if a hook tries to use it.
 */
export interface DataClients {
	companies?: CompaniesClient;
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
