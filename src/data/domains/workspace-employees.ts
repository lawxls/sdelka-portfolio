/**
 * Workspace-employees domain types — the workspace's full employee roster.
 * Backs `useWorkspaceEmployees`, `useWorkspaceEmployeeDetail`,
 * `useInviteEmployees`, `useDeleteWorkspaceEmployees`,
 * `useUpdateWorkspaceEmployee`, and `useUpdateWorkspaceEmployeePermissions`.
 *
 * Distinct from the company-employee sub-resource on `CompaniesClient`: that
 * surface enumerates the employees of a single company aggregate, while this
 * one enumerates everyone in the workspace (regardless of company membership)
 * and owns invitation lifecycle. The two domains share the underlying
 * `Employee` shape but model different things — a workspace employee carries a
 * `companies: CompanySummary[]` array because they may belong to several.
 *
 * The types are re-exported from the legacy `workspace-mock-data` until that
 * file is dissolved in #250; consumers should import them from this module so
 * the eventual deletion is a single import-rename pass.
 */
export type {
	InviteEmployeeData,
	UpdatePermissionsData,
	UpdateWorkspaceEmployeeData,
	WorkspaceEmployee,
	WorkspaceEmployeeDetail,
} from "../workspace-mock-data";
