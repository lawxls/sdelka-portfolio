import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";
import type { CompaniesClient } from "./clients/companies-client";
import type { CompanyInfoClient } from "./clients/company-info-client";
import type { EmailsClient } from "./clients/emails-client";
import type { FoldersClient } from "./clients/folders-client";
import type { InvitationsClient } from "./clients/invitations-client";
import type { ItemsClient } from "./clients/items-client";
import type { NotificationsClient } from "./clients/notifications-client";
import type { ProfileClient } from "./clients/profile-client";
import type { SuppliersClient } from "./clients/suppliers-client";
import type { TasksClient } from "./clients/tasks-client";
import type { WorkspaceEmployeesClient } from "./clients/workspace-employees-client";
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

/** Build a fake `FoldersClient` for hook tests — methods default to throwing
 * "not implemented" so a test that forgets to stub a call fails loudly. */
export function fakeFoldersClient(overrides: Partial<FoldersClient> = {}): FoldersClient {
	const notImplemented = (method: string) => () => {
		throw new Error(`fakeFoldersClient.${method} not stubbed`);
	};
	return {
		list: notImplemented("list"),
		stats: notImplemented("stats"),
		create: notImplemented("create"),
		update: notImplemented("update"),
		delete: notImplemented("delete"),
		...overrides,
	};
}

/** Build a fake `NotificationsClient` for hook tests — methods default to
 * throwing "not implemented" so a test that forgets to stub a call fails
 * loudly. */
export function fakeNotificationsClient(overrides: Partial<NotificationsClient> = {}): NotificationsClient {
	const notImplemented = (method: string) => () => {
		throw new Error(`fakeNotificationsClient.${method} not stubbed`);
	};
	return {
		list: notImplemented("list"),
		markAsRead: notImplemented("markAsRead"),
		markAllAsRead: notImplemented("markAllAsRead"),
		...overrides,
	};
}

/** Build a fake `EmailsClient` for hook tests — methods default to throwing
 * "not implemented" so a test that forgets to stub a call fails loudly. */
export function fakeEmailsClient(overrides: Partial<EmailsClient> = {}): EmailsClient {
	const notImplemented = (method: string) => () => {
		throw new Error(`fakeEmailsClient.${method} not stubbed`);
	};
	return {
		list: notImplemented("list"),
		add: notImplemented("add"),
		delete: notImplemented("delete"),
		disable: notImplemented("disable"),
		...overrides,
	};
}

/** Build a fake `ProfileClient` for hook tests — methods default to throwing
 * "not implemented" so a test that forgets to stub a call fails loudly. */
export function fakeProfileClient(overrides: Partial<ProfileClient> = {}): ProfileClient {
	const notImplemented = (method: string) => () => {
		throw new Error(`fakeProfileClient.${method} not stubbed`);
	};
	return {
		me: notImplemented("me"),
		settings: notImplemented("settings"),
		update: notImplemented("update"),
		changePassword: notImplemented("changePassword"),
		...overrides,
	};
}

/** Build a fake `WorkspaceEmployeesClient` for hook tests — methods default to
 * throwing "not implemented" so a test that forgets to stub a call fails
 * loudly. */
export function fakeWorkspaceEmployeesClient(
	overrides: Partial<WorkspaceEmployeesClient> = {},
): WorkspaceEmployeesClient {
	const notImplemented = (method: string) => () => {
		throw new Error(`fakeWorkspaceEmployeesClient.${method} not stubbed`);
	};
	return {
		list: notImplemented("list"),
		get: notImplemented("get"),
		invite: notImplemented("invite"),
		update: notImplemented("update"),
		delete: notImplemented("delete"),
		updatePermissions: notImplemented("updatePermissions"),
		...overrides,
	};
}

/** Build a fake `InvitationsClient` for hook tests — methods default to
 * throwing "not implemented" so a test that forgets to stub a call fails
 * loudly. */
export function fakeInvitationsClient(overrides: Partial<InvitationsClient> = {}): InvitationsClient {
	const notImplemented = (method: string) => () => {
		throw new Error(`fakeInvitationsClient.${method} not stubbed`);
	};
	return {
		verify: notImplemented("verify"),
		...overrides,
	};
}

/** Build a fake `CompanyInfoClient` for hook tests — methods default to
 * throwing "not implemented" so a test that forgets to stub a call fails
 * loudly. */
export function fakeCompanyInfoClient(overrides: Partial<CompanyInfoClient> = {}): CompanyInfoClient {
	const notImplemented = (method: string) => () => {
		throw new Error(`fakeCompanyInfoClient.${method} not stubbed`);
	};
	return {
		get: notImplemented("get"),
		...overrides,
	};
}
