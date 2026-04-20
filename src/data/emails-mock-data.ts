import { delay, nextId } from "./mock-utils";

export type EmailStatus = "active" | "disabled";

export interface WorkspaceEmail {
	id: string;
	email: string;
	status: EmailStatus;
	sentCount: number;
}

const SEED: WorkspaceEmail[] = [
	{ id: "email-1", email: "ivan.zhuravlyov.58@mostholding.ru", status: "active", sentCount: 482 },
	{ id: "email-2", email: "procurement@ormatek.com", status: "active", sentCount: 1204 },
	{ id: "email-3", email: "suppliers@ormatek.com", status: "active", sentCount: 318 },
	{ id: "email-4", email: "tender-archive@ormatek.com", status: "disabled", sentCount: 96 },
	{ id: "email-5", email: "legacy-import@ormatek.com", status: "disabled", sentCount: 0 },
];

let emailsStore: WorkspaceEmail[] = SEED.map((e) => ({ ...e }));

export async function fetchEmailsMock(): Promise<WorkspaceEmail[]> {
	await delay();
	return emailsStore.map((e) => ({ ...e }));
}

export async function addEmailMock(email: string): Promise<WorkspaceEmail> {
	await delay();
	const record: WorkspaceEmail = {
		id: nextId("email"),
		email,
		status: "active",
		sentCount: 0,
	};
	emailsStore = [...emailsStore, record];
	return { ...record };
}

export async function deleteEmailsMock(ids: string[]): Promise<void> {
	await delay();
	const toRemove = new Set(ids);
	emailsStore = emailsStore.filter((e) => !toRemove.has(e.id));
}

export async function disableEmailsMock(ids: string[]): Promise<void> {
	await delay();
	const toDisable = new Set(ids);
	emailsStore = emailsStore.map((e) => (toDisable.has(e.id) ? { ...e, status: "disabled" } : e));
}
