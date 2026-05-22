import type { AddEmailPayload, WorkspaceEmail } from "../domains/emails";
import { delay, nextId } from "../mock-utils";
import { SEED_EMAILS } from "../seeds/emails";
import type { EmailsClient } from "./emails-client";

interface MockRecord extends WorkspaceEmail {
	archived: boolean;
}

export function createInMemoryEmailsClient(seed: WorkspaceEmail[] = SEED_EMAILS): EmailsClient {
	let store: MockRecord[] = seed.map((e) => ({ ...e, archived: false }));

	function toPublic(r: MockRecord): WorkspaceEmail {
		const { archived: _archived, ...rest } = r;
		return rest;
	}

	function makeRecord(payload: AddEmailPayload): MockRecord {
		return {
			id: nextId("email"),
			email: payload.email,
			status: "active",
			type: "corporate",
			sentCount: 0,
			smtpHost: payload.smtpHost,
			smtpPort: payload.smtpPort,
			imapHost: payload.imapHost,
			imapPort: payload.imapPort,
			archived: false,
		};
	}

	return {
		async list(opts = {}): Promise<WorkspaceEmail[]> {
			await delay();
			const archived = opts.archived ?? false;
			const needle = opts.q?.toLowerCase();
			return store
				.filter((e) => {
					if (e.archived !== archived) return false;
					if (opts.status && e.status !== opts.status) return false;
					if (opts.type && e.type !== opts.type) return false;
					if (needle && !e.email.toLowerCase().includes(needle)) return false;
					return true;
				})
				.map(toPublic);
		},

		async add(payload: AddEmailPayload): Promise<WorkspaceEmail> {
			await delay();
			const record = makeRecord(payload);
			store = [...store, record];
			return toPublic(record);
		},

		async addMany(payloads: AddEmailPayload[]): Promise<WorkspaceEmail[]> {
			await delay();
			const created = payloads.map(makeRecord);
			store = [...store, ...created];
			return created.map(toPublic);
		},

		async delete(ids: string[]): Promise<void> {
			await delay();
			const toRemove = new Set(ids);
			store = store.filter((e) => !toRemove.has(e.id));
		},

		async archive(ids: string[]): Promise<void> {
			await delay();
			const toArchive = new Set(ids);
			store = store.map((e) => (toArchive.has(e.id) ? { ...e, archived: true } : e));
		},

		async unarchive(ids: string[]): Promise<void> {
			await delay();
			const toUnarchive = new Set(ids);
			store = store.map((e) => (toUnarchive.has(e.id) ? { ...e, archived: false } : e));
		},

		async disable(ids: string[]): Promise<void> {
			await delay();
			const toDisable = new Set(ids);
			store = store.map((e) => (toDisable.has(e.id) ? { ...e, status: "disabled" } : e));
		},
	};
}
