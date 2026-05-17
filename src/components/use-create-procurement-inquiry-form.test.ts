import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { type CurrentSupplierDraft, useCreateProcurementInquiryForm } from "./use-create-procurement-inquiry-form";

function setup() {
	return renderHook(() => useCreateProcurementInquiryForm());
}

function fillStep1Required(result: { current: ReturnType<typeof useCreateProcurementInquiryForm> }) {
	act(() => {
		result.current.update1("deadline", "2026-06-01");
		result.current.update1("companyId", "c1");
		result.current.updatePosition(0, "name", "Арматура");
	});
}

function makeSupplier(overrides: Partial<CurrentSupplierDraft> = {}): CurrentSupplierDraft {
	return {
		inn: "",
		companyName: "",
		website: "",
		address: "",
		email: "",
		pricePerUnit: "",
		paymentType: "prepayment",
		deferralDays: "",
		prepaymentPercent: "",
		deliveryIncluded: true,
		deliveryCost: "",
		leadTimeDays: "",
		...overrides,
	};
}

describe("useCreateProcurementInquiryForm", () => {
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

	test("advance from step 1 succeeds with all required inquiry meta + name", () => {
		const { result } = setup();
		fillStep1Required(result);

		let outcome: ReturnType<typeof result.current.advance> | undefined;
		act(() => {
			outcome = result.current.advance();
		});

		expect(outcome?.advanced).toBe(true);
		expect(result.current.step).toBe(2);
	});

	test("advance from step 2 to step 3 needs no validation", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => {
			result.current.advance();
		});
		act(() => {
			result.current.advance();
		});

		expect(result.current.step).toBe(3);
	});

	test("goBack from step 3 returns to step 2 then to step 1", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => {
			result.current.advance();
		});
		act(() => {
			result.current.advance();
		});
		expect(result.current.step).toBe(3);

		act(() => result.current.goBack());
		expect(result.current.step).toBe(2);

		act(() => result.current.goBack());
		expect(result.current.step).toBe(1);
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

	test("toPayload returns { procurementInquiry, items } with inquiry meta + per-position items", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => {
			result.current.update1("folderId", "folder-metal");
			result.current.updatePosition(0, "currentSupplier", makeSupplier({ pricePerUnit: "100" }));
		});

		const payload = result.current.toPayload();

		expect(payload.procurementInquiry).toMatchObject({
			// Name is auto-generated from the first position when the user-facing field is omitted.
			name: "Арматура",
			companyId: "c1",
			folderId: "folder-metal",
			deadline: "2026-06-01",
		});
		expect(payload.items).toHaveLength(1);
		expect(payload.items[0]).toMatchObject({ name: "Арматура", currentPrice: 100 });
	});

	test("toPayload omits item currentSupplier when no draft supplier is set", () => {
		const { result } = setup();
		fillStep1Required(result);

		const payload = result.current.toPayload();
		expect(payload.items[0].currentSupplier).toBeUndefined();
	});

	test("toPayload carries per-position currentSupplier on each item", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => {
			result.current.updatePosition(0, "currentSupplier", makeSupplier({ inn: "1234567890" }));
		});

		const payload = result.current.toPayload();
		expect(payload.items[0].currentSupplier).toMatchObject({ inn: "1234567890" });
	});

	test("toPayload emits one item per position card", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => result.current.updatePosition(0, "currentSupplier", makeSupplier({ pricePerUnit: "1000" })));
		act(() => result.current.addPosition());
		act(() => result.current.updatePosition(1, "name", "Цемент"));
		act(() => result.current.updatePosition(1, "currentSupplier", makeSupplier({ pricePerUnit: "500" })));

		const payload = result.current.toPayload();
		expect(payload.items).toHaveLength(2);
		expect(payload.items[0]).toMatchObject({ name: "Арматура", currentPrice: 1000 });
		expect(payload.items[1]).toMatchObject({ name: "Цемент", currentPrice: 500 });
	});

	test("per-item payload does not carry procurementInquiryId — operation stamps it after inquiry create", () => {
		const { result } = setup();
		fillStep1Required(result);

		const payload = result.current.toPayload();
		expect(payload.items[0]).not.toHaveProperty("procurementInquiryId");
	});

	test("toPayload emits generatedAnswers on first item only when answered", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => result.current.update2("q1", { selectedOption: "A" }));

		const payload = result.current.toPayload();
		expect(payload.items[0].generatedAnswers).toEqual([{ questionId: "q1", selectedOption: "A" }]);
	});

	test("toPayload analoguesNotAllowed passes through the checkbox state", () => {
		const { result } = setup();
		fillStep1Required(result);

		expect(result.current.toPayload().procurementInquiry.analoguesNotAllowed).toBe(false);

		act(() => result.current.update1("analoguesNotAllowed", true));
		expect(result.current.toPayload().procurementInquiry.analoguesNotAllowed).toBe(true);
	});

	test("toPayload cashAllowed reflects the cash payment checkbox", () => {
		const { result } = setup();
		fillStep1Required(result);

		expect(result.current.toPayload().procurementInquiry.cashAllowed).toBe(false);

		act(() => result.current.update1("cashAllowed", true));
		expect(result.current.toPayload().procurementInquiry.cashAllowed).toBe(true);
	});

	// --- Step 3 — supplier email ---

	test("seedEmail fills subject + body once based on positions and folder", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => result.current.seedEmail("Металлопрокат"));

		expect(result.current.step3.subject).toContain("Металлопрокат");
		expect(result.current.step3.body).toContain("Арматура");
		expect(result.current.step3.generated).toBe(true);
	});

	test("seedEmail is idempotent — second call doesn't overwrite", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => result.current.seedEmail("Металлопрокат"));
		act(() => result.current.update3("subject", "Custom subject"));
		act(() => result.current.seedEmail("Металлопрокат"));

		expect(result.current.step3.subject).toBe("Custom subject");
	});

	test("regenerateEmail cycles to next variant and overwrites subject + body", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => result.current.seedEmail("Металлопрокат"));
		const firstSubject = result.current.step3.subject;

		act(() => result.current.regenerateEmail("Металлопрокат"));
		expect(result.current.step3.subject).not.toBe(firstSubject);
		expect(result.current.step3.regenerateIndex).toBe(1);
	});

	test("toPayload defaults sendRequestsAutomatically=false and includes email when seeded", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => result.current.seedEmail("Металлопрокат"));

		const payload = result.current.toPayload();
		expect(payload.procurementInquiry.sendRequestsAutomatically).toBe(false);
		expect(payload.procurementInquiry.emailSubject).toContain("Металлопрокат");
	});

	test("toPayload reports sendRequestsAutomatically=true when autoSend is checked", () => {
		const { result } = setup();
		fillStep1Required(result);
		act(() => result.current.update3("autoSend", true));

		const payload = result.current.toPayload();
		expect(payload.procurementInquiry.sendRequestsAutomatically).toBe(true);
	});

	test("toPayload omits emailSubject/emailBody when both are empty", () => {
		const { result } = setup();
		fillStep1Required(result);

		const payload = result.current.toPayload();
		expect(payload.procurementInquiry.emailSubject).toBeUndefined();
		expect(payload.procurementInquiry.emailBody).toBeUndefined();
	});

	test("isDirty flips true when autoSend toggled on", () => {
		const { result } = setup();
		expect(result.current.isDirty).toBe(false);

		act(() => result.current.update3("autoSend", true));
		expect(result.current.isDirty).toBe(true);
	});
});
