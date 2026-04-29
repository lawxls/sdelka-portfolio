import type { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient } from "@/test-utils";
import type { EmailsClient } from "./clients/emails-client";
import type { AddEmailPayload, WorkspaceEmail } from "./domains/emails";
import { NetworkError, ValidationError } from "./errors";
import { fakeEmailsClient, TestClientsProvider } from "./test-clients-provider";
import { useAddEmail, useDeleteEmails, useDisableEmails, useEmails } from "./use-emails";

let queryClient: QueryClient;

function wrapperFactory(client: EmailsClient) {
	return ({ children }: { children: ReactNode }) => (
		<TestClientsProvider queryClient={queryClient} clients={{ emails: client }}>
			{children}
		</TestClientsProvider>
	);
}

function makeEmail(id: string, overrides: Partial<WorkspaceEmail> = {}): WorkspaceEmail {
	return {
		id,
		email: `${id}@example.com`,
		status: "active",
		type: "corporate",
		sentCount: 0,
		...overrides,
	};
}

beforeEach(() => {
	queryClient = createTestQueryClient();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useEmails", () => {
	it("returns the emails from the client", async () => {
		const list = vi.fn().mockResolvedValue([makeEmail("a"), makeEmail("b")]);
		const client = fakeEmailsClient({ list });

		const { result } = renderHook(() => useEmails(), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(result.current.emails).toHaveLength(2);
		});
		expect(result.current.emails.map((e) => e.id)).toEqual(["a", "b"]);
	});

	it("returns loading state initially", () => {
		const client = fakeEmailsClient({
			list: () => new Promise<WorkspaceEmail[]>(() => {}),
		});
		const { result } = renderHook(() => useEmails(), { wrapper: wrapperFactory(client) });
		expect(result.current.isLoading).toBe(true);
		expect(result.current.emails).toEqual([]);
	});

	it("does not call the client when disabled", async () => {
		const list = vi.fn().mockResolvedValue([]);
		const client = fakeEmailsClient({ list });

		renderHook(() => useEmails({ enabled: false }), { wrapper: wrapperFactory(client) });
		// Wait one microtask cycle and confirm no fetch.
		await Promise.resolve();
		expect(list).not.toHaveBeenCalled();
	});

	it("surfaces NetworkError as the query error", async () => {
		const client = fakeEmailsClient({ list: () => Promise.reject(new NetworkError(new Error("offline"))) });

		const { result } = renderHook(() => useEmails(), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(result.current.error).toBeInstanceOf(NetworkError);
		});
		expect(result.current.emails).toEqual([]);
	});
});

describe("useAddEmail", () => {
	it("adds an email and triggers refetch via invalidation", async () => {
		const list = vi
			.fn()
			.mockResolvedValueOnce([makeEmail("a")])
			.mockResolvedValueOnce([makeEmail("a"), makeEmail("b")]);
		const add = vi.fn().mockResolvedValue(makeEmail("b"));
		const client = fakeEmailsClient({ list, add });

		const { result: read } = renderHook(() => useEmails(), { wrapper: wrapperFactory(client) });
		const { result: addMut } = renderHook(() => useAddEmail(), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(read.current.emails).toHaveLength(1));

		const payload: AddEmailPayload = {
			email: "b@example.com",
			password: "x",
			smtpHost: "smtp.example.com",
			smtpPort: 587,
			imapHost: "imap.example.com",
			imapPort: 993,
		};

		await act(async () => {
			await addMut.current.mutateAsync(payload);
		});

		expect(add).toHaveBeenCalledWith(payload);
		await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(read.current.emails).toHaveLength(2));
	});

	it("surfaces ValidationError with fieldErrors on rejected mutation", async () => {
		const fieldErrors = { email: ["already exists"] };
		const add = vi.fn().mockRejectedValue(new ValidationError(fieldErrors));
		const client = fakeEmailsClient({ add });

		const { result } = renderHook(() => useAddEmail(), { wrapper: wrapperFactory(client) });

		await act(async () => {
			await expect(
				result.current.mutateAsync({
					email: "dup@example.com",
					password: "x",
					smtpHost: "h",
					smtpPort: 1,
					imapHost: "h",
					imapPort: 1,
				}),
			).rejects.toBeInstanceOf(ValidationError);
		});

		await waitFor(() => {
			expect(result.current.error).toBeInstanceOf(ValidationError);
		});
		expect((result.current.error as ValidationError).fieldErrors).toEqual(fieldErrors);
	});
});

describe("useDeleteEmails", () => {
	it("deletes the given ids and triggers refetch via invalidation", async () => {
		const list = vi
			.fn()
			.mockResolvedValueOnce([makeEmail("a"), makeEmail("b")])
			.mockResolvedValueOnce([makeEmail("b")]);
		const deleteFn = vi.fn().mockResolvedValue(undefined);
		const client = fakeEmailsClient({ list, delete: deleteFn });

		const { result: read } = renderHook(() => useEmails(), { wrapper: wrapperFactory(client) });
		const { result: del } = renderHook(() => useDeleteEmails(), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(read.current.emails).toHaveLength(2));

		await act(async () => {
			await del.current.mutateAsync(["a"]);
		});

		expect(deleteFn).toHaveBeenCalledWith(["a"]);
		await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(read.current.emails).toEqual([makeEmail("b")]));
	});
});

describe("useDisableEmails", () => {
	it("disables the given ids and triggers refetch via invalidation", async () => {
		const list = vi
			.fn()
			.mockResolvedValueOnce([makeEmail("a"), makeEmail("b")])
			.mockResolvedValueOnce([makeEmail("a", { status: "disabled" }), makeEmail("b")]);
		const disable = vi.fn().mockResolvedValue(undefined);
		const client = fakeEmailsClient({ list, disable });

		const { result: read } = renderHook(() => useEmails(), { wrapper: wrapperFactory(client) });
		const { result: dis } = renderHook(() => useDisableEmails(), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(read.current.emails).toHaveLength(2));

		await act(async () => {
			await dis.current.mutateAsync(["a"]);
		});

		expect(disable).toHaveBeenCalledWith(["a"]);
		await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(read.current.emails.find((e) => e.id === "a")?.status).toBe("disabled"));
	});
});
