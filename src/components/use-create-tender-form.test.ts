import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { useCreateTenderForm } from "./use-create-tender-form";

function setup() {
	return renderHook(() => useCreateTenderForm());
}

function fillStep1Required(result: { current: ReturnType<typeof useCreateTenderForm> }) {
	act(() => {
		result.current.update1("tenderName", "Тендер 1");
		result.current.update1("deadline", "2026-06-01");
		result.current.update1("companyId", "c1");
		result.current.updatePosition(0, "name", "Арматура");
	});
}

describe("useCreateTenderForm", () => {
	test("starts on step 1 with one empty position and empty tender meta", () => {
		const { result } = setup();
		expect(result.current.step).toBe(1);
		expect(result.current.step1.positions).toHaveLength(1);
		expect(result.current.step1.tenderName).toBe("");
		expect(result.current.step1.budget).toBe("");
		expect(result.current.step1.deadline).toBe("");
		expect(result.current.step1.companyId).toBe("");
		expect(result.current.isDirty).toBe(false);
	});

	test("advance from step 1 blocked when tender meta + company + name missing — focus on tenderName first", () => {
		const { result } = setup();

		let outcome: ReturnType<typeof result.current.advance> | undefined;
		act(() => {
			outcome = result.current.advance();
		});

		expect(outcome?.advanced).toBe(false);
		expect(outcome?.focus).toBe("tenderName");
		expect(result.current.step).toBe(1);
		expect(result.current.step1Errors.tenderName).toBeTruthy();
		expect(result.current.step1Errors.deadline).toBeTruthy();
		expect(result.current.step1Errors.company).toBeTruthy();
		expect(result.current.step1Errors.positions[0]?.name).toBeTruthy();
	});

	test("advance blocked on missing deadline focuses deadline once tenderName + company filled", () => {
		const { result } = setup();
		act(() => {
			result.current.update1("tenderName", "Тендер 1");
			result.current.update1("companyId", "c1");
			result.current.updatePosition(0, "name", "Арматура");
		});

		let outcome: ReturnType<typeof result.current.advance> | undefined;
		act(() => {
			outcome = result.current.advance();
		});

		expect(outcome?.advanced).toBe(false);
		expect(outcome?.focus).toBe("deadline");
	});

	test("advance blocked on non-integer budget focuses budget", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => result.current.update1("budget", "abc"));

		let outcome: ReturnType<typeof result.current.advance> | undefined;
		act(() => {
			outcome = result.current.advance();
		});

		expect(outcome?.advanced).toBe(false);
		expect(outcome?.focus).toBe("budget");
		expect(result.current.step1Errors.budget).toBeTruthy();
	});

	test("budget integer is accepted", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => result.current.update1("budget", "1500000"));

		let outcome: ReturnType<typeof result.current.advance> | undefined;
		act(() => {
			outcome = result.current.advance();
		});

		expect(outcome?.advanced).toBe(true);
		expect(result.current.step).toBe(2);
	});

	test("advance from step 1 succeeds with all required tender meta + name", () => {
		const { result } = setup();
		fillStep1Required(result);

		let outcome: ReturnType<typeof result.current.advance> | undefined;
		act(() => {
			outcome = result.current.advance();
		});

		expect(outcome?.advanced).toBe(true);
		expect(result.current.step).toBe(2);
	});

	test("typing in errored tenderName clears error", () => {
		const { result } = setup();
		act(() => {
			result.current.advance();
		});
		expect(result.current.step1Errors.tenderName).toBeTruthy();

		act(() => result.current.update1("tenderName", "X"));
		expect(result.current.step1Errors.tenderName).toBeFalsy();
	});

	test("typing in errored deadline clears error", () => {
		const { result } = setup();
		act(() => {
			result.current.advance();
		});
		expect(result.current.step1Errors.deadline).toBeTruthy();

		act(() => result.current.update1("deadline", "2026-06-01"));
		expect(result.current.step1Errors.deadline).toBeFalsy();
	});

	test("addPosition appends a fresh empty card", () => {
		const { result } = setup();
		act(() => result.current.addPosition());

		expect(result.current.step1.positions).toHaveLength(2);
		expect(result.current.step1.positions[1].name).toBe("");
		expect(result.current.step1Errors.positions).toHaveLength(2);
	});

	test("removePosition drops the targeted card", () => {
		const { result } = setup();
		act(() => result.current.addPosition());
		act(() => result.current.updatePosition(1, "name", "Second"));
		act(() => result.current.removePosition(0));

		expect(result.current.step1.positions).toHaveLength(1);
		expect(result.current.step1.positions[0].name).toBe("Second");
	});

	test("canAddPosition follows last card name", () => {
		const { result } = setup();
		expect(result.current.canAddPosition).toBe(false);

		act(() => result.current.updatePosition(0, "name", "X"));
		expect(result.current.canAddPosition).toBe(true);

		act(() => result.current.addPosition());
		expect(result.current.canAddPosition).toBe(false);
	});

	test("goBack from step 2 returns to step 1 preserving state", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => result.current.updatePosition(0, "description", "М500"));
		act(() => {
			result.current.advance();
		});
		act(() => result.current.update2("companyName", "МеталлТрейд"));
		act(() => result.current.goBack());

		expect(result.current.step).toBe(1);
		expect(result.current.step1.positions[0].name).toBe("Арматура");
		expect(result.current.step1.positions[0].description).toBe("М500");
		expect(result.current.step1.tenderName).toBe("Тендер 1");
		expect(result.current.step2.companyName).toBe("МеталлТрейд");
	});

	test("reset clears all fields and returns to step 1", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => result.current.update1("budget", "100"));
		act(() => result.current.addPosition());
		act(() => {
			result.current.advance();
		});
		act(() => result.current.update2("companyName", "Y"));
		act(() => result.current.reset());

		expect(result.current.step).toBe(1);
		expect(result.current.step1.positions).toHaveLength(1);
		expect(result.current.step1.positions[0].name).toBe("");
		expect(result.current.step1.tenderName).toBe("");
		expect(result.current.step1.budget).toBe("");
		expect(result.current.step1.deadline).toBe("");
		expect(result.current.step1.companyId).toBe("");
		expect(result.current.step2.companyName).toBe("");
		expect(result.current.isDirty).toBe(false);
	});

	test("isDirty flips true when tenderName is set", () => {
		const { result } = setup();
		expect(result.current.isDirty).toBe(false);
		act(() => result.current.update1("tenderName", "X"));
		expect(result.current.isDirty).toBe(true);
	});

	test("isDirty flips true when deadline is set", () => {
		const { result } = setup();
		act(() => result.current.update1("deadline", "2026-06-01"));
		expect(result.current.isDirty).toBe(true);
	});

	// --- INN soft-validation ---

	test("INN with 10 digits is valid", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => {
			result.current.advance();
		});
		act(() => result.current.update2("inn", "1234567890"));
		act(() => {
			result.current.advance();
		});
		expect(result.current.step).toBe(3);
		expect(result.current.step2Errors.inn).toBeFalsy();
	});

	test("INN with 11 digits surfaces error but does not block advance", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => {
			result.current.advance();
		});
		act(() => result.current.update2("inn", "12345678901"));
		act(() => {
			result.current.advance();
		});
		expect(result.current.step).toBe(3);
		expect(result.current.step2Errors.inn).toBeTruthy();
	});

	// --- toPayload() ---

	test("toPayload returns { tender, items } shape with tender meta + per-position items", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => {
			result.current.update1("budget", "1500000");
			result.current.update1("folderId", "folder-metal");
			result.current.updatePosition(0, "pricePerUnit", "100");
		});

		const payload = result.current.toPayload();

		expect(payload.tender).toMatchObject({
			name: "Тендер 1",
			companyId: "c1",
			folderId: "folder-metal",
			budget: 1500000,
			deadline: "2026-06-01",
		});
		expect(payload.items).toHaveLength(1);
		expect(payload.items[0]).toMatchObject({ name: "Арматура", currentPrice: 100 });
	});

	test("toPayload omits tender currentSupplier when supplier name empty", () => {
		const { result } = setup();
		fillStep1Required(result);

		const payload = result.current.toPayload();
		expect(payload.tender.currentSupplier).toBeUndefined();
	});

	test("toPayload includes tender currentSupplier when step 2 is filled", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => {
			result.current.advance();
		});
		act(() => {
			result.current.update2("companyName", "МеталлТрейд");
			result.current.update2("inn", "1234567890");
			result.current.update2("paymentType", "deferred");
			result.current.update2("deferralDays", "30");
		});

		const payload = result.current.toPayload();
		expect(payload.tender.currentSupplier).toEqual({
			companyName: "МеталлТрейд",
			inn: "1234567890",
			paymentType: "deferred",
			deferralDays: 30,
			pricePerUnit: null,
		});
	});

	test("toPayload emits one item per position card", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => result.current.updatePosition(0, "pricePerUnit", "1000"));
		act(() => result.current.addPosition());
		act(() => result.current.updatePosition(1, "name", "Цемент"));
		act(() => result.current.updatePosition(1, "pricePerUnit", "500"));

		const payload = result.current.toPayload();
		expect(payload.items).toHaveLength(2);
		expect(payload.items[0]).toMatchObject({ name: "Арматура", currentPrice: 1000 });
		expect(payload.items[1]).toMatchObject({ name: "Цемент", currentPrice: 500 });
	});

	test("per-item payload does not carry tenderId — operation stamps it after tender create", () => {
		const { result } = setup();
		fillStep1Required(result);

		const payload = result.current.toPayload();
		expect(payload.items[0]).not.toHaveProperty("tenderId");
	});

	test("toPayload emits generatedAnswers on first item only when answered", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => result.current.update3("q1", { selectedOption: "A" }));

		const payload = result.current.toPayload();
		expect(payload.items[0].generatedAnswers).toEqual([{ questionId: "q1", selectedOption: "A" }]);
	});

	test("toPayload deferralRequired maps to paymentType=deferred on items + flag on tender", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => result.current.update1("deferralRequired", true));

		const payload = result.current.toPayload();
		expect(payload.tender.deferralRequired).toBe(true);
		expect(payload.items[0].paymentType).toBe("deferred");
	});
});
