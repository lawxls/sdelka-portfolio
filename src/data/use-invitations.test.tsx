import type { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createTestQueryClient } from "@/test-utils";
import type { InvitationsClient } from "./clients/invitations-client";
import { NetworkError } from "./errors";
import { fakeInvitationsClient, TestClientsProvider } from "./test-clients-provider";
import { useVerifyInvitationCode } from "./use-invitations";

let queryClient: QueryClient;

function wrapperFactory(client: InvitationsClient) {
	return ({ children }: { children: ReactNode }) => (
		<TestClientsProvider queryClient={queryClient} clients={{ invitations: client }}>
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

describe("useVerifyInvitationCode", () => {
	test("returns valid: true when client.verify resolves", async () => {
		const verify = vi.fn().mockResolvedValue({ valid: true });
		const client = fakeInvitationsClient({ verify });

		const { result } = renderHook(() => useVerifyInvitationCode("ABC12"), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(result.current.data).toEqual({ valid: true });
		});
		expect(verify).toHaveBeenCalledWith("ABC12");
	});

	test("returns valid: false when client surfaces an invalid code", async () => {
		const verify = vi.fn().mockResolvedValue({ valid: false });
		const client = fakeInvitationsClient({ verify });

		const { result } = renderHook(() => useVerifyInvitationCode("BAD"), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(result.current.data).toEqual({ valid: false });
		});
	});

	test("does not fire when code is null", async () => {
		const verify = vi.fn();
		const client = fakeInvitationsClient({ verify });

		const { result } = renderHook(() => useVerifyInvitationCode(null), { wrapper: wrapperFactory(client) });

		// No call, query stays in pending/disabled state — the hook is enabled
		// only when the caller has a non-null code.
		expect(verify).not.toHaveBeenCalled();
		expect(result.current.fetchStatus).toBe("idle");
	});

	test("surfaces NetworkError as the query error", async () => {
		const client = fakeInvitationsClient({
			verify: () => Promise.reject(new NetworkError(new Error("offline"))),
		});

		const { result } = renderHook(() => useVerifyInvitationCode("ABC12"), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(result.current.error).toBeInstanceOf(NetworkError);
		});
	});

	test("each code is its own cache entry — switching codes refires verify", async () => {
		const verify = vi
			.fn()
			.mockImplementationOnce(() => Promise.resolve({ valid: true }))
			.mockImplementationOnce(() => Promise.resolve({ valid: false }));
		const client = fakeInvitationsClient({ verify });

		const { result, rerender } = renderHook((code: string) => useVerifyInvitationCode(code), {
			wrapper: wrapperFactory(client),
			initialProps: "ABC12",
		});

		await waitFor(() => {
			expect(result.current.data).toEqual({ valid: true });
		});

		rerender("XYZ99");

		await waitFor(() => {
			expect(result.current.data).toEqual({ valid: false });
		});
		expect(verify).toHaveBeenCalledTimes(2);
		expect(verify).toHaveBeenNthCalledWith(1, "ABC12");
		expect(verify).toHaveBeenNthCalledWith(2, "XYZ99");
	});
});
