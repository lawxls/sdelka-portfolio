import type { AddEmailPayload, WorkspaceEmail } from "../domains/emails";

/**
 * Public seam for the emails (workspace SMTP/IMAP accounts) domain.
 * Implementations are in-memory (mock store) or HTTP. Hooks pull this through
 * context, so swapping adapters is a one-line change in the composition root.
 *
 * The list response is a flat `WorkspaceEmail[]` — not `CursorPage<T>`, since
 * the workspace inbox roster is a small bounded list, not a paginated feed.
 * `add` returns the canonical record; `delete` and `disable` operate on a set
 * of ids and return void.
 */
export interface EmailsClient {
	list(): Promise<WorkspaceEmail[]>;
	add(payload: AddEmailPayload): Promise<WorkspaceEmail>;
	delete(ids: string[]): Promise<void>;
	disable(ids: string[]): Promise<void>;
}
