import { delay } from "./mock-utils";
import type { Notification } from "./notification-types";

const READ_IDS_KEY = "notification-read-ids";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

type SeedBase = { id: string; offsetMs: number; initiallyRead?: boolean };
type SeedEntry =
	| (SeedBase & { type: "search_completed"; itemId: string })
	| (SeedBase & { type: "task_assigned"; taskId: string })
	| (SeedBase & { type: "offer_received"; itemId: string; supplierId: string })
	| (SeedBase & { type: "task_deadline_24h"; taskId: string })
	| (SeedBase & { type: "negotiation_completed"; itemId: string });

const SEED_NOTIFICATIONS: SeedEntry[] = [
	{ id: "notif-1", type: "search_completed", itemId: "item-2", offsetMs: 5 * MINUTE_MS },
	{ id: "notif-2", type: "task_assigned", taskId: "task-1", offsetMs: 15 * MINUTE_MS },
	{
		id: "notif-3",
		type: "offer_received",
		itemId: "item-1",
		supplierId: "supplier-item-1-10",
		offsetMs: 45 * MINUTE_MS,
	},
	{ id: "notif-4", type: "task_deadline_24h", taskId: "task-2", offsetMs: 2 * HOUR_MS },
	{ id: "notif-5", type: "offer_received", itemId: "item-1", supplierId: "supplier-item-1-26", offsetMs: 3 * HOUR_MS },
	{ id: "notif-6", type: "negotiation_completed", itemId: "item-1", offsetMs: 5 * HOUR_MS, initiallyRead: true },
	{ id: "notif-7", type: "task_assigned", taskId: "task-4", offsetMs: 8 * HOUR_MS, initiallyRead: true },
	{ id: "notif-8", type: "search_completed", itemId: "item-3", offsetMs: 20 * HOUR_MS, initiallyRead: true },
	{
		id: "notif-9",
		type: "offer_received",
		itemId: "item-1",
		supplierId: "supplier-item-1-11",
		offsetMs: DAY_MS + 2 * HOUR_MS,
		initiallyRead: true,
	},
	{ id: "notif-10", type: "task_deadline_24h", taskId: "task-5", offsetMs: DAY_MS + 6 * HOUR_MS, initiallyRead: true },
	{ id: "notif-11", type: "task_assigned", taskId: "task-7", offsetMs: 2 * DAY_MS, initiallyRead: true },
	{
		id: "notif-12",
		type: "search_completed",
		itemId: "item-5",
		offsetMs: 2 * DAY_MS + 4 * HOUR_MS,
		initiallyRead: true,
	},
	{
		id: "notif-13",
		type: "offer_received",
		itemId: "item-1",
		supplierId: "supplier-item-1-34",
		offsetMs: 3 * DAY_MS,
		initiallyRead: true,
	},
	{
		id: "notif-14",
		type: "negotiation_completed",
		itemId: "item-4",
		offsetMs: 3 * DAY_MS + 5 * HOUR_MS,
		initiallyRead: true,
	},
	{ id: "notif-15", type: "task_deadline_24h", taskId: "task-8", offsetMs: 4 * DAY_MS, initiallyRead: true },
	{ id: "notif-16", type: "task_assigned", taskId: "task-10", offsetMs: 5 * DAY_MS, initiallyRead: true },
	{
		id: "notif-17",
		type: "search_completed",
		itemId: "item-6",
		offsetMs: 5 * DAY_MS + 8 * HOUR_MS,
		initiallyRead: true,
	},
	{
		id: "notif-18",
		type: "offer_received",
		itemId: "item-1",
		supplierId: "supplier-item-1-35",
		offsetMs: 6 * DAY_MS,
		initiallyRead: true,
	},
	{
		id: "notif-19",
		type: "negotiation_completed",
		itemId: "item-5",
		offsetMs: 6 * DAY_MS + 6 * HOUR_MS,
		initiallyRead: true,
	},
	{ id: "notif-20", type: "task_deadline_24h", taskId: "task-11", offsetMs: 7 * DAY_MS, initiallyRead: true },
];

function hydrate(seeds: SeedEntry[], now: number): { notifications: Notification[]; initiallyReadIds: string[] } {
	const notifications: Notification[] = [];
	const initiallyReadIds: string[] = [];
	for (const s of seeds) {
		const createdAt = new Date(now - s.offsetMs).toISOString();
		if (s.initiallyRead) initiallyReadIds.push(s.id);
		switch (s.type) {
			case "search_completed":
				notifications.push({ id: s.id, type: s.type, itemId: s.itemId, createdAt });
				break;
			case "task_assigned":
				notifications.push({ id: s.id, type: s.type, taskId: s.taskId, createdAt });
				break;
			case "offer_received":
				notifications.push({ id: s.id, type: s.type, itemId: s.itemId, supplierId: s.supplierId, createdAt });
				break;
			case "task_deadline_24h":
				notifications.push({ id: s.id, type: s.type, taskId: s.taskId, createdAt });
				break;
			case "negotiation_completed":
				notifications.push({ id: s.id, type: s.type, itemId: s.itemId, createdAt });
				break;
		}
	}
	return { notifications, initiallyReadIds };
}

let notificationsStore: Notification[] = [];
let readIdsStore: Set<string> = new Set();

function readIdsFromStorage(): Set<string> | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(READ_IDS_KEY);
		if (raw == null) return null;
		const parsed = JSON.parse(raw) as unknown;
		if (Array.isArray(parsed)) return new Set(parsed.map(String));
	} catch {
		// fall through
	}
	return null;
}

function persistReadIds(): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(READ_IDS_KEY, JSON.stringify([...readIdsStore]));
	} catch {
		// noop — quota/private-mode
	}
}

function seedStore(): void {
	const { notifications, initiallyReadIds } = hydrate(SEED_NOTIFICATIONS, Date.now());
	notificationsStore = notifications;
	const persisted = readIdsFromStorage();
	if (persisted) {
		readIdsStore = persisted;
	} else {
		readIdsStore = new Set(initiallyReadIds);
		persistReadIds();
	}
}

seedStore();

// --- Test helpers ---

export function _resetNotificationsStore(): void {
	if (typeof window !== "undefined") window.localStorage.removeItem(READ_IDS_KEY);
	seedStore();
}

export function _setNotifications(list: Notification[], readIds: string[] = []): void {
	notificationsStore = list.map((n) => ({ ...n }));
	readIdsStore = new Set(readIds);
	persistReadIds();
}

// --- Public API ---

export interface NotificationsPage {
	notifications: Notification[];
	readIds: string[];
}

export async function fetchNotificationsMock(): Promise<NotificationsPage> {
	await delay();
	const sorted = [...notificationsStore].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
	return { notifications: sorted, readIds: [...readIdsStore] };
}

export async function markNotificationAsReadMock(id: string): Promise<void> {
	await delay();
	readIdsStore.add(id);
	persistReadIds();
}

export async function markAllNotificationsAsReadMock(): Promise<void> {
	await delay();
	for (const n of notificationsStore) readIdsStore.add(n.id);
	persistReadIds();
}
