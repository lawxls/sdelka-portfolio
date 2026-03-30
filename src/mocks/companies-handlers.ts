import { HttpResponse, http } from "msw";
import type { Address, CompanySummary, Employee, EmployeePermissions } from "@/data/types";
import {
	addCompanyToList,
	companyList,
	getCompanyDetail,
	removeCompanyFromList,
	setCompanyDetail,
} from "./companies-data";

export const companiesHandlers = [
	http.get("/api/v1/companies/", ({ request }) => {
		const url = new URL(request.url);
		const q = url.searchParams.get("q");
		const sort = url.searchParams.get("sort");
		const dir = url.searchParams.get("dir");
		const cursor = url.searchParams.get("cursor");
		const limit = Number(url.searchParams.get("limit")) || 25;

		let items = [...companyList];

		if (q) {
			items = items.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
		}

		if (sort) {
			const direction = dir === "desc" ? -1 : 1;
			items.sort((a, b) => {
				if (a.isMain && !b.isMain) return -1;
				if (!a.isMain && b.isMain) return 1;
				const aVal = a[sort as keyof CompanySummary];
				const bVal = b[sort as keyof CompanySummary];
				if (typeof aVal === "string" && typeof bVal === "string") {
					return aVal.localeCompare(bVal) * direction;
				}
				return ((aVal as number) - (bVal as number)) * direction;
			});
		} else {
			items.sort((a, b) => {
				if (a.isMain && !b.isMain) return -1;
				if (!a.isMain && b.isMain) return 1;
				return 0;
			});
		}

		const startIndex = cursor ? items.findIndex((c) => c.id === cursor) + 1 : 0;
		const page = items.slice(startIndex, startIndex + limit);
		const nextItem = items[startIndex + limit];
		const nextCursor = nextItem ? nextItem.id : null;

		return HttpResponse.json({ companies: page, nextCursor });
	}),

	http.get("/api/v1/companies/:id/", ({ params }) => {
		const detail = getCompanyDetail(params.id as string);
		if (!detail) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
		return HttpResponse.json(detail);
	}),

	http.patch("/api/v1/companies/:id/", async ({ params, request }) => {
		const detail = getCompanyDetail(params.id as string);
		if (!detail) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
		const body = (await request.json()) as Record<string, unknown>;
		const updated = { ...detail, ...body };
		setCompanyDetail(params.id as string, updated);
		return HttpResponse.json(updated);
	}),

	http.post("/api/v1/companies/", async ({ request }) => {
		const body = (await request.json()) as Record<string, unknown>;
		const id = `company-new-${Date.now()}`;
		const addr = body.address as Record<string, string>;

		const detail = {
			id,
			name: body.name as string,
			industry: (body.industry as string) ?? "",
			website: (body.website as string) ?? "",
			description: (body.description as string) ?? "",
			preferredPayment: (body.preferredPayment as string) ?? "",
			preferredDelivery: (body.preferredDelivery as string) ?? "",
			additionalComments: (body.additionalComments as string) ?? "",
			isMain: false,
			employeeCount: 0,
			procurementItemCount: 0,
			addresses: [{ id: `addr-${id}`, isMain: true, ...addr }] as Address[],
			employees: [] as (Employee & { permissions: EmployeePermissions })[],
		};

		setCompanyDetail(id, detail);
		addCompanyToList({
			id,
			name: body.name as string,
			isMain: false,
			responsibleEmployeeName: "",
			addresses: [
				{
					id: `addr-${id}`,
					name: addr.name,
					type: addr.type as Address["type"],
					address: addr.address,
					isMain: true,
				},
			],
			employeeCount: 0,
			procurementItemCount: 0,
		});

		return HttpResponse.json(detail);
	}),

	http.delete("/api/v1/companies/:id/", ({ params }) => {
		const id = params.id as string;
		const company = companyList.find((c) => c.id === id);
		if (!company) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
		if (company.isMain) return HttpResponse.json({ detail: "Cannot delete main company" }, { status: 403 });
		if (company.procurementItemCount > 0)
			return HttpResponse.json({ detail: "Company has active procurement items" }, { status: 409 });
		removeCompanyFromList(id);
		return new HttpResponse(null, { status: 204 });
	}),

	// --- Addresses ---

	http.post("/api/v1/companies/:id/addresses/", async ({ params, request }) => {
		const detail = getCompanyDetail(params.id as string);
		if (!detail) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
		const body = (await request.json()) as Record<string, unknown>;
		const newAddr = { id: `addr-new-${Date.now()}`, isMain: false, ...body } as Address;
		setCompanyDetail(params.id as string, { ...detail, addresses: [...detail.addresses, newAddr] });
		return HttpResponse.json(newAddr);
	}),

	http.patch("/api/v1/companies/:id/addresses/:addressId/", async ({ params, request }) => {
		const detail = getCompanyDetail(params.id as string);
		if (!detail) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
		const body = (await request.json()) as Record<string, unknown>;
		const addr = detail.addresses.find((a) => a.id === params.addressId);
		if (!addr) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
		const updated = { ...addr, ...body } as Address;
		setCompanyDetail(params.id as string, {
			...detail,
			addresses: detail.addresses.map((a) => (a.id === params.addressId ? updated : a)),
		});
		return HttpResponse.json(updated);
	}),

	http.delete("/api/v1/companies/:id/addresses/:addressId/", ({ params }) => {
		const detail = getCompanyDetail(params.id as string);
		if (!detail) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
		if (detail.addresses.length <= 1) {
			return HttpResponse.json({ detail: "Cannot delete the last address" }, { status: 409 });
		}
		setCompanyDetail(params.id as string, {
			...detail,
			addresses: detail.addresses.filter((a) => a.id !== params.addressId),
		});
		return new HttpResponse(null, { status: 204 });
	}),

	// --- Employees ---

	http.post("/api/v1/companies/:id/employees/", async ({ params, request }) => {
		const detail = getCompanyDetail(params.id as string);
		if (!detail) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
		const body = (await request.json()) as Record<string, unknown>;
		const newId = Date.now();
		const newEmp = {
			id: newId,
			...body,
			permissions: {
				id: `perm-new-${newId}`,
				employeeId: newId,
				analytics: body.role === "admin" ? "edit" : "none",
				procurement: body.role === "admin" ? "edit" : "none",
				companies: body.role === "admin" ? "edit" : "none",
				tasks: body.role === "admin" ? "edit" : "none",
			},
		} as Employee & { permissions: EmployeePermissions };
		setCompanyDetail(params.id as string, { ...detail, employees: [...detail.employees, newEmp] });
		return HttpResponse.json(newEmp);
	}),

	http.patch("/api/v1/companies/:id/employees/:employeeId/", async ({ params, request }) => {
		const detail = getCompanyDetail(params.id as string);
		if (!detail) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
		const body = (await request.json()) as Record<string, unknown>;
		const empId = Number(params.employeeId);
		const emp = detail.employees.find((e) => e.id === empId);
		if (!emp) return HttpResponse.json({ detail: "Not found" }, { status: 404 });

		let employees: (Employee & { permissions: EmployeePermissions })[];
		if (body.isResponsible === true) {
			employees = detail.employees.map((e) =>
				e.id === empId ? { ...e, ...body, isResponsible: true } : { ...e, isResponsible: false },
			) as (Employee & { permissions: EmployeePermissions })[];
		} else {
			employees = detail.employees.map((e) => (e.id === empId ? { ...e, ...body } : e)) as (Employee & {
				permissions: EmployeePermissions;
			})[];
		}

		setCompanyDetail(params.id as string, { ...detail, employees });
		return HttpResponse.json(employees.find((e) => e.id === empId));
	}),

	http.delete("/api/v1/companies/:id/employees/:employeeId/", ({ params }) => {
		const detail = getCompanyDetail(params.id as string);
		if (!detail) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
		const empId = Number(params.employeeId);
		const emp = detail.employees.find((e) => e.id === empId);
		if (emp?.isResponsible && detail.employees.filter((e) => e.isResponsible).length <= 1) {
			return HttpResponse.json({ detail: "Cannot delete the only responsible employee" }, { status: 409 });
		}
		setCompanyDetail(params.id as string, {
			...detail,
			employees: detail.employees.filter((e) => e.id !== empId),
		});
		return new HttpResponse(null, { status: 204 });
	}),

	http.patch("/api/v1/companies/:id/employees/:employeeId/permissions/", async ({ params, request }) => {
		const detail = getCompanyDetail(params.id as string);
		if (!detail) return HttpResponse.json({ detail: "Not found" }, { status: 404 });
		const body = (await request.json()) as Record<string, unknown>;
		const empId = Number(params.employeeId);
		const employees = detail.employees.map((e) =>
			e.id === empId ? { ...e, permissions: { ...e.permissions, ...body } } : e,
		);
		setCompanyDetail(params.id as string, { ...detail, employees });
		return HttpResponse.json(employees.find((e) => e.id === empId)?.permissions);
	}),
];
