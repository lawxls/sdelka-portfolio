import type { CurrentEmployee, SettingsPatch } from "../domains/profile";
import { delay } from "../mock-utils";
import type { ProfileClient } from "./profile-client";

const DEFAULT_ME: CurrentEmployee = {
	id: 1,
	email: "ivan.zhuravlyov.58@mostholding.ru",
	firstName: "Иван",
	lastName: "Журавлёв",
	patronymic: "Сергеевич",
	phone: "+79161000001",
	avatarIcon: "blue",
	mailingAllowed: true,
	emailSignature: "",
	dateJoined: "2024-01-15T10:00:00Z",
	role: "admin",
	isWorkspaceOwner: true,
	permissions: {
		id: "perm-me-1",
		employeeId: "1",
		procurementInquiries: "edit",
		positions: "edit",
		tasks: "edit",
		workspaceSettings: "edit",
		companies: "edit",
		employees: "edit",
		emails: "edit",
	},
};

export interface InMemoryProfileOptions {
	/** Replace the seeded current-user record. Tests pass this to land on a
	 * known starting identity (e.g. a non-admin user for permission-aware tests
	 * or a custom name for display assertions). */
	me?: CurrentEmployee;
}

/**
 * Build a closure-isolated in-memory profile adapter. State lives in the
 * closure — every call to the factory produces an independent store, so tests
 * don't need to reset shared module state.
 */
export function createInMemoryProfileClient(options?: InMemoryProfileOptions): ProfileClient {
	let me: CurrentEmployee = { ...(options?.me ?? DEFAULT_ME) };

	return {
		async me(): Promise<CurrentEmployee> {
			await delay();
			return { ...me };
		},

		async update(patch: SettingsPatch): Promise<CurrentEmployee> {
			await delay();
			me = { ...me, ...patch };
			return { ...me };
		},
	};
}
