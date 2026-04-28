import type { AddEmailPayload, WorkspaceEmail } from "../domains/emails";
import { delay, nextId } from "../mock-utils";
import { SEED_EMAILS } from "../seeds/emails";
import type { EmailsClient } from "./emails-client";

/**
 * Build a fresh in-memory emails adapter with isolated state. The emails
 * domain has no cross-entity callers (nothing else mutates the inbox roster),
 * so closure isolation is the cleanest fit — a test that seeds with `[]` gets
 * a clean slate without any reach-in to a module-level singleton.
 *
 * Production composition root passes the default seed; tests pass their own.
 */
export function createInMemoryEmailsClient(seed: WorkspaceEmail[] = SEED_EMAILS): EmailsClient {
	let store: WorkspaceEmail[] = seed.map((e) => ({ ...e }));

	return {
		async list(): Promise<WorkspaceEmail[]> {
			await delay();
			return store.map((e) => ({ ...e }));
		},

		async add(payload: AddEmailPayload): Promise<WorkspaceEmail> {
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
			store = [...store, record];
			return { ...record };
		},

		async delete(ids: string[]): Promise<void> {
			await delay();
			const toRemove = new Set(ids);
			store = store.filter((e) => !toRemove.has(e.id));
		},

		async disable(ids: string[]): Promise<void> {
			await delay();
			const toDisable = new Set(ids);
			store = store.map((e) => (toDisable.has(e.id) ? { ...e, status: "disabled" } : e));
		},
	};
}
