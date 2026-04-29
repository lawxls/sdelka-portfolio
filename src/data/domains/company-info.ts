/**
 * Company-info domain types — the active workspace's company-level metadata
 * (name, branding, plan). Backs `useCompanyInfo`. Distinct from the companies
 * domain (`Company` records) — company-info represents the *current
 * workspace's identity*, not an arbitrary company aggregate. Today the surface
 * is just `{ name }`; adding branding/plan fields is a forward extension.
 */
export interface CompanyInfo {
	name: string;
}
