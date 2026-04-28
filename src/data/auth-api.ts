import {
	checkEmailMock,
	confirmEmailMock,
	forgotPasswordMock,
	loginMock,
	logoutMock,
	registerMock,
	resetPasswordMock,
} from "./auth-mock-data";

export interface LoginResponse {
	access: string;
	refresh: string;
	user: { email: string };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
	return loginMock(email, password);
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

export function extractFormErrors(_err: unknown): { error: string | null; fieldErrors: Record<string, string> } {
	return { error: "Произошла ошибка. Попробуйте ещё раз.", fieldErrors: {} };
}
