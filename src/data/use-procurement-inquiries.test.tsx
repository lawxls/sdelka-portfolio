import type { QueryClient } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient, makeProcurementInquiry } from "@/test-utils";
import type { ProcurementInquiriesClient } from "./clients/procurement-inquiries-client";
import { keys } from "./query-keys";
import { fakeProcurementInquiriesClient, TestClientsProvider } from "./test-clients-provider";
import { useUpdateProcurementInquiry } from "./use-procurement-inquiries";

vi.mock("sonner", () => ({
	toast: { error: vi.fn() },
}));

let queryClient: QueryClient;

function wrapperFactory(client: ProcurementInquiriesClient) {
	return ({ children }: { children: ReactNode }) => (
		<TestClientsProvider queryClient={queryClient} clients={{ procurementInquiries: client }}>
			{children}
		</TestClientsProvider>
	);
}

beforeEach(() => {
	queryClient = createTestQueryClient();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useUpdateProcurementInquiry", () => {
	it("invalidates folder stats when folderId is patched", async () => {
		const update = vi.fn().mockResolvedValue(makeProcurementInquiry("i1", { folderId: "folder-2" }));
		const client = fakeProcurementInquiriesClient({ update });

		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

		const { result } = renderHook(() => useUpdateProcurementInquiry(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await result.current.mutateAsync({ id: "i1", patch: { folderId: "folder-2" } });
		});

		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.folders.stats() });
	});

	it("does not invalidate folder stats for non-folder patches", async () => {
		const update = vi.fn().mockResolvedValue(makeProcurementInquiry("i1", { name: "renamed" }));
		const client = fakeProcurementInquiriesClient({ update });

		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

		const { result } = renderHook(() => useUpdateProcurementInquiry(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await result.current.mutateAsync({ id: "i1", patch: { name: "renamed" } });
		});

		expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: keys.folders.stats() });
	});

	it("invalidates inquiries on success", async () => {
		const update = vi.fn().mockResolvedValue(makeProcurementInquiry("i1", { name: "renamed" }));
		const client = fakeProcurementInquiriesClient({ update });

		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

		const { result } = renderHook(() => useUpdateProcurementInquiry(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await result.current.mutateAsync({ id: "i1", patch: { name: "renamed" } });
		});

		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keys.procurementInquiries.all() });
	});
});
