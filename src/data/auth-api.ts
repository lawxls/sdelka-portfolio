import { ApiError } from "./api-error";
import {
	checkEmailMock,
	confirmEmailMock,
	forgotPasswordMock,
	loginMock,
	logoutMock,
	registerMock,
	resetPasswordMock,
	verifyInvitationCodeMock,
} from "./auth-mock-data";

export interface LoginResponse {
	access: string;
	refresh: string;
	user: { email: string };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
	return loginMock(email, password);
}

export interface VerifyInvitationCodeResponse {
	valid: boolean;
}

export async function verifyInvitationCode(code: string): Promise<VerifyInvitationCodeResponse> {
	return verifyInvitationCodeMock(code);
}

export interface CheckEmailResponse {
	exists: boolean;
}

export async function checkEmail(email: string): Promise<CheckEmailResponse> {
	return checkEmailMock(email);
}

export interface RegisterData {
	email: string;
	password: string;
	first_name: string;
	phone: string;
	invitation_code: string;
}

export async function register(data: RegisterData): Promise<LoginResponse> {
	return registerMock(data);
}

export interface ConfirmEmailResponse {
	message: string;
}

export async function confirmEmail(token: string): Promise<ConfirmEmailResponse> {
	return confirmEmailMock(token);
}

export interface ForgotPasswordResponse {
	detail: string;
}

export interface ResetPasswordResponse {
	detail: string;
}

export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
	return forgotPasswordMock(email);
}

export async function resetPassword(token: string, password: string): Promise<ResetPasswordResponse> {
	return resetPasswordMock(token, password);
}

export async function logout(): Promise<void> {
	return logoutMock();
}

export interface ParsedApiError {
	fieldErrors: Record<string, string>;
	detail: string | null;
}

export function parseApiError(body: unknown): ParsedApiError {
	const result: ParsedApiError = { fieldErrors: {}, detail: null };
	if (!body || typeof body !== "object") return result;

	const record = body as Record<string, unknown>;
	for (const [key, value] of Object.entries(record)) {
		if (key === "detail" && typeof value === "string") {
			result.detail = value;
		} else if (key === "detail" && Array.isArray(value)) {
			result.detail = value.join(". ");
		} else if (typeof value === "string") {
			result.fieldErrors[key] = value;
		} else if (Array.isArray(value) && value.length > 0) {
			result.fieldErrors[key] = value.join(". ");
		}
	}
	return result;
}

export function extractFormErrors(err: unknown): { error: string | null; fieldErrors: Record<string, string> } {
	const body = err instanceof ApiError ? err.body : undefined;
	const parsed = parseApiError(body);
	const hasFields = Object.keys(parsed.fieldErrors).length > 0;
	return {
		error: parsed.detail ?? (hasFields ? null : "Произошла ошибка. Попробуйте ещё раз."),
		fieldErrors: parsed.fieldErrors,
	};
}
