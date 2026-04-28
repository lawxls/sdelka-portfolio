import type { CompanyInfo } from "../domains/company-info";
import { delay } from "../mock-utils";
import type { CompanyInfoClient } from "./company-info-client";

const DEFAULT_INFO: CompanyInfo = { name: "ОРМАТЕК" };

export interface InMemoryCompanyInfoOptions {
	/** Replace the seeded workspace identity (e.g. "Acme Corp"). */
	info?: CompanyInfo;
}

/**
 * Build a closure-isolated in-memory company-info adapter. State (the active
 * workspace's identity record) lives in the closure — every call to the
 * factory produces an independent store.
 */
export function createInMemoryCompanyInfoClient(options?: InMemoryCompanyInfoOptions): CompanyInfoClient {
	const info: CompanyInfo = { ...(options?.info ?? DEFAULT_INFO) };

	return {
		async get(): Promise<CompanyInfo> {
			await delay();
			return { ...info };
		},
	};
}
