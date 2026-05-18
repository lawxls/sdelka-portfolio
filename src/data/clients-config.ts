import { createHttpCompaniesClient } from "./clients/companies-http";
import { createHttpCompanyInfoClient } from "./clients/company-info-http";
import { createHttpEmailsClient } from "./clients/emails-http";
import { createInMemoryEmployeesClient } from "./clients/employees-in-memory";
import { createHttpFoldersClient } from "./clients/folders-http";
import { createHttpGeneratedQuestionsClient } from "./clients/generated-questions-http";
import { createHttpItemsClient } from "./clients/items-http";
import { createHttpNotificationsClient } from "./clients/notifications-http";
import { createHttpProcurementInquiriesClient } from "./clients/procurement-inquiries-http";
import { createHttpProfileClient } from "./clients/profile-http";
import { createHttpSessionClient } from "./clients/session-http";
import { createHttpSubscriptionClient } from "./clients/subscription-http";
import { createHttpSuppliersClient } from "./clients/suppliers-http";
import { createHttpTasksClient } from "./clients/tasks-http";
import { createHttpWorkspaceEmployeesClient } from "./clients/workspace-employees-http";
import { createHttpWorkspaceSettingsClient } from "./clients/workspace-settings-http";
import type { DataClients } from "./clients-context";

/**
 * Build the production composition root: every entity routes to its real HTTP
 * client. In-memory adapters exist only as test fakes (see
 * `test-clients-provider.tsx`) and must never be reachable from this function.
 *
 * Single exception: `employees` has no HTTP client yet, so the in-memory
 * adapter is wired in here until the backend ships the endpoints. Replace with
 * `createHttpEmployeesClient()` as soon as that lands.
 */
export function buildDataClients(): DataClients {
	return {
		companies: createHttpCompaniesClient(),
		employees: createInMemoryEmployeesClient(),
		items: createHttpItemsClient(),
		suppliers: createHttpSuppliersClient(),
		tasks: createHttpTasksClient(),
		procurementInquiries: createHttpProcurementInquiriesClient(),
		folders: createHttpFoldersClient(),
		generatedQuestions: createHttpGeneratedQuestionsClient(),
		notifications: createHttpNotificationsClient(),
		emails: createHttpEmailsClient(),
		profile: createHttpProfileClient(),
		workspaceEmployees: createHttpWorkspaceEmployeesClient(),
		workspaceSettings: createHttpWorkspaceSettingsClient(),
		companyInfo: createHttpCompanyInfoClient(),
		session: createHttpSessionClient(),
		subscription: createHttpSubscriptionClient(),
	};
}
