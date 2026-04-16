import { delay, nextId } from "./mock-utils";

export interface MockLoginResponse {
	access: string;
	refresh: string;
	user: { email: string };
}

export interface MockRegisterData {
	email: string;
	password: string;
	first_name: string;
	phone: string;
	invitation_code: string;
}

function issueTokens(email: string): MockLoginResponse {
	return {
		access: nextId("access"),
		refresh: nextId("refresh"),
		user: { email },
	};
}

export async function loginMock(email: string, _password: string): Promise<MockLoginResponse> {
	await delay();
	return issueTokens(email);
}

export async function registerMock(data: MockRegisterData): Promise<MockLoginResponse> {
	await delay();
	return issueTokens(data.email);
}

export async function checkEmailMock(_email: string): Promise<{ exists: boolean }> {
	await delay();
	return { exists: false };
}

export async function verifyInvitationCodeMock(_code: string): Promise<{ valid: boolean }> {
	await delay();
	return { valid: true };
}

export async function confirmEmailMock(_token: string): Promise<{ message: string }> {
	await delay();
	return { message: "Email confirmed successfully" };
}

export async function forgotPasswordMock(_email: string): Promise<{ detail: string }> {
	await delay();
	return { detail: "Password reset email sent" };
}

export async function resetPasswordMock(_token: string, _password: string): Promise<{ detail: string }> {
	await delay();
	return { detail: "Password has been reset" };
}

export async function logoutMock(): Promise<void> {
	await delay();
}
