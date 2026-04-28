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
