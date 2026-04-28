import type { CompanyInfo } from "../domains/company-info";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import type { CompanyInfoClient } from "./company-info-client";

export function createHttpCompanyInfoClient(http: HttpClient = defaultHttpClient): CompanyInfoClient {
	return {
		get: () => http.get<CompanyInfo>(`/api/workspace/company-info`),
	};
}
