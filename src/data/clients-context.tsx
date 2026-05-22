import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { CompaniesClient } from "./clients/companies-client";
import type { CompanyInfoClient } from "./clients/company-info-client";
import type { EmailsClient } from "./clients/emails-client";
import type { FoldersClient } from "./clients/folders-client";
import type { GeneratedEmailClient } from "./clients/generated-email-client";
import type { GeneratedQuestionsClient } from "./clients/generated-questions-client";
import type { ItemsClient } from "./clients/items-client";
import type { NotificationsClient } from "./clients/notifications-client";
import type { ProcurementInquiriesClient } from "./clients/procurement-inquiries-client";
import type { ProfileClient } from "./clients/profile-client";
import type { SessionClient } from "./clients/session-client";
import type { SubscriptionClient } from "./clients/subscription-client";
import type { SuppliersClient } from "./clients/suppliers-client";
import type { TariffsClient } from "./clients/tariffs-client";
import type { TasksClient } from "./clients/tasks-client";
import type { WorkspaceEmployeesClient } from "./clients/workspace-employees-client";
import type { WorkspaceSettingsClient } from "./clients/workspace-settings-client";

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
	procurementInquiries?: ProcurementInquiriesClient;
	folders?: FoldersClient;
	generatedQuestions?: GeneratedQuestionsClient;
	generatedEmail?: GeneratedEmailClient;
	notifications?: NotificationsClient;
	emails?: EmailsClient;
	profile?: ProfileClient;
	workspaceEmployees?: WorkspaceEmployeesClient;
	workspaceSettings?: WorkspaceSettingsClient;
	companyInfo?: CompanyInfoClient;
	session?: SessionClient;
	subscription?: SubscriptionClient;
	tariffs?: TariffsClient;
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

export function useProcurementInquiriesClient(): ProcurementInquiriesClient {
	const { procurementInquiries } = useClients();
	if (!procurementInquiries) throw new Error("procurementInquiries client not provided");
	return procurementInquiries;
}

export function useFoldersClient(): FoldersClient {
	const { folders } = useClients();
	if (!folders) throw new Error("folders client not provided");
	return folders;
}

export function useGeneratedQuestionsClient(): GeneratedQuestionsClient {
	const { generatedQuestions } = useClients();
	if (!generatedQuestions) throw new Error("generatedQuestions client not provided");
	return generatedQuestions;
}

export function useGeneratedEmailClient(): GeneratedEmailClient {
	const { generatedEmail } = useClients();
	if (!generatedEmail) throw new Error("generatedEmail client not provided");
	return generatedEmail;
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

export function useProfileClient(): ProfileClient {
	const { profile } = useClients();
	if (!profile) throw new Error("profile client not provided");
	return profile;
}

export function useWorkspaceEmployeesClient(): WorkspaceEmployeesClient {
	const { workspaceEmployees } = useClients();
	if (!workspaceEmployees) throw new Error("workspace-employees client not provided");
	return workspaceEmployees;
}

export function useWorkspaceSettingsClient(): WorkspaceSettingsClient {
	const { workspaceSettings } = useClients();
	if (!workspaceSettings) throw new Error("workspace-settings client not provided");
	return workspaceSettings;
}

export function useCompanyInfoClient(): CompanyInfoClient {
	const { companyInfo } = useClients();
	if (!companyInfo) throw new Error("company-info client not provided");
	return companyInfo;
}

export function useSessionClient(): SessionClient {
	const { session } = useClients();
	if (!session) throw new Error("session client not provided");
	return session;
}

export function useSubscriptionClient(): SubscriptionClient {
	const { subscription } = useClients();
	if (!subscription) throw new Error("subscription client not provided");
	return subscription;
}

export function useTariffsClient(): TariffsClient {
	const { tariffs } = useClients();
	if (!tariffs) throw new Error("tariffs client not provided");
	return tariffs;
}
