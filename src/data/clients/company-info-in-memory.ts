import type { CompanyInfo } from "../domains/company-info";
import { _setCompanyInfo, fetchCompanyInfoMock } from "../workspace-mock-data";
import type { CompanyInfoClient } from "./company-info-client";

export interface InMemoryCompanyInfoOptions {
	/** Replace the module-level mock store at construction time. Tests pass
	 * this to land on a known workspace identity (e.g. "Acme Corp") without
	 * reaching into `_setCompanyInfo` directly. */
	info?: CompanyInfo;
}

/**
 * Build an in-memory company-info adapter wrapping the module-level workspace
 * mock store. Singleton-wrapping (rather than closure isolation) is the right
 * shape here because `workspace-mock-data` is shared with the profile and
 * workspace-employees domains until #250 dissolves it. Once those splits are
 * cleaned up, this can become closure-isolated.
 */
export function createInMemoryCompanyInfoClient(options?: InMemoryCompanyInfoOptions): CompanyInfoClient {
	if (options?.info !== undefined) _setCompanyInfo(options.info);

	return {
		async get(): Promise<CompanyInfo> {
			return fetchCompanyInfoMock();
		},
	};
}
