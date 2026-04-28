import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestQueryClient } from "@/test-utils";
import {
	invalidateAfterCompanyChange,
	invalidateAfterEmployeePermissionsChange,
	invalidateAfterItemDetailChange,
	invalidateAfterItemListChange,
} from "./invalidation-policies";
import { keys } from "./query-keys";

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = createTestQueryClient();
});

/**
 * Seed a query into the cache so we can later assert whether the policy
 * invalidated it. Sets staleTime to Infinity so an idle query is fresh; after
 * `invalidateQueries` matches it, `isInvalidated` flips true.
 */
function seedQuery(key: QueryKey, data: unknown = "seed") {
	queryClient.setQueryData(key, data);
}

function isInvalidated(key: QueryKey): boolean {
	return queryClient.getQueryState(key)?.isInvalidated ?? false;
}

describe("invalidateAfterCompanyChange", () => {
	const seedAll = () => {
		seedQuery(keys.companies.list({ q: "альф" }));
		seedQuery(keys.companies.list({}));
		seedQuery(keys.companies.listAll());
		seedQuery(keys.companies.procurement());
		seedQuery(keys.companies.detail("c1"));
		seedQuery(keys.companies.detail("c2"));
	};

	it("invalidates the list namespace, listAll, procurement, and the named detail", () => {
		seedAll();
		invalidateAfterCompanyChange(queryClient, { companyId: "c1" });

		expect(isInvalidated(keys.companies.list({ q: "альф" }))).toBe(true);
		expect(isInvalidated(keys.companies.list({}))).toBe(true);
		expect(isInvalidated(keys.companies.listAll())).toBe(true);
		expect(isInvalidated(keys.companies.procurement())).toBe(true);
		expect(isInvalidated(keys.companies.detail("c1"))).toBe(true);
	});

	it("leaves untargeted company details fresh", () => {
		seedAll();
		invalidateAfterCompanyChange(queryClient, { companyId: "c1" });
		expect(isInvalidated(keys.companies.detail("c2"))).toBe(false);
	});

	it("without companyId still invalidates list namespaces", () => {
		seedAll();
		invalidateAfterCompanyChange(queryClient);

		expect(isInvalidated(keys.companies.list({ q: "альф" }))).toBe(true);
		expect(isInvalidated(keys.companies.listAll())).toBe(true);
		expect(isInvalidated(keys.companies.procurement())).toBe(true);
		expect(isInvalidated(keys.companies.detail("c1"))).toBe(false);
		expect(isInvalidated(keys.companies.detail("c2"))).toBe(false);
	});

	it("does not touch unrelated domains", () => {
		seedQuery(keys.items.all());
		seedQuery(keys.items.listAll());
		seedQuery(keys.items.totalsAll());
		seedQuery(keys.folders.stats());

		invalidateAfterCompanyChange(queryClient, { companyId: "c1" });

		expect(isInvalidated(keys.items.all())).toBe(false);
		expect(isInvalidated(keys.items.listAll())).toBe(false);
		expect(isInvalidated(keys.items.totalsAll())).toBe(false);
		expect(isInvalidated(keys.folders.stats())).toBe(false);
	});
});

describe("invalidateAfterEmployeePermissionsChange", () => {
	it("invalidates only the parent company's detail", () => {
		seedQuery(keys.companies.detail("c1"));
		seedQuery(keys.companies.detail("c2"));
		seedQuery(keys.companies.list({}));
		seedQuery(keys.companies.listAll());
		seedQuery(keys.companies.procurement());

		invalidateAfterEmployeePermissionsChange(queryClient, { companyId: "c1" });

		expect(isInvalidated(keys.companies.detail("c1"))).toBe(true);
		expect(isInvalidated(keys.companies.detail("c2"))).toBe(false);
		expect(isInvalidated(keys.companies.list({}))).toBe(false);
		expect(isInvalidated(keys.companies.listAll())).toBe(false);
		expect(isInvalidated(keys.companies.procurement())).toBe(false);
	});
});

describe("invalidateAfterItemListChange", () => {
	it("invalidates items list namespace, listAll, totals, and folder stats", () => {
		seedQuery(keys.items.list({ q: "арм" }));
		seedQuery(keys.items.list({ folder: "f1" }));
		seedQuery(keys.items.search("query"));
		seedQuery(keys.items.listAll());
		seedQuery(keys.items.totals({ folder: "f1" }));
		seedQuery(keys.items.totalsAll());
		seedQuery(keys.folders.stats());

		invalidateAfterItemListChange(queryClient);

		expect(isInvalidated(keys.items.list({ q: "арм" }))).toBe(true);
		expect(isInvalidated(keys.items.list({ folder: "f1" }))).toBe(true);
		expect(isInvalidated(keys.items.search("query"))).toBe(true);
		expect(isInvalidated(keys.items.listAll())).toBe(true);
		expect(isInvalidated(keys.items.totals({ folder: "f1" }))).toBe(true);
		expect(isInvalidated(keys.items.totalsAll())).toBe(true);
		expect(isInvalidated(keys.folders.stats())).toBe(true);
	});

	it("does not touch item detail or unrelated domains", () => {
		seedQuery(keys.items.detail("i1"));
		seedQuery(keys.companies.all());
		seedQuery(keys.companies.listAll());

		invalidateAfterItemListChange(queryClient);

		expect(isInvalidated(keys.items.detail("i1"))).toBe(false);
		expect(isInvalidated(keys.companies.all())).toBe(false);
		expect(isInvalidated(keys.companies.listAll())).toBe(false);
	});
});

describe("invalidateAfterItemDetailChange", () => {
	it("invalidates items list namespace and totals but not folder stats", () => {
		seedQuery(keys.items.list({}));
		seedQuery(keys.items.totalsAll());
		seedQuery(keys.folders.stats());

		invalidateAfterItemDetailChange(queryClient);

		expect(isInvalidated(keys.items.list({}))).toBe(true);
		expect(isInvalidated(keys.items.totalsAll())).toBe(true);
		expect(isInvalidated(keys.folders.stats())).toBe(false);
	});
});
