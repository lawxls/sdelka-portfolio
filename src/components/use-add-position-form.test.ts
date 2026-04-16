import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { useAddPositionForm } from "./use-add-position-form";

function resolveAddresses(companyId: string, ids: string[]): string[] {
	if (companyId === "c1") {
		const map: Record<string, string> = {
			"a-1": "Главный офис",
			"a-2": "Склад",
		};
		return ids.map((id) => map[id]).filter(Boolean);
	}
	return [];
}

function setup() {
	return renderHook(() => useAddPositionForm({ resolveAddressStrings: resolveAddresses }));
}

describe("useAddPositionForm", () => {
	test("starts on step 1 with default state", () => {
		const { result } = setup();
		expect(result.current.step).toBe(1);
		expect(result.current.step1.name).toBe("");
		expect(result.current.step1.companyId).toBe("");
		expect(result.current.isDirty).toBe(false);
	});

	test("advance from step 1 blocked when company and name missing", () => {
		const { result } = setup();

		let outcome: ReturnType<typeof result.current.advance> | undefined;
		act(() => {
			outcome = result.current.advance();
		});

		expect(outcome?.advanced).toBe(false);
		expect(outcome?.focus).toBe("company");
		expect(result.current.step).toBe(1);
		expect(result.current.step1Errors.company).toBeTruthy();
		expect(result.current.step1Errors.name).toBeTruthy();
	});

	test("advance from step 1 blocked when only name set", () => {
		const { result } = setup();

		act(() => result.current.update1("name", "Арматура"));
		let outcome: ReturnType<typeof result.current.advance> | undefined;
		act(() => {
			outcome = result.current.advance();
		});

		expect(outcome?.advanced).toBe(false);
		expect(outcome?.focus).toBe("company");
		expect(result.current.step).toBe(1);
		expect(result.current.step1Errors.company).toBeTruthy();
		expect(result.current.step1Errors.name).toBeFalsy();
	});

	test("advance blocked when only company set returns focus:name", () => {
		const { result } = setup();

		act(() => result.current.update1("companyId", "c1"));
		let outcome: ReturnType<typeof result.current.advance> | undefined;
		act(() => {
			outcome = result.current.advance();
		});

		expect(outcome?.advanced).toBe(false);
		expect(outcome?.focus).toBe("name");
	});

	test("advance from step 1 succeeds when company + name set", () => {
		const { result } = setup();

		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "Арматура"));

		let outcome: ReturnType<typeof result.current.advance> | undefined;
		act(() => {
			outcome = result.current.advance();
		});

		expect(outcome?.advanced).toBe(true);
		expect(outcome?.focus).toBeUndefined();
		expect(result.current.step).toBe(2);
		expect(result.current.step1Errors.company).toBeFalsy();
		expect(result.current.step1Errors.name).toBeFalsy();
	});

	test("updating field clears its error", () => {
		const { result } = setup();

		act(() => {
			result.current.advance();
		});
		expect(result.current.step1Errors.name).toBeTruthy();

		act(() => result.current.update1("name", "X"));
		expect(result.current.step1Errors.name).toBeFalsy();
	});

	test("goBack from step 2 returns to step 1 preserving state", () => {
		const { result } = setup();

		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "Цемент"));
		act(() => result.current.update1("description", "М500"));
		act(() => {
			result.current.advance();
		});
		act(() => result.current.update2("companyName", "МеталлТрейд"));
		act(() => result.current.goBack());

		expect(result.current.step).toBe(1);
		expect(result.current.step1.name).toBe("Цемент");
		expect(result.current.step1.description).toBe("М500");
		expect(result.current.step2.companyName).toBe("МеталлТрейд");
	});

	test("goBack from step 3 returns to step 2 preserving all state", () => {
		const { result } = setup();

		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "X"));
		act(() => {
			result.current.advance();
		});
		act(() => result.current.update2("inn", "1234567890"));
		act(() => {
			result.current.advance();
		});
		act(() => result.current.update3("q1", { selectedOption: "A" }));
		act(() => result.current.goBack());

		expect(result.current.step).toBe(2);
		expect(result.current.step2.inn).toBe("1234567890");
		expect(result.current.step3.answers.q1?.selectedOption).toBe("A");
	});

	test("reset clears all fields and returns to step 1", () => {
		const { result } = setup();

		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "X"));
		act(() => {
			result.current.advance();
		});
		act(() => result.current.update2("companyName", "Y"));
		act(() => result.current.reset());

		expect(result.current.step).toBe(1);
		expect(result.current.step1.name).toBe("");
		expect(result.current.step1.companyId).toBe("");
		expect(result.current.step2.companyName).toBe("");
		expect(result.current.isDirty).toBe(false);
	});

	test("isDirty flips true when name is set", () => {
		const { result } = setup();
		expect(result.current.isDirty).toBe(false);
		act(() => result.current.update1("name", "X"));
		expect(result.current.isDirty).toBe(true);
	});

	test("isDirty detects step 2 and step 3 changes", () => {
		const { result } = setup();
		act(() => result.current.update2("companyName", "Z"));
		expect(result.current.isDirty).toBe(true);

		act(() => result.current.reset());
		act(() => result.current.update3("q1", { freeText: "hi" }));
		expect(result.current.isDirty).toBe(true);
	});

	// --- INN soft-validation ---

	test("INN empty is valid (no error shown on advance from step 2)", () => {
		const { result } = setup();
		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "X"));
		act(() => {
			result.current.advance();
		});
		act(() => {
			result.current.advance();
		});
		expect(result.current.step).toBe(3);
		expect(result.current.step2Errors.inn).toBeFalsy();
	});

	test("INN with 10 digits is valid", () => {
		const { result } = setup();
		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "X"));
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

	test("INN with 12 digits is valid", () => {
		const { result } = setup();
		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "X"));
		act(() => {
			result.current.advance();
		});
		act(() => result.current.update2("inn", "123456789012"));
		act(() => {
			result.current.advance();
		});
		expect(result.current.step2Errors.inn).toBeFalsy();
	});

	test("INN with 11 digits surfaces error but does not block advance", () => {
		const { result } = setup();
		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "X"));
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

	test("blurInn surfaces error for invalid non-empty value", () => {
		const { result } = setup();
		act(() => result.current.update2("inn", "abc"));
		act(() => result.current.blurInn());
		expect(result.current.step2Errors.inn).toBeTruthy();
	});

	test("blurInn keeps error empty for empty value", () => {
		const { result } = setup();
		act(() => result.current.update2("inn", ""));
		act(() => result.current.blurInn());
		expect(result.current.step2Errors.inn).toBeFalsy();
	});

	test("blurInn clears prior error when value becomes valid", () => {
		const { result } = setup();
		act(() => result.current.update2("inn", "abc"));
		act(() => result.current.blurInn());
		expect(result.current.step2Errors.inn).toBeTruthy();

		act(() => result.current.update2("inn", "1234567890"));
		// update2 already clears the error on edit; blur re-validates and keeps it clear
		act(() => result.current.blurInn());
		expect(result.current.step2Errors.inn).toBeFalsy();
	});

	test("INN with letters surfaces error", () => {
		const { result } = setup();
		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "X"));
		act(() => {
			result.current.advance();
		});
		act(() => result.current.update2("inn", "12345abcde"));
		act(() => {
			result.current.advance();
		});
		expect(result.current.step2Errors.inn).toBeTruthy();
	});

	// --- toPayload() ---

	test("toPayload with minimal valid input emits name + payment defaults", () => {
		const { result } = setup();
		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "  Арматура  "));

		const payload = result.current.toPayload();

		expect(payload.name).toBe("Арматура");
		expect(payload.paymentType).toBe("prepayment");
		expect(payload.paymentMethod).toBe("bank_transfer");
		expect(payload.currentSupplier).toBeUndefined();
		expect(payload.generatedAnswers).toBeUndefined();
	});

	test("toPayload includes folderId when one is selected", () => {
		const { result } = setup();
		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "X"));
		act(() => result.current.update1("folderId", "folder-metal"));

		const payload = result.current.toPayload();
		expect(payload.folderId).toBe("folder-metal");
	});

	test("toPayload omits folderId when none is selected", () => {
		const { result } = setup();
		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "X"));

		const payload = result.current.toPayload();
		expect(payload.folderId).toBeUndefined();
	});

	test("toPayload includes deliveryAddresses when addresses selected", () => {
		const { result } = setup();
		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "X"));
		act(() => result.current.update1("addressIds", ["a-1", "a-2"]));

		const payload = result.current.toPayload();
		expect(payload.deliveryAddresses).toEqual(["Главный офис", "Склад"]);
	});

	test("toPayload maps 'Отсрочка нужна' checkbox to paymentType=deferred", () => {
		const { result } = setup();
		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "X"));
		act(() => result.current.update1("deferralRequired", true));

		const payload = result.current.toPayload();
		expect(payload.paymentType).toBe("deferred");
	});

	test("toPayload omits deliveryCost when deliveryCostType is 'free'", () => {
		const { result } = setup();
		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "X"));
		act(() => result.current.update1("deliveryCostType", "free"));
		act(() => result.current.update1("deliveryCost", "500"));

		const payload = result.current.toPayload();
		expect(payload.deliveryCostType).toBe("free");
		expect(payload.deliveryCost).toBeUndefined();
	});

	test("toPayload includes deliveryCost when deliveryCostType is 'paid'", () => {
		const { result } = setup();
		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "X"));
		act(() => result.current.update1("deliveryCostType", "paid"));
		act(() => result.current.update1("deliveryCost", "1500"));

		const payload = result.current.toPayload();
		expect(payload.deliveryCostType).toBe("paid");
		expect(payload.deliveryCost).toBe(1500);
	});

	test("toPayload omits deliveryCost when deliveryCostType is 'pickup'", () => {
		const { result } = setup();
		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "X"));
		act(() => result.current.update1("deliveryCostType", "pickup"));
		act(() => result.current.update1("deliveryCost", "900"));

		const payload = result.current.toPayload();
		expect(payload.deliveryCostType).toBe("pickup");
		expect(payload.deliveryCost).toBeUndefined();
	});

	test("toPayload includes fully populated step 1", () => {
		const { result } = setup();
		act(() => {
			result.current.update1("companyId", "c1");
			result.current.update1("name", "Цемент М500");
			result.current.update1("description", "Портландцемент");
			result.current.update1("unit", "т");
			result.current.update1("quantityPerDelivery", "50");
			result.current.update1("annualQuantity", "600");
			result.current.update1("addressIds", ["a-1"]);
			result.current.update1("deliveryCostType", "paid");
			result.current.update1("deliveryCost", "2000");
			result.current.update1("unloading", "supplier");
			result.current.update1("paymentMethod", "cash");
			result.current.update1("deferralRequired", true);
			result.current.update1("sampleRequired", true);
			result.current.update1("analoguesAllowed", true);
			result.current.update1("additionalInfo", "Срочно");
		});

		const payload = result.current.toPayload();
		expect(payload).toEqual({
			name: "Цемент М500",
			description: "Портландцемент",
			unit: "т",
			quantityPerDelivery: 50,
			annualQuantity: 600,
			deliveryAddresses: ["Главный офис"],
			deliveryCostType: "paid",
			deliveryCost: 2000,
			unloading: "supplier",
			paymentMethod: "cash",
			paymentType: "deferred",
			sampleRequired: true,
			analoguesAllowed: true,
			additionalInfo: "Срочно",
		});
	});

	test("toPayload with populated step 2 emits currentSupplier", () => {
		const { result } = setup();
		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "X"));
		act(() => result.current.update2("companyName", "МеталлТрейд"));
		act(() => result.current.update2("inn", "1234567890"));
		act(() => result.current.update2("pricePerUnit", "1200"));
		act(() => result.current.update2("paymentType", "deferred"));
		act(() => result.current.update2("deferralDays", "30"));

		const payload = result.current.toPayload();
		expect(payload.currentSupplier).toEqual({
			companyName: "МеталлТрейд",
			inn: "1234567890",
			paymentType: "deferred",
			deferralDays: 30,
			pricePerUnit: 1200,
		});
	});

	test("toPayload omits currentSupplier when step 2 empty", () => {
		const { result } = setup();
		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "X"));

		const payload = result.current.toPayload();
		expect(payload.currentSupplier).toBeUndefined();
	});

	test("toPayload emits generatedAnswers only for answered questions", () => {
		const { result } = setup();
		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "X"));
		act(() => result.current.update3("q1", { selectedOption: "A" }));
		act(() => result.current.update3("q2", { freeText: "custom" }));
		act(() => result.current.update3("q3", {}));

		const payload = result.current.toPayload();
		expect(payload.generatedAnswers).toEqual([
			{ questionId: "q1", selectedOption: "A" },
			{ questionId: "q2", freeText: "custom" },
		]);
	});

	test("toPayload preserves both selectedOption and freeText on same question", () => {
		const { result } = setup();
		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "X"));
		act(() => result.current.update3("q1", { selectedOption: "A" }));
		act(() => result.current.update3("q1", { freeText: "extra" }));

		const payload = result.current.toPayload();
		expect(payload.generatedAnswers).toEqual([{ questionId: "q1", selectedOption: "A", freeText: "extra" }]);
	});

	test("toPayload drops question when selectedOption cleared and no freeText", () => {
		const { result } = setup();
		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "X"));
		act(() => result.current.update3("q1", { selectedOption: "A" }));
		act(() => result.current.update3("q1", { selectedOption: undefined }));

		const payload = result.current.toPayload();
		expect(payload.generatedAnswers).toBeUndefined();
	});

	test("toPayload omits generatedAnswers when no answers set", () => {
		const { result } = setup();
		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "X"));

		const payload = result.current.toPayload();
		expect(payload.generatedAnswers).toBeUndefined();
	});

	test("advance is a no-op on step 3", () => {
		const { result } = setup();
		act(() => result.current.update1("companyId", "c1"));
		act(() => result.current.update1("name", "X"));
		act(() => {
			result.current.advance();
		});
		act(() => {
			result.current.advance();
		});

		let outcome: ReturnType<typeof result.current.advance> | undefined;
		act(() => {
			outcome = result.current.advance();
		});
		expect(outcome?.advanced).toBe(false);
		expect(result.current.step).toBe(3);
	});
});
