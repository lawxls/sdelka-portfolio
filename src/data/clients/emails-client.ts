import type { AddEmailPayload, WorkspaceEmail } from "../domains/emails";
import type { EmailStatus, EmailType } from "../emails-mock-data";

export interface ListEmailsFilter {
	archived?: boolean;
	q?: string;
	status?: EmailStatus;
	type?: EmailType;
}

/** Roster is small and bounded — list is a flat array, not a cursor page. */
export interface EmailsClient {
	list(opts?: ListEmailsFilter): Promise<WorkspaceEmail[]>;
	add(payload: AddEmailPayload): Promise<WorkspaceEmail>;
	/** Bulk variant of `add` — the backend creates all rows in a single
	 * transaction so a partial batch never lands. */
	addMany(payloads: AddEmailPayload[]): Promise<WorkspaceEmail[]>;
	delete(ids: string[]): Promise<void>;
	archive(ids: string[]): Promise<void>;
	unarchive(ids: string[]): Promise<void>;
	disable(ids: string[]): Promise<void>;
}
