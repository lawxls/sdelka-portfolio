import { createHttpCompaniesClient } from "./clients/companies-http";
import { createInMemoryCompaniesClient } from "./clients/companies-in-memory";
import { createHttpCompanyInfoClient } from "./clients/company-info-http";
import { createInMemoryCompanyInfoClient } from "./clients/company-info-in-memory";
import { createHttpEmailsClient } from "./clients/emails-http";
import { createInMemoryEmailsClient } from "./clients/emails-in-memory";
import { createHttpFoldersClient } from "./clients/folders-http";
import { createInMemoryFoldersClient } from "./clients/folders-in-memory";
import { createHttpInvitationsClient } from "./clients/invitations-http";
import { createInMemoryInvitationsClient } from "./clients/invitations-in-memory";
import { createHttpItemsClient } from "./clients/items-http";
import { createInMemoryItemsClient } from "./clients/items-in-memory";
import { createHttpNotificationsClient } from "./clients/notifications-http";
import { createInMemoryNotificationsClient } from "./clients/notifications-in-memory";
import { createHttpProfileClient } from "./clients/profile-http";
import { createInMemoryProfileClient } from "./clients/profile-in-memory";
import { createHttpSuppliersClient } from "./clients/suppliers-http";
import { createInMemorySuppliersClient } from "./clients/suppliers-in-memory";
import { createHttpTasksClient } from "./clients/tasks-http";
import { createInMemoryTasksClient } from "./clients/tasks-in-memory";
import { createHttpWorkspaceEmployeesClient } from "./clients/workspace-employees-http";
import { createInMemoryWorkspaceEmployeesClient } from "./clients/workspace-employees-in-memory";
import type { DataClients } from "./clients-context";

type AdapterMode = "memory" | "http";

interface AdapterConfig {
	companies: AdapterMode;
	items: AdapterMode;
	suppliers: AdapterMode;
	tasks: AdapterMode;
	folders: AdapterMode;
	notifications: AdapterMode;
	emails: AdapterMode;
	profile: AdapterMode;
	workspaceEmployees: AdapterMode;
	invitations: AdapterMode;
	companyInfo: AdapterMode;
}

/**
 * Per-entity adapter mode resolved at boot. Default is "memory" so local dev
 * continues to work while HTTP adapters are under construction. Each entity's
 * mode can be flipped via env vars without touching code in other entities.
 */
function resolveConfig(): AdapterConfig {
	const env = (typeof import.meta !== "undefined" ? import.meta.env : {}) as Record<string, unknown>;
	function read(key: string): AdapterMode {
		return env[key] === "http" ? "http" : "memory";
	}
	return {
		companies: read("VITE_DATA_COMPANIES"),
		items: read("VITE_DATA_ITEMS"),
		suppliers: read("VITE_DATA_SUPPLIERS"),
		tasks: read("VITE_DATA_TASKS"),
		folders: read("VITE_DATA_FOLDERS"),
		notifications: read("VITE_DATA_NOTIFICATIONS"),
		emails: read("VITE_DATA_EMAILS"),
		profile: read("VITE_DATA_PROFILE"),
		workspaceEmployees: read("VITE_DATA_WORKSPACE_EMPLOYEES"),
		invitations: read("VITE_DATA_INVITATIONS"),
		companyInfo: read("VITE_DATA_COMPANY_INFO"),
	};
}

/**
 * Build the production composition root: one client per migrated entity, picked
 * by adapter mode. Tests bypass this and pass their own `DataClients` map to
 * the provider.
 *
 * The companies client is constructed first so the workspace-employees adapter
 * can read company summaries from the same active source on invite, keeping
 * cross-domain state coherent regardless of which adapter mode each entity uses.
 */
export function buildDataClients(): DataClients {
	const config = resolveConfig();
	const companies = config.companies === "http" ? createHttpCompaniesClient() : createInMemoryCompaniesClient();
	return {
		companies,
		items: config.items === "http" ? createHttpItemsClient() : createInMemoryItemsClient(),
		suppliers: config.suppliers === "http" ? createHttpSuppliersClient() : createInMemorySuppliersClient(),
		tasks: config.tasks === "http" ? createHttpTasksClient() : createInMemoryTasksClient(),
		folders: config.folders === "http" ? createHttpFoldersClient() : createInMemoryFoldersClient(),
		notifications:
			config.notifications === "http" ? createHttpNotificationsClient() : createInMemoryNotificationsClient(),
		emails: config.emails === "http" ? createHttpEmailsClient() : createInMemoryEmailsClient(),
		profile: config.profile === "http" ? createHttpProfileClient() : createInMemoryProfileClient(),
		workspaceEmployees:
			config.workspaceEmployees === "http"
				? createHttpWorkspaceEmployeesClient()
				: createInMemoryWorkspaceEmployeesClient({
						getCompanySummaries: async (ids) => {
							if (ids.length === 0) return [];
							const all = await companies.listAll();
							const set = new Set(ids);
							return all.filter((c) => set.has(c.id));
						},
					}),
		invitations: config.invitations === "http" ? createHttpInvitationsClient() : createInMemoryInvitationsClient(),
		companyInfo: config.companyInfo === "http" ? createHttpCompanyInfoClient() : createInMemoryCompanyInfoClient(),
	};
}
