import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetMockDelay, _setMockDelay } from "../mock-utils";
import type { Notification } from "../notification-types";
import type { NotificationsClient } from "./notifications-client";
import { createHttpNotificationsClient } from "./notifications-http";
import { createInMemoryNotificationsClient } from "./notifications-in-memory";

/**
 * Layer B — adapter contract tests for the in-memory adapter (the seed/store
 * one used by every test that wants pre-populated notifications).
 *
 * The HTTP adapter does NOT participate in the contract: the backend has no
 * notifications endpoint yet, so the HTTP client is a no-op stub. Its own
 * behavior is exercised separately below.
 */

const SEED: Notification[] = [
	{ id: "n1", type: "task_assigned", taskId: "task-1", createdAt: "2026-04-22T12:00:00.000Z" },
	{ id: "n2", type: "search_completed", itemId: "item-1", createdAt: "2026-04-22T11:00:00.000Z" },
	{ id: "n3", type: "offer_received", itemId: "item-1", supplierId: "s-1", createdAt: "2026-04-22T10:00:00.000Z" },
];

describe("NotificationsClient contract — memory adapter", () => {
	let client: NotificationsClient;

	beforeEach(() => {
		_setMockDelay(0, 0);
		client = createInMemoryNotificationsClient({ seed: SEED.map((n) => ({ ...n })) });
	});

	afterEach(() => {
		vi.restoreAllMocks();
		_resetMockDelay();
	});

	it("list returns the seeded notifications, sorted desc by createdAt", async () => {
		const { notifications } = await client.list();
		expect(notifications.map((n) => n.id)).toEqual(["n1", "n2", "n3"]);
	});

	it("list starts with no read ids", async () => {
		const { readIds } = await client.list();
		expect(readIds).toEqual([]);
	});

	it("markAsRead adds the id to the read set for that notification only", async () => {
		await client.markAsRead("n1");
		const { readIds } = await client.list();
		expect(readIds).toContain("n1");
		expect(readIds).not.toContain("n2");
	});

	it("markAsRead is idempotent", async () => {
		await client.markAsRead("n1");
		await client.markAsRead("n1");
		const { readIds } = await client.list();
		expect(readIds.filter((id) => id === "n1")).toHaveLength(1);
	});

	it("markAllAsRead marks every current notification as read", async () => {
		await client.markAllAsRead();
		const { readIds } = await client.list();
		expect(new Set(readIds)).toEqual(new Set(["n1", "n2", "n3"]));
	});
});

describe("HTTP notifications adapter (no-op stub)", () => {
	it("does not call fetch", async () => {
		const fetchStub = vi.fn();
		// biome-ignore lint/suspicious/noExplicitAny: ad-hoc stub for assertion only
		const client = createHttpNotificationsClient({ get: fetchStub, post: fetchStub } as any);
		await client.list();
		await client.markAsRead("n1");
		await client.markAllAsRead();
		expect(fetchStub).not.toHaveBeenCalled();
	});

	it("list resolves to an empty NotificationsResponse", async () => {
		const client = createHttpNotificationsClient();
		await expect(client.list()).resolves.toEqual({ notifications: [], readIds: [] });
	});

	it("markAsRead and markAllAsRead resolve without throwing", async () => {
		const client = createHttpNotificationsClient();
		await expect(client.markAsRead("n1")).resolves.toBeUndefined();
		await expect(client.markAllAsRead()).resolves.toBeUndefined();
	});
});
