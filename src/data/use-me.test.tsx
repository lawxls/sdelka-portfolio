import type { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createTestQueryClient, makeMe } from "@/test-utils";
import type { ProfileClient } from "./clients/profile-client";
import { NetworkError } from "./errors";
import { fakeProfileClient, TestClientsProvider } from "./test-clients-provider";
import { useMe, useUpdateSettings } from "./use-me";

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
		const seed = makeMe({ id: 42, role: "user", firstName: "Анна" });
		const me = vi.fn().mockResolvedValue(seed);
		const client = fakeProfileClient({ me });

		const { result } = renderHook(() => useMe(), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(result.current.data).toEqual(seed);
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

describe("useUpdateSettings", () => {
	test("calls client.update and writes the result into the me query cache", async () => {
		const seed = makeMe();
		const updated = { ...seed, firstName: "Пётр" };
		const update = vi.fn().mockResolvedValue(updated);
		const client = fakeProfileClient({ update });

		queryClient.setQueryData(["me"], seed);

		const { result } = renderHook(() => useUpdateSettings(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			const out = await result.current.mutateAsync({ firstName: "Пётр" });
			expect(out.firstName).toBe("Пётр");
		});

		expect(update).toHaveBeenCalledOnce();
		expect(update.mock.calls[0][0]).toEqual({ firstName: "Пётр" });
		expect(queryClient.getQueryData(["me"])).toEqual(updated);
	});

	test("surfaces NetworkError as the mutation error", async () => {
		const client = fakeProfileClient({
			update: () => Promise.reject(new NetworkError(new Error("offline"))),
		});

		const { result } = renderHook(() => useUpdateSettings(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await expect(result.current.mutateAsync({ firstName: "Пётр" })).rejects.toBeInstanceOf(NetworkError);
		});
	});
});
