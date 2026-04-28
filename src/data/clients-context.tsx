import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { CompaniesClient } from "./clients/companies-client";
import type { EmailsClient } from "./clients/emails-client";
import type { FoldersClient } from "./clients/folders-client";
import type { ItemsClient } from "./clients/items-client";
import type { NotificationsClient } from "./clients/notifications-client";
import type { SuppliersClient } from "./clients/suppliers-client";
import type { TasksClient } from "./clients/tasks-client";

/**
 * Map of all data clients available to the app. As more domains migrate to the
 * seam, additional fields land here. Each is optional — a missing client
 * triggers a clear "client not provided" error if a hook tries to use it.
 */
export interface DataClients {
	companies?: CompaniesClient;
	items?: ItemsClient;
	suppliers?: SuppliersClient;
	tasks?: TasksClient;
	folders?: FoldersClient;
	notifications?: NotificationsClient;
	emails?: EmailsClient;
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

export function useTasksClient(): TasksClient {
	const { tasks } = useClients();
	if (!tasks) throw new Error("tasks client not provided");
	return tasks;
}

export function useFoldersClient(): FoldersClient {
	const { folders } = useClients();
	if (!folders) throw new Error("folders client not provided");
	return folders;
}

export function useNotificationsClient(): NotificationsClient {
	const { notifications } = useClients();
	if (!notifications) throw new Error("notifications client not provided");
	return notifications;
}

export function useEmailsClient(): EmailsClient {
	const { emails } = useClients();
	if (!emails) throw new Error("emails client not provided");
	return emails;
}
