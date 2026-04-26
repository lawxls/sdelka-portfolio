import { delay, nextId } from "./mock-utils";

export type EmailStatus = "active" | "disabled";
export type EmailType = "service" | "corporate";

export const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
	service: "Сервисная",
	corporate: "Корпоративная",
};

export interface WorkspaceEmail {
	id: string;
	email: string;
	status: EmailStatus;
	type: EmailType;
	sentCount: number;
	smtpHost?: string;
	smtpPort?: number;
	imapHost?: string;
	imapPort?: number;
}

export interface AddEmailPayload {
	email: string;
	password: string;
	smtpHost: string;
	smtpPort: number;
	imapHost: string;
	imapPort: number;
}

const SEED: WorkspaceEmail[] = [
	{ id: "email-1", email: "ivan.zhuravlyov.58@mostholding.ru", status: "active", type: "corporate", sentCount: 482 },
	{ id: "email-2", email: "procurement@ormatek.com", status: "active", type: "service", sentCount: 1204 },
	{ id: "email-3", email: "suppliers@ormatek.com", status: "active", type: "service", sentCount: 318 },
	{ id: "email-4", email: "tender-archive@ormatek.com", status: "disabled", type: "service", sentCount: 96 },
	{ id: "email-5", email: "legacy-import@ormatek.com", status: "disabled", type: "corporate", sentCount: 0 },
];

let emailsStore: WorkspaceEmail[] = SEED.map((e) => ({ ...e }));

export async function fetchEmailsMock(): Promise<WorkspaceEmail[]> {
	await delay();
	return emailsStore.map((e) => ({ ...e }));
}

export async function addEmailMock(payload: AddEmailPayload): Promise<WorkspaceEmail> {
	await delay();
	const record: WorkspaceEmail = {
		id: nextId("email"),
		email: payload.email,
		status: "active",
		type: "corporate",
		sentCount: 0,
		smtpHost: payload.smtpHost,
		smtpPort: payload.smtpPort,
		imapHost: payload.imapHost,
		imapPort: payload.imapPort,
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
