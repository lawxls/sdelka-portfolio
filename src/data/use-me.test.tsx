import type { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createTestQueryClient } from "@/test-utils";
import type { ProfileClient } from "./clients/profile-client";
import { NetworkError } from "./errors";
import { fakeProfileClient, TestClientsProvider } from "./test-clients-provider";
import { useMe } from "./use-me";

let queryClient: QueryClient;

function wrapperFactory(client: ProfileClient) {
	return ({ children }: { children: ReactNode }) => (
		<TestClientsProvider queryClient={queryClient} clients={{ profile: client }}>
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

describe("useMe", () => {
	test("returns the current employee from client.me()", async () => {
		const me = vi.fn().mockResolvedValue({ id: 1, role: "admin" });
		const client = fakeProfileClient({ me });

		const { result } = renderHook(() => useMe(), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(result.current.data).toEqual({ id: 1, role: "admin" });
		});
		expect(me).toHaveBeenCalledOnce();
	});

	test("surfaces NetworkError as the query error", async () => {
		const client = fakeProfileClient({
			me: () => Promise.reject(new NetworkError(new Error("offline"))),
		});

		const { result } = renderHook(() => useMe(), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(result.current.error).toBeInstanceOf(NetworkError);
		});
	});
});
