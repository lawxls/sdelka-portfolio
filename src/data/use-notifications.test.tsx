import type { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient } from "@/test-utils";
import type { NotificationsClient } from "./clients/notifications-client";
import type { NotificationsResponse } from "./domains/notifications";
import { NetworkError } from "./errors";
import type { Notification } from "./notification-types";
import { fakeNotificationsClient, TestClientsProvider } from "./test-clients-provider";
import { useMarkAllNotificationsAsRead, useMarkNotificationAsRead, useNotifications } from "./use-notifications";

vi.mock("sonner", () => ({
	toast: { error: vi.fn() },
}));

function makeNotification(id: string, overrides: Partial<Notification> = {}): Notification {
	return {
		id,
		type: "task_assigned",
		taskId: "task-1",
		createdAt: `2026-04-22T10:00:00.00${id.length}Z`,
		...overrides,
	} as Notification;
}

let queryClient: QueryClient;

function wrapperFactory(client: NotificationsClient) {
	return ({ children }: { children: ReactNode }) => (
		<TestClientsProvider queryClient={queryClient} clients={{ notifications: client }}>
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

describe("useNotifications", () => {
	it("returns notifications and computes unreadCount", async () => {
		const list = vi.fn().mockResolvedValue({
			notifications: [makeNotification("a"), makeNotification("b"), makeNotification("c")],
			readIds: ["b"],
		} satisfies NotificationsResponse);
		const client = fakeNotificationsClient({ list });

		const { result } = renderHook(() => useNotifications(), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(result.current.notifications).toHaveLength(3);
		});
		expect(result.current.unreadCount).toBe(2);
		expect(result.current.isRead("b")).toBe(true);
		expect(result.current.isRead("a")).toBe(false);
	});

	it("unreadCount is 0 when all notifications are read", async () => {
		const client = fakeNotificationsClient({
			list: () =>
				Promise.resolve({
					notifications: [makeNotification("a"), makeNotification("b")],
					readIds: ["a", "b"],
				}),
		});

		const { result } = renderHook(() => useNotifications(), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(result.current.notifications).toHaveLength(2);
		});
		expect(result.current.unreadCount).toBe(0);
	});

	it("returns loading state initially", () => {
		const client = fakeNotificationsClient({
			list: () => new Promise<NotificationsResponse>(() => {}),
		});
		const { result } = renderHook(() => useNotifications(), { wrapper: wrapperFactory(client) });
		expect(result.current.isLoading).toBe(true);
	});

	it("surfaces NetworkError from the client", async () => {
		const client = fakeNotificationsClient({ list: () => Promise.reject(new NetworkError(new Error("offline"))) });
		const { result } = renderHook(() => useNotifications(), { wrapper: wrapperFactory(client) });

		await waitFor(() => {
			expect(result.current.notifications).toHaveLength(0);
			expect(result.current.unreadCount).toBe(0);
			expect(result.current.isLoading).toBe(false);
		});
	});
});

describe("useMarkNotificationAsRead", () => {
	it("optimistically marks the id as read before the mutation resolves", async () => {
		queryClient.setQueryData<NotificationsResponse>(["notifications"], {
			notifications: [makeNotification("a"), makeNotification("b")],
			readIds: [],
		});
		const markAsRead = vi.fn(() => new Promise<void>((resolve) => setTimeout(() => resolve(), 50)));
		const client = fakeNotificationsClient({
			markAsRead,
			list: () =>
				Promise.resolve({
					notifications: [makeNotification("a"), makeNotification("b")],
					readIds: ["a"],
				}),
		});

		const { result } = renderHook(() => useMarkNotificationAsRead(), { wrapper: wrapperFactory(client) });

		act(() => {
			result.current.mutate("a");
		});

		await waitFor(() => {
			const data = queryClient.getQueryData<NotificationsResponse>(["notifications"]);
			expect(data?.readIds).toContain("a");
		});
		expect(markAsRead).toHaveBeenCalledWith("a");
	});

	it("triggers refetch via invalidation after success", async () => {
		const list = vi
			.fn()
			.mockResolvedValueOnce({ notifications: [makeNotification("a")], readIds: [] })
			.mockResolvedValueOnce({ notifications: [makeNotification("a")], readIds: ["a"] });
		const client = fakeNotificationsClient({ list, markAsRead: vi.fn().mockResolvedValue(undefined) });

		const { result: read } = renderHook(() => useNotifications(), { wrapper: wrapperFactory(client) });
		const { result: mark } = renderHook(() => useMarkNotificationAsRead(), { wrapper: wrapperFactory(client) });

		await waitFor(() => expect(read.current.unreadCount).toBe(1));

		await act(async () => {
			await mark.current.mutateAsync("a");
		});

		await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(read.current.unreadCount).toBe(0));
	});
});

describe("useMarkAllNotificationsAsRead", () => {
	it("optimistically marks every cached notification as read", async () => {
		queryClient.setQueryData<NotificationsResponse>(["notifications"], {
			notifications: [makeNotification("a"), makeNotification("b"), makeNotification("c")],
			readIds: [],
		});
		const markAllAsRead = vi.fn(() => new Promise<void>((resolve) => setTimeout(() => resolve(), 50)));
		const client = fakeNotificationsClient({
			markAllAsRead,
			list: () =>
				Promise.resolve({
					notifications: [makeNotification("a"), makeNotification("b"), makeNotification("c")],
					readIds: ["a", "b", "c"],
				}),
		});

		const { result } = renderHook(() => useMarkAllNotificationsAsRead(), { wrapper: wrapperFactory(client) });

		act(() => {
			result.current.mutate();
		});

		await waitFor(() => {
			const data = queryClient.getQueryData<NotificationsResponse>(["notifications"]);
			expect(new Set(data?.readIds ?? [])).toEqual(new Set(["a", "b", "c"]));
		});
		expect(markAllAsRead).toHaveBeenCalledTimes(1);
	});
});
