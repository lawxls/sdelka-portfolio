import type { CompanyInfo } from "../domains/company-info";

/**
 * Public seam for the company-info (active workspace identity) domain. Backs
 * `useCompanyInfo`. Surface is intentionally narrow — a single `get()` since
 * company-info is workspace-scoped and only readable from this API. Mutations
 * to workspace name/branding live elsewhere when they ship; the seam stays
 * read-only here.
 */
export interface CompanyInfoClient {
	get(): Promise<CompanyInfo>;
}
