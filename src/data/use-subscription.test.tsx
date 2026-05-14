import type { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient } from "@/test-utils";
import type { SubscriptionClient } from "./clients/subscription-client";
import type { Subscription } from "./domains/subscription";
import { fakeSubscriptionClient, TestClientsProvider } from "./test-clients-provider";
import { useSubscription, useTopUpRequests } from "./use-subscription";

let queryClient: QueryClient;

function wrapperFactory(client: SubscriptionClient) {
	return ({ children }: { children: ReactNode }) => (
		<TestClientsProvider queryClient={queryClient} clients={{ subscription: client }}>
			{children}
		</TestClientsProvider>
	);
}

const SNAPSHOT: Subscription = {
	tariff_id: "start",
	tariff_name: "Старт",
	requests_used: 2,
	requests_limit: 5,
	employees_used: 1,
	employees_limit: 2,
	emails_sent: 42,
	emails_limit: 200,
};

beforeEach(() => {
	queryClient = createTestQueryClient();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useSubscription", () => {
	it("returns the subscription snapshot from the client", async () => {
		const current = vi.fn().mockResolvedValue(SNAPSHOT);
		const client = fakeSubscriptionClient({ current });

		const { result } = renderHook(() => useSubscription(), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(result.current.data).toEqual(SNAPSHOT);
		});
	});
});

describe("useTopUpRequests", () => {
	it("raises requests_limit in the cache on success", async () => {
		const current = vi.fn().mockResolvedValue(SNAPSHOT);
		const topUp = vi.fn().mockResolvedValue({ requests_added: 3, requests_limit: 8, total_price: 11_700 });
		const client = fakeSubscriptionClient({ current, topUp });

		const { result: read } = renderHook(() => useSubscription(), { wrapper: wrapperFactory(client) });
		const { result: mut } = renderHook(() => useTopUpRequests(), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(read.current.data?.requests_limit).toBe(5));

		await act(async () => {
			await mut.current.mutateAsync({ quantity: 3 });
		});

		expect(topUp).toHaveBeenCalledWith({ quantity: 3 });
		await waitFor(() => expect(read.current.data?.requests_limit).toBe(8));
		expect(read.current.data?.requests_used).toBe(SNAPSHOT.requests_used);
	});
});
