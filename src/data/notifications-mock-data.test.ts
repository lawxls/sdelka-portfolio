import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Notification } from "./notification-types";
import {
	_resetNotificationsStore,
	_setNotifications,
	fetchNotificationsMock,
	markAllNotificationsAsReadMock,
	markNotificationAsReadMock,
} from "./notifications-mock-data";

function makeNotification(id: string, overrides: Partial<Notification> = {}): Notification {
	return {
		id,
		type: "task_assigned",
		taskId: "task-1",
		createdAt: "2026-04-22T10:00:00.000Z",
		...overrides,
	} as Notification;
}

beforeEach(() => {
	window.localStorage.clear();
	_resetNotificationsStore();
});

afterEach(() => {
	window.localStorage.clear();
});

describe("fetchNotificationsMock", () => {
	it("returns seeded notifications sorted by createdAt descending", async () => {
		const { notifications } = await fetchNotificationsMock();
		expect(notifications.length).toBeGreaterThan(0);
		for (let i = 1; i < notifications.length; i += 1) {
			expect(notifications[i - 1].createdAt >= notifications[i].createdAt).toBe(true);
		}
	});

	it("covers every supported notification type", async () => {
		const { notifications } = await fetchNotificationsMock();
		const types = new Set(notifications.map((n) => n.type));
		expect(types.has("search_completed")).toBe(true);
		expect(types.has("task_assigned")).toBe(true);
		expect(types.has("offer_received")).toBe(true);
		expect(types.has("task_deadline_24h")).toBe(true);
		expect(types.has("negotiation_completed")).toBe(true);
	});

	it("applies initiallyRead seed defaults when no localStorage is present", async () => {
		const { notifications, readIds } = await fetchNotificationsMock();
		expect(readIds.length).toBeGreaterThan(0);
		expect(readIds.length).toBeLessThan(notifications.length);
	});
});

describe("markNotificationAsReadMock", () => {
	it("adds the id to the read set for that notification only", async () => {
		_setNotifications([makeNotification("n1"), makeNotification("n2")]);
		await markNotificationAsReadMock("n1");

		const { readIds } = await fetchNotificationsMock();
		expect(readIds).toContain("n1");
		expect(readIds).not.toContain("n2");
	});

	it("is idempotent", async () => {
		_setNotifications([makeNotification("n1")]);
		await markNotificationAsReadMock("n1");
		await markNotificationAsReadMock("n1");

		const { readIds } = await fetchNotificationsMock();
		expect(readIds.filter((id) => id === "n1")).toHaveLength(1);
	});

	it("persists the read id to localStorage", async () => {
		_setNotifications([makeNotification("n1")]);
		await markNotificationAsReadMock("n1");

		const raw = window.localStorage.getItem("notification-read-ids");
		expect(raw).not.toBeNull();
		expect(JSON.parse(raw as string)).toContain("n1");
	});
});

describe("markAllNotificationsAsReadMock", () => {
	it("marks every current notification as read", async () => {
		_setNotifications([makeNotification("n1"), makeNotification("n2"), makeNotification("n3")]);
		await markAllNotificationsAsReadMock();

		const { readIds } = await fetchNotificationsMock();
		expect(new Set(readIds)).toEqual(new Set(["n1", "n2", "n3"]));
	});

	it("persists to localStorage", async () => {
		_setNotifications([makeNotification("n1"), makeNotification("n2")]);
		await markAllNotificationsAsReadMock();

		const raw = window.localStorage.getItem("notification-read-ids");
		expect(JSON.parse(raw as string).sort()).toEqual(["n1", "n2"]);
	});
});
