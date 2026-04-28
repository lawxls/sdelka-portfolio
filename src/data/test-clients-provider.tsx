import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";
import type { CompaniesClient } from "./clients/companies-client";
import type { ItemsClient } from "./clients/items-client";
import type { SuppliersClient } from "./clients/suppliers-client";
import type { TasksClient } from "./clients/tasks-client";
import { type DataClients, DataClientsProvider } from "./clients-context";

/**
 * Test wrapper that mirrors the production composition root: a QueryClient and
 * a `DataClientsProvider` with whatever clients the test wants to inject.
 * Hook tests pass fake clients (Layer A); component tests pass in-memory
 * adapters seeded inline.
 */
export interface TestClientsProviderProps {
	queryClient: QueryClient;
	clients: DataClients;
	children: ReactNode;
}

export function TestClientsProvider({ queryClient, clients, children }: TestClientsProviderProps): ReactElement {
	return (
		<QueryClientProvider client={queryClient}>
			<DataClientsProvider clients={clients}>{children}</DataClientsProvider>
		</QueryClientProvider>
	);
}

/** Build a fake `CompaniesClient` for hook tests — methods default to throwing
 * "not implemented" so a test that forgets to stub a call fails loudly. */
export function fakeCompaniesClient(overrides: Partial<CompaniesClient> = {}): CompaniesClient {
	const notImplemented = (method: string) => () => {
		throw new Error(`fakeCompaniesClient.${method} not stubbed`);
	};
	return {
		list: notImplemented("list"),
		listAll: notImplemented("listAll"),
		get: notImplemented("get"),
		create: notImplemented("create"),
		update: notImplemented("update"),
		delete: notImplemented("delete"),
		createAddress: notImplemented("createAddress"),
		updateAddress: notImplemented("updateAddress"),
		deleteAddress: notImplemented("deleteAddress"),
		createEmployee: notImplemented("createEmployee"),
		updateEmployee: notImplemented("updateEmployee"),
		deleteEmployee: notImplemented("deleteEmployee"),
		updateEmployeePermissions: notImplemented("updateEmployeePermissions"),
		...overrides,
	};
}

/** Build a fake `ItemsClient` for hook tests — methods default to throwing
 * "not implemented" so a test that forgets to stub a call fails loudly. */
export function fakeItemsClient(overrides: Partial<ItemsClient> = {}): ItemsClient {
	const notImplemented = (method: string) => () => {
		throw new Error(`fakeItemsClient.${method} not stubbed`);
	};
	return {
		list: notImplemented("list"),
		listAll: notImplemented("listAll"),
		totals: notImplemented("totals"),
		get: notImplemented("get"),
		create: notImplemented("create"),
		update: notImplemented("update"),
		delete: notImplemented("delete"),
		archive: notImplemented("archive"),
		export: notImplemented("export"),
		...overrides,
	};
}

/** Build a fake `SuppliersClient` for hook tests — methods default to throwing
 * "not implemented" so a test that forgets to stub a call fails loudly. */
export function fakeSuppliersClient(overrides: Partial<SuppliersClient> = {}): SuppliersClient {
	const notImplemented = (method: string) => () => {
		throw new Error(`fakeSuppliersClient.${method} not stubbed`);
	};
	return {
		list: notImplemented("list"),
		listForItem: notImplemented("listForItem"),
		listAll: notImplemented("listAll"),
		get: notImplemented("get"),
		getById: notImplemented("getById"),
		quotesByInn: notImplemented("quotesByInn"),
		archive: notImplemented("archive"),
		unarchive: notImplemented("unarchive"),
		delete: notImplemented("delete"),
		sendRequest: notImplemented("sendRequest"),
		selectSupplier: notImplemented("selectSupplier"),
		selectSupplierByInn: notImplemented("selectSupplierByInn"),
		sendMessage: notImplemented("sendMessage"),
		...overrides,
	};
}

/** Build a fake `TasksClient` for hook tests — methods default to throwing
 * "not implemented" so a test that forgets to stub a call fails loudly. */
export function fakeTasksClient(overrides: Partial<TasksClient> = {}): TasksClient {
	const notImplemented = (method: string) => () => {
		throw new Error(`fakeTasksClient.${method} not stubbed`);
	};
	return {
		listAll: notImplemented("listAll"),
		list: notImplemented("list"),
		board: notImplemented("board"),
		get: notImplemented("get"),
		changeStatus: notImplemented("changeStatus"),
		uploadAttachments: notImplemented("uploadAttachments"),
		deleteAttachment: notImplemented("deleteAttachment"),
		...overrides,
	};
}
