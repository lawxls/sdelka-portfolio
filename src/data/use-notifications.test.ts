import type { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper, createTestQueryClient } from "@/test-utils";
import type { Notification } from "./notification-types";
import * as notificationsMock from "./notifications-mock-data";
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

beforeEach(() => {
	window.localStorage.clear();
	queryClient = createTestQueryClient();
	notificationsMock._resetNotificationsStore();
});

afterEach(() => {
	window.localStorage.clear();
	vi.restoreAllMocks();
});

describe("useNotifications", () => {
	it("returns notifications and computes unreadCount", async () => {
		notificationsMock._setNotifications([makeNotification("a"), makeNotification("b"), makeNotification("c")], ["b"]);

		const { result } = renderHook(() => useNotifications(), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.notifications).toHaveLength(3);
		});
		expect(result.current.unreadCount).toBe(2);
		expect(result.current.isRead("b")).toBe(true);
		expect(result.current.isRead("a")).toBe(false);
	});

	it("unreadCount is 0 when all notifications are read", async () => {
		notificationsMock._setNotifications([makeNotification("a"), makeNotification("b")], ["a", "b"]);

		const { result } = renderHook(() => useNotifications(), { wrapper: createQueryWrapper(queryClient) });

		await waitFor(() => {
			expect(result.current.notifications).toHaveLength(2);
		});
		expect(result.current.unreadCount).toBe(0);
	});
});

describe("useMarkNotificationAsRead", () => {
	it("marks a single notification as read and updates unreadCount", async () => {
		notificationsMock._setNotifications([makeNotification("a"), makeNotification("b")], []);

		const { result: list } = renderHook(() => useNotifications(), { wrapper: createQueryWrapper(queryClient) });
		const { result: mark } = renderHook(() => useMarkNotificationAsRead(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(list.current.unreadCount).toBe(2);
		});

		mark.current.mutate("a");

		await waitFor(() => {
			expect(list.current.unreadCount).toBe(1);
		});
		expect(list.current.isRead("a")).toBe(true);
	});
});

describe("useMarkAllNotificationsAsRead", () => {
	it("marks every notification as read", async () => {
		notificationsMock._setNotifications([makeNotification("a"), makeNotification("b"), makeNotification("c")], []);

		const { result: list } = renderHook(() => useNotifications(), { wrapper: createQueryWrapper(queryClient) });
		const { result: markAll } = renderHook(() => useMarkAllNotificationsAsRead(), {
			wrapper: createQueryWrapper(queryClient),
		});

		await waitFor(() => {
			expect(list.current.unreadCount).toBe(3);
		});

		markAll.current.mutate();

		await waitFor(() => {
			expect(list.current.unreadCount).toBe(0);
		});
	});
});
