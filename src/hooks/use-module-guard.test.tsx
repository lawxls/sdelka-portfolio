import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createInMemoryProfileClient } from "@/data/clients/profile-in-memory";
import type { CurrentEmployee } from "@/data/domains/profile";
import { _resetMockDelay, _setMockDelay } from "@/data/mock-utils";
import { TestClientsProvider } from "@/data/test-clients-provider";
import { createTestQueryClient, makeMe } from "@/test-utils";
import { useModuleGuard } from "./use-module-guard";

const toastErrorSpy = vi.fn();
vi.mock("sonner", () => ({
	toast: {
		error: (msg: string) => toastErrorSpy(msg),
		success: vi.fn(),
		info: vi.fn(),
	},
}));

beforeEach(() => {
	toastErrorSpy.mockClear();
	_setMockDelay(0, 0);
});

afterEach(() => {
	_resetMockDelay();
});

function buildWrapper(me: CurrentEmployee) {
	const queryClient = createTestQueryClient();
	queryClient.setQueryData(["me"], me);
	return ({ children }: { children: ReactNode }) => (
		<TestClientsProvider queryClient={queryClient} clients={{ profile: createInMemoryProfileClient({ me }) }}>
			{children}
		</TestClientsProvider>
	);
}

describe("useModuleGuard", () => {
	test("admin canEdit is true; guard(fn) calls through", () => {
		const wrapper = buildWrapper(makeMe());
		const handler = vi.fn();
		const { result } = renderHook(() => useModuleGuard("employees"), { wrapper });
		expect(result.current.canEdit).toBe(true);
		result.current.guard(handler)();
		expect(handler).toHaveBeenCalledOnce();
		expect(toastErrorSpy).not.toHaveBeenCalled();
	});

	test("view-only canEdit is false; guard(fn) fires the module-named toast and skips the handler", () => {
		const me = makeMe({
			role: "user",
			isWorkspaceOwner: false,
			permissions: {
				id: "p-1",
				employeeId: "1",
				procurementInquiries: "view",
				positions: "view",
				tasks: "view",
				workspaceSettings: "view",
				companies: "view",
				employees: "view",
				emails: "view",
			},
		});
		const wrapper = buildWrapper(me);
		const handler = vi.fn();
		const { result } = renderHook(() => useModuleGuard("employees"), { wrapper });
		expect(result.current.canEdit).toBe(false);
		result.current.guard(handler)();
		expect(handler).not.toHaveBeenCalled();
		expect(toastErrorSpy).toHaveBeenCalledWith("Нет прав на редактирование в модуле «Сотрудники»");
	});

	test("user with no permissions resolves to canEdit=false on every module", () => {
		const me = makeMe({ role: null, permissions: null, isWorkspaceOwner: false });
		const wrapper = buildWrapper(me);
		const { result } = renderHook(() => useModuleGuard("tasks"), { wrapper });
		expect(result.current.canEdit).toBe(false);
		result.current.guard(() => {
			throw new Error("should not run");
		})();
		expect(toastErrorSpy).toHaveBeenCalledWith("Нет прав на редактирование в модуле «Вопросы»");
	});

	test("guard passes through arguments to the wrapped handler when canEdit is true", () => {
		const wrapper = buildWrapper(makeMe());
		const handler = vi.fn();
		const { result } = renderHook(() => useModuleGuard("companies"), { wrapper });
		result.current.guard(handler)("first", 2, { a: true });
		expect(handler).toHaveBeenCalledWith("first", 2, { a: true });
	});
});
