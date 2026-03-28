import type { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { server } from "@/test-msw";
import { createQueryWrapper, createTestQueryClient, makeCompanyDetail, mockHostname } from "@/test-utils";
import { setTokens } from "./auth";
import { useCompanyDetail, useUpdateCompany } from "./use-company-detail";

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = createTestQueryClient();
	mockHostname("acme.localhost");
	setTokens("test-jwt", "test-refresh");
});

afterEach(() => {
	localStorage.clear();
});

describe("useCompanyDetail", () => {
	it("fetches company detail by id", async () => {
		const company = makeCompanyDetail("c1");
		server.use(http.get("/api/v1/companies/c1/", () => HttpResponse.json(company)));

		const { result } = renderHook(() => useCompanyDetail("c1"), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.data).toEqual(company);
		});
	});

	it("does not fetch when id is null", () => {
		const { result } = renderHook(() => useCompanyDetail(null), {
			wrapper: createQueryWrapper(queryClient),
		});

		expect(result.current.isLoading).toBe(false);
		expect(result.current.data).toBeUndefined();
	});

	it("returns error on API failure", async () => {
		server.use(http.get("/api/v1/companies/c1/", () => HttpResponse.json({}, { status: 500 })));

		const { result } = renderHook(() => useCompanyDetail("c1"), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(result.current.error).toBeTruthy();
		});
	});
});

describe("useUpdateCompany", () => {
	it("sends PATCH with updated fields", async () => {
		let capturedBody: Record<string, unknown> | undefined;
		const original = makeCompanyDetail("c1");
		const updated = makeCompanyDetail("c1", { name: "Updated" });

		server.use(
			http.get("/api/v1/companies/c1/", () => HttpResponse.json(original)),
			http.patch("/api/v1/companies/c1/", async ({ request }) => {
				capturedBody = (await request.json()) as Record<string, unknown>;
				return HttpResponse.json(updated);
			}),
		);

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				update: useUpdateCompany("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data).toBeDefined());

		result.current.update.mutate({ name: "Updated" });

		await waitFor(() => expect(result.current.update.isSuccess).toBe(true));

		expect(capturedBody).toEqual({ name: "Updated" });
	});

	it("optimistically updates query cache", async () => {
		const original = makeCompanyDetail("c1", { name: "Original" });

		server.use(
			http.get("/api/v1/companies/c1/", () => HttpResponse.json(original)),
			http.patch("/api/v1/companies/c1/", async () => {
				await new Promise((r) => setTimeout(r, 100));
				return HttpResponse.json(makeCompanyDetail("c1", { name: "Updated" }));
			}),
		);

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				update: useUpdateCompany("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data?.name).toBe("Original"));

		result.current.update.mutate({ name: "Updated" });

		// Optimistic: cache updates before server responds
		await waitFor(() => {
			expect(result.current.detail.data?.name).toBe("Updated");
		});
	});

	it("rolls back cache on error", async () => {
		const original = makeCompanyDetail("c1", { name: "Original" });

		server.use(
			http.get("/api/v1/companies/c1/", () => HttpResponse.json(original)),
			http.patch("/api/v1/companies/c1/", () => HttpResponse.json({}, { status: 500 })),
		);

		const { result } = renderHook(
			() => ({
				detail: useCompanyDetail("c1"),
				update: useUpdateCompany("c1"),
			}),
			{ wrapper: createQueryWrapper(queryClient) },
		);

		await waitFor(() => expect(result.current.detail.data?.name).toBe("Original"));

		result.current.update.mutate({ name: "Failed" });

		await waitFor(() => {
			expect(result.current.update.error).toBeTruthy();
		});

		// Cache rolled back
		expect(result.current.detail.data?.name).toBe("Original");
	});
});
