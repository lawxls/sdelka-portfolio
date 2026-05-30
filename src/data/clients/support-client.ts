/**
 * Public seam for the support domain. The «Поддержка» dialog calls this to
 * forward the user's message (and optional file attachments) to the backend,
 * which persists it and queues Telegram delivery. The backend attaches the
 * authenticated user identity itself — the FE only sends the message and files.
 */
export interface SendSupportMessageInput {
	/** Trimmed, non-blank message. Backend caps length at 3500 chars. */
	message: string;
	/** Optional attachments. Backend caps at 10 files, 20 MB each. */
	attachments?: File[];
}

export interface SupportClient {
	send(input: SendSupportMessageInput): Promise<void>;
}
