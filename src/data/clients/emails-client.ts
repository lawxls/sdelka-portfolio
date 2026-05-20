import type { AddEmailPayload, WorkspaceEmail } from "../domains/emails";

/** Roster is small and bounded — list is a flat array, not a cursor page. */
export interface EmailsClient {
	list(opts?: { archived?: boolean }): Promise<WorkspaceEmail[]>;
	add(payload: AddEmailPayload): Promise<WorkspaceEmail>;
	delete(ids: string[]): Promise<void>;
	archive(ids: string[]): Promise<void>;
	disable(ids: string[]): Promise<void>;
}
