import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { useCreateTenderForm } from "./use-create-tender-form";

function setup() {
	return renderHook(() => useCreateTenderForm());
}

function fillStep1Required(result: { current: ReturnType<typeof useCreateTenderForm> }) {
	act(() => {
		result.current.update1("deadline", "2026-06-01");
		result.current.update1("companyId", "c1");
		result.current.updatePosition(0, "name", "Арматура");
	});
}

describe("useCreateTenderForm", () => {
	test("starts on step 1 with one empty position and a deadline default ~14 days out", () => {
		const { result } = setup();
		expect(result.current.step).toBe(1);
		expect(result.current.step1.positions).toHaveLength(1);
		expect(result.current.step1.companyId).toBe("");
		// Default deadline: today + 14 days, populated automatically.
		expect(result.current.step1.deadline).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(result.current.isDirty).toBe(false);
	});

	test("advance from step 1 blocked when company + deadline + name missing — focus on deadline first", () => {
		const { result } = setup();
		act(() => result.current.update1("deadline", ""));

		let outcome: ReturnType<typeof result.current.advance> | undefined;
		act(() => {
			outcome = result.current.advance();
		});

		expect(outcome?.advanced).toBe(false);
		expect(outcome?.focus).toBe("deadline");
		expect(result.current.step).toBe(1);
		expect(result.current.step1Errors.deadline).toBeTruthy();
		expect(result.current.step1Errors.company).toBeTruthy();
		expect(result.current.step1Errors.positions[0]?.name).toBeTruthy();
	});

	test("advance blocked on missing deadline focuses deadline once company + position filled", () => {
		const { result } = setup();
		act(() => {
			result.current.update1("deadline", "");
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

	test("typing in errored deadline clears error", () => {
		const { result } = setup();
		act(() => result.current.update1("deadline", ""));
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
		act(() => result.current.update2("q1", { selectedOption: "A" }));
		act(() => result.current.goBack());

		expect(result.current.step).toBe(1);
		expect(result.current.step1.positions[0].name).toBe("Арматура");
		expect(result.current.step1.positions[0].description).toBe("М500");
		expect(result.current.step2.answers.q1?.selectedOption).toBe("A");
	});

	test("reset clears all fields and returns to step 1", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => result.current.addPosition());
		act(() => {
			result.current.advance();
		});
		act(() => result.current.update2("q1", { selectedOption: "Yes" }));
		act(() => result.current.reset());

		expect(result.current.step).toBe(1);
		expect(result.current.step1.positions).toHaveLength(1);
		expect(result.current.step1.positions[0].name).toBe("");
		expect(result.current.step1.companyId).toBe("");
		expect(result.current.step2.answers).toEqual({});
		expect(result.current.isDirty).toBe(false);
	});

	test("isDirty stays false for default deadline; flips true on user-typed deadline", () => {
		const { result } = setup();
		expect(result.current.isDirty).toBe(false);

		act(() => result.current.update1("deadline", "2026-06-01"));
		expect(result.current.isDirty).toBe(true);
	});

	// --- toPayload() ---

	test("toPayload returns { tender, items } with tender meta + per-position items", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => {
			result.current.update1("folderId", "folder-metal");
			result.current.updatePosition(0, "pricePerUnit", "100");
		});

		const payload = result.current.toPayload();

		expect(payload.tender).toMatchObject({
			// Name is auto-generated from the first position when the user-facing field is omitted.
			name: "Арматура",
			companyId: "c1",
			folderId: "folder-metal",
			deadline: "2026-06-01",
		});
		expect(payload.tender.budget).toBe(0);
		expect(payload.items).toHaveLength(1);
		expect(payload.items[0]).toMatchObject({ name: "Арматура", currentPrice: 100 });
	});

	test("toPayload omits tender currentSupplier when no position INN is set", () => {
		const { result } = setup();
		fillStep1Required(result);

		const payload = result.current.toPayload();
		expect(payload.tender.currentSupplier).toBeUndefined();
	});

	test("toPayload picks the first non-empty position INN as tender supplier", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => {
			result.current.updatePosition(0, "currentSupplierInn", "1234567890");
		});

		const payload = result.current.toPayload();
		expect(payload.tender.currentSupplier).toMatchObject({ inn: "1234567890" });
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
		act(() => result.current.update2("q1", { selectedOption: "A" }));

		const payload = result.current.toPayload();
		expect(payload.items[0].generatedAnswers).toEqual([{ questionId: "q1", selectedOption: "A" }]);
	});

	test("toPayload analoguesAllowed reflects the inverted UI checkbox", () => {
		const { result } = setup();
		fillStep1Required(result);

		// Default — checkbox unchecked → analogues remain allowed.
		expect(result.current.toPayload().tender.analoguesAllowed).toBe(true);

		act(() => result.current.update1("analoguesNotAllowed", true));
		expect(result.current.toPayload().tender.analoguesAllowed).toBe(false);
	});

	test("toPayload paymentMethod = cash only when cashPaymentAllowed is checked", () => {
		const { result } = setup();
		fillStep1Required(result);

		expect(result.current.toPayload().tender.paymentMethod).toBeUndefined();

		act(() => result.current.update1("cashPaymentAllowed", true));
		expect(result.current.toPayload().tender.paymentMethod).toBe("cash");
	});
});
