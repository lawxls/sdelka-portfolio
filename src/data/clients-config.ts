import { createHttpCompaniesClient } from "./clients/companies-http";
import { createHttpCompanyInfoClient } from "./clients/company-info-http";
import { createInMemoryCompanyInfoClient } from "./clients/company-info-in-memory";
import { createHttpEmailsClient } from "./clients/emails-http";
import { createInMemoryEmailsClient } from "./clients/emails-in-memory";
import { createInMemoryEmployeesClient } from "./clients/employees-in-memory";
import { createHttpFoldersClient } from "./clients/folders-http";
import { createHttpGeneratedQuestionsClient } from "./clients/generated-questions-http";
import { createHttpItemsClient } from "./clients/items-http";
import { createInMemoryItemsClient } from "./clients/items-in-memory";
import { createHttpNotificationsClient } from "./clients/notifications-http";
import { createInMemoryNotificationsClient } from "./clients/notifications-in-memory";
import { createHttpProcurementInquiriesClient } from "./clients/procurement-inquiries-http";
import { createHttpProfileClient } from "./clients/profile-http";
import { createInMemoryProfileClient } from "./clients/profile-in-memory";
import { createHttpSessionClient } from "./clients/session-http";
import { createInMemorySessionClient } from "./clients/session-in-memory";
import { createHttpSubscriptionClient } from "./clients/subscription-http";
import { createInMemorySubscriptionClient } from "./clients/subscription-in-memory";
import { createHttpSuppliersClient } from "./clients/suppliers-http";
import { createInMemorySuppliersClient } from "./clients/suppliers-in-memory";
import type { TasksClient } from "./clients/tasks-client";
import { createHttpTasksClient } from "./clients/tasks-http";
import { createInMemoryTasksClient } from "./clients/tasks-in-memory";
import { createHttpWorkspaceEmployeesClient } from "./clients/workspace-employees-http";
import { createInMemoryWorkspaceEmployeesClient } from "./clients/workspace-employees-in-memory";
import { createHttpWorkspaceSettingsClient } from "./clients/workspace-settings-http";
import type { DataClients } from "./clients-context";

type AdapterMode = "memory" | "http";

interface AdapterConfig {
	items: AdapterMode;
	suppliers: AdapterMode;
	tasks: AdapterMode;
	notifications: AdapterMode;
	emails: AdapterMode;
	profile: AdapterMode;
	workspaceEmployees: AdapterMode;
	companyInfo: AdapterMode;
	session: AdapterMode;
	subscription: AdapterMode;
}

/**
 * Per-entity adapter mode resolved at boot. Default is "memory" so local dev
 * continues to work while HTTP adapters are under construction. Each entity's
 * mode can be flipped via env vars without touching code in other entities.
 *
 * Companies are unconditionally HTTP — production paths can never fall back to
 * fake data. The closure-isolated in-memory adapter survives as a test fake.
 */
function resolveConfig(): AdapterConfig {
	const env = (typeof import.meta !== "undefined" ? import.meta.env : {}) as Record<string, unknown>;
	function read(key: string): AdapterMode {
		return env[key] === "http" ? "http" : "memory";
	}
	return {
		items: read("VITE_DATA_ITEMS"),
		suppliers: read("VITE_DATA_SUPPLIERS"),
		tasks: read("VITE_DATA_TASKS"),
		notifications: read("VITE_DATA_NOTIFICATIONS"),
		emails: read("VITE_DATA_EMAILS"),
		profile: read("VITE_DATA_PROFILE"),
		workspaceEmployees: read("VITE_DATA_WORKSPACE_EMPLOYEES"),
		companyInfo: read("VITE_DATA_COMPANY_INFO"),
		session: read("VITE_DATA_SESSION"),
		subscription: read("VITE_DATA_SUBSCRIPTION"),
	};
}

/**
 * Build the production composition root: one client per migrated entity, picked
 * by adapter mode. Tests bypass this and pass their own `DataClients` map to
 * the provider.
 *
 * Companies + Addresses are HTTP unconditionally — the workspace-employees
 * adapter's `getCompanySummaries` callback reads from the same HTTP client so
 * an invitee's company chip stays coherent with the real backend.
 */
/** Compose the tasks client. In HTTP mode, attachment upload + delete fall
 * back to the in-memory adapter because the backend hasn't exposed those
 * endpoints yet. Everything else routes to HTTP. */
function buildTasksClient(mode: AdapterMode): TasksClient {
	if (mode !== "http") return createInMemoryTasksClient();
	const http = createHttpTasksClient();
	const memory = createInMemoryTasksClient();
	return {
		...http,
		uploadAttachments: memory.uploadAttachments.bind(memory),
		deleteAttachment: memory.deleteAttachment.bind(memory),
	};
}

export function buildDataClients(): DataClients {
	const config = resolveConfig();
	const companies = createHttpCompaniesClient();
	return {
		companies,
		employees: createInMemoryEmployeesClient(),
		items: config.items === "http" ? createHttpItemsClient() : createInMemoryItemsClient(),
		suppliers: config.suppliers === "http" ? createHttpSuppliersClient() : createInMemorySuppliersClient(),
		tasks: buildTasksClient(config.tasks),
		procurementInquiries: createHttpProcurementInquiriesClient(),
		folders: createHttpFoldersClient(),
		generatedQuestions: createHttpGeneratedQuestionsClient(),
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
		workspaceSettings: createHttpWorkspaceSettingsClient(),
		companyInfo: config.companyInfo === "http" ? createHttpCompanyInfoClient() : createInMemoryCompanyInfoClient(),
		session: config.session === "http" ? createHttpSessionClient() : createInMemorySessionClient(),
		subscription: config.subscription === "http" ? createHttpSubscriptionClient() : createInMemorySubscriptionClient(),
	};
}
