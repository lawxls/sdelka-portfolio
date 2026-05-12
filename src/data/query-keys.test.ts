import { describe, expect, it } from "vitest";
import { keys } from "./query-keys";

/**
 * Factory-shape snapshot. Locks in the cache-key vocabulary every domain
 * agrees on: a change to any of these shapes is a cross-cutting concern that
 * should be reviewed deliberately, not slipped in next to an unrelated edit.
 */
describe("keys factory", () => {
	it("matches the snapshot of every key the app uses", () => {
		expect({
			"companies.all": keys.companies.all(),
			"companies.list": keys.companies.list({ q: "альф", sort: "name", dir: "desc" }),
			"companies.list (empty params)": keys.companies.list({}),
			"companies.listAll": keys.companies.listAll(),
			"companies.procurement": keys.companies.procurement(),
			"companies.detail": keys.companies.detail("c1"),
			"companies.detail (null)": keys.companies.detail(null),
			"items.all": keys.items.all(),
			"items.list": keys.items.list({ q: "арм", folder: "f1", company: "c1", sort: "currentPrice", dir: "asc" }),
			"items.list (empty params)": keys.items.list({}),
			"items.listAll": keys.items.listAll(),
			"items.detail": keys.items.detail("i1"),
			"items.detail (null)": keys.items.detail(null),
			"items.totals": keys.items.totals({ q: "арм", folder: "f1", company: "c1" }),
			"items.totals (empty params)": keys.items.totals({}),
			"items.totalsAll": keys.items.totalsAll(),
			"items.search": keys.items.search("query"),
			"folders.stats": keys.folders.stats(),
			"procurementInquiries.all": keys.procurementInquiries.all(),
			"procurementInquiries.list": keys.procurementInquiries.list({
				q: "альф",
				folder: "f1",
				sort: "createdAt",
				dir: "desc",
			}),
			"procurementInquiries.list (empty params)": keys.procurementInquiries.list({}),
			"procurementInquiries.detail": keys.procurementInquiries.detail("T-001"),
			"procurementInquiries.detail (null)": keys.procurementInquiries.detail(null),
		}).toMatchInlineSnapshot(`
			{
			  "companies.all": [
			    "companies",
			  ],
			  "companies.detail": [
			    "company",
			    "c1",
			  ],
			  "companies.detail (null)": [
			    "company",
			    null,
			  ],
			  "companies.list": [
			    "companies",
			    {
			      "dir": "desc",
			      "q": "альф",
			      "sort": "name",
			    },
			  ],
			  "companies.list (empty params)": [
			    "companies",
			    {},
			  ],
			  "companies.listAll": [
			    "companies-global",
			  ],
			  "companies.procurement": [
			    "procurementCompanies",
			  ],
			  "folders.stats": [
			    "folderStats",
			  ],
			  "items.all": [
			    "items",
			  ],
			  "items.detail": [
			    "itemDetail",
			    "i1",
			  ],
			  "items.detail (null)": [
			    "itemDetail",
			    null,
			  ],
			  "items.list": [
			    "items",
			    {
			      "company": "c1",
			      "dir": "asc",
			      "folder": "f1",
			      "q": "арм",
			      "sort": "currentPrice",
			    },
			  ],
			  "items.list (empty params)": [
			    "items",
			    {},
			  ],
			  "items.listAll": [
			    "items-global",
			  ],
			  "items.search": [
			    "items",
			    "search",
			    "query",
			  ],
			  "items.totals": [
			    "totals",
			    {
			      "company": "c1",
			      "folder": "f1",
			      "q": "арм",
			    },
			  ],
			  "items.totals (empty params)": [
			    "totals",
			    {},
			  ],
			  "items.totalsAll": [
			    "totals",
			  ],
			  "procurementInquiries.all": [
			    "procurementInquiries",
			  ],
			  "procurementInquiries.detail": [
			    "procurementInquiries",
			    "detail",
			    "T-001",
			  ],
			  "procurementInquiries.detail (null)": [
			    "procurementInquiries",
			    "detail",
			    null,
			  ],
			  "procurementInquiries.list": [
			    "procurementInquiries",
			    {
			      "dir": "desc",
			      "folder": "f1",
			      "q": "альф",
			      "sort": "createdAt",
			    },
			  ],
			  "procurementInquiries.list (empty params)": [
			    "procurementInquiries",
			    {},
			  ],
			}
		`);
	});

	it("items.list keys live under the items.all prefix", () => {
		const all = keys.items.all();
		const list = keys.items.list({ q: "x" });
		const search = keys.items.search("query");
		expect(list[0]).toBe(all[0]);
		expect(search[0]).toBe(all[0]);
	});

	it("companies.list keys live under the companies.all prefix", () => {
		const all = keys.companies.all();
		const list = keys.companies.list({ q: "x" });
		expect(list[0]).toBe(all[0]);
	});

	it("items.totals keys live under the items.totalsAll prefix", () => {
		const totalsAll = keys.items.totalsAll();
		const totals = keys.items.totals({ q: "x" });
		expect(totals[0]).toBe(totalsAll[0]);
	});

	it("procurementInquiries.list and detail live under the procurementInquiries.all prefix", () => {
		const all = keys.procurementInquiries.all();
		const list = keys.procurementInquiries.list({});
		const detail = keys.procurementInquiries.detail("T-001");
		expect(list[0]).toBe(all[0]);
		expect(detail[0]).toBe(all[0]);
	});
});
