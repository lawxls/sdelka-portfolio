import type { WorkspaceEmail } from "../domains/emails";

export const SEED_EMAILS: WorkspaceEmail[] = [
	{ id: "email-1", email: "ivan.zhuravlyov.58@mostholding.ru", status: "active", type: "corporate", sentCount: 482 },
	{ id: "email-2", email: "procurement@ormatek.com", status: "active", type: "service", sentCount: 1204 },
	{ id: "email-3", email: "suppliers@ormatek.com", status: "active", type: "service", sentCount: 318 },
	{ id: "email-4", email: "tender-archive@ormatek.com", status: "disabled", type: "service", sentCount: 96 },
	{ id: "email-5", email: "legacy-import@ormatek.com", status: "disabled", type: "corporate", sentCount: 0 },
];
