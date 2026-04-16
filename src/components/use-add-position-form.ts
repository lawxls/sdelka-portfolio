import { useMemo, useState } from "react";
import type {
	CurrentSupplier,
	DeliveryCostType,
	GeneratedAnswer,
	NewItemInput,
	PaymentMethod,
	PaymentType,
	Unit,
	UnloadingType,
} from "@/data/types";

export type WizardStep = 1 | 2 | 3;

type AdvanceResult = { advanced: boolean; focus?: "company" | "name" };

interface Step1State {
	companyId: string;
	folderId: string | null;
	name: string;
	description: string;
	unit: Unit | "";
	quantityPerDelivery: string;
	annualQuantity: string;
	addressIds: string[];
	deliveryCostType: DeliveryCostType | null;
	deliveryCost: string;
	unloading: UnloadingType | null;
	paymentMethod: PaymentMethod;
	deferralRequired: boolean;
	sampleRequired: boolean;
	analoguesAllowed: boolean;
	additionalInfo: string;
	files: File[];
}

interface Step2State {
	companyName: string;
	inn: string;
	pricePerUnit: string;
	paymentType: PaymentType;
	deferralDays: string;
}

interface Step3Answer {
	selectedOption?: string;
	freeText?: string;
}

interface Step3State {
	answers: Record<string, Step3Answer>;
}

interface Step1Errors {
	company?: string;
	name?: string;
}

interface Step2Errors {
	inn?: string;
}

function defaultStep1(): Step1State {
	return {
		companyId: "",
		folderId: null,
		name: "",
		description: "",
		unit: "",
		quantityPerDelivery: "",
		annualQuantity: "",
		addressIds: [],
		deliveryCostType: null,
		deliveryCost: "",
		unloading: null,
		paymentMethod: "bank_transfer",
		deferralRequired: false,
		sampleRequired: false,
		analoguesAllowed: false,
		additionalInfo: "",
		files: [],
	};
}

function defaultStep2(): Step2State {
	return {
		companyName: "",
		inn: "",
		pricePerUnit: "",
		paymentType: "prepayment",
		deferralDays: "",
	};
}

function defaultStep3(): Step3State {
	return { answers: {} };
}

const INN_PATTERN = /^\d{10}$|^\d{12}$/;

function validateInn(value: string): { ok: boolean; error?: string } {
	const trimmed = value.trim();
	if (trimmed === "") return { ok: true };
	if (!INN_PATTERN.test(trimmed)) return { ok: false, error: "ИНН должен содержать 10 или 12 цифр" };
	return { ok: true };
}

function toNumber(value: string): number | undefined {
	if (value === "") return undefined;
	const n = Number(value);
	return Number.isFinite(n) ? n : undefined;
}

function buildCurrentSupplier(step2: Step2State): CurrentSupplier | undefined {
	const anyValue =
		step2.companyName.trim() !== "" ||
		step2.inn.trim() !== "" ||
		step2.pricePerUnit !== "" ||
		(step2.paymentType === "deferred" && step2.deferralDays !== "");
	if (!anyValue) return undefined;

	const supplier: CurrentSupplier = {
		companyName: step2.companyName.trim(),
		paymentType: step2.paymentType,
		deferralDays: step2.paymentType === "deferred" ? (toNumber(step2.deferralDays) ?? 0) : 0,
		pricePerUnit: step2.pricePerUnit !== "" ? Number(step2.pricePerUnit) : null,
	};
	const inn = step2.inn.trim();
	if (inn !== "") supplier.inn = inn;
	return supplier;
}

function buildGeneratedAnswers(step3: Step3State): GeneratedAnswer[] | undefined {
	const entries: GeneratedAnswer[] = [];
	for (const [questionId, answer] of Object.entries(step3.answers)) {
		const option = answer.selectedOption?.trim();
		const free = answer.freeText?.trim();
		if (!option && !free) continue;
		const entry: GeneratedAnswer = { questionId };
		if (option) entry.selectedOption = option;
		if (free) entry.freeText = free;
		entries.push(entry);
	}
	return entries.length > 0 ? entries : undefined;
}

function buildNewItemInput(
	step1: Step1State,
	step2: Step2State,
	step3: Step3State,
	addressStrings: string[],
): NewItemInput {
	const payload: NewItemInput = {
		name: step1.name.trim(),
		paymentType: step1.deferralRequired ? "deferred" : "prepayment",
		paymentMethod: step1.paymentMethod,
	};

	if (step1.folderId !== null) payload.folderId = step1.folderId;

	const description = step1.description.trim();
	if (description) payload.description = description;

	if (step1.unit !== "") payload.unit = step1.unit;

	const annual = toNumber(step1.annualQuantity);
	if (annual !== undefined) payload.annualQuantity = annual;

	const perDelivery = toNumber(step1.quantityPerDelivery);
	if (perDelivery !== undefined) payload.quantityPerDelivery = perDelivery;

	if (addressStrings.length > 0) payload.deliveryAddresses = addressStrings;

	if (step1.deliveryCostType !== null) {
		payload.deliveryCostType = step1.deliveryCostType;
		if (step1.deliveryCostType === "paid") {
			const cost = toNumber(step1.deliveryCost);
			if (cost !== undefined) payload.deliveryCost = cost;
		}
	}

	if (step1.unloading !== null) payload.unloading = step1.unloading;
	if (step1.sampleRequired) payload.sampleRequired = true;
	if (step1.analoguesAllowed) payload.analoguesAllowed = true;

	const info = step1.additionalInfo.trim();
	if (info) payload.additionalInfo = info;

	const supplier = buildCurrentSupplier(step2);
	if (supplier) payload.currentSupplier = supplier;

	const answers = buildGeneratedAnswers(step3);
	if (answers) payload.generatedAnswers = answers;

	return payload;
}

export interface UseAddPositionFormArgs {
	resolveAddressStrings: (companyId: string, addressIds: string[]) => string[];
}

export function useAddPositionForm({ resolveAddressStrings }: UseAddPositionFormArgs) {
	const [step, setStep] = useState<WizardStep>(1);
	const [step1, setStep1] = useState<Step1State>(defaultStep1);
	const [step2, setStep2] = useState<Step2State>(defaultStep2);
	const [step3, setStep3] = useState<Step3State>(defaultStep3);
	const [step1Errors, setStep1Errors] = useState<Step1Errors>({});
	const [step2Errors, setStep2Errors] = useState<Step2Errors>({});

	function update1<K extends keyof Step1State>(key: K, value: Step1State[K]) {
		setStep1((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
		if (key === "name") setStep1Errors((prev) => (prev.name ? { ...prev, name: undefined } : prev));
		if (key === "companyId") setStep1Errors((prev) => (prev.company ? { ...prev, company: undefined } : prev));
	}

	function update2<K extends keyof Step2State>(key: K, value: Step2State[K]) {
		setStep2((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
		if (key === "inn") setStep2Errors((prev) => (prev.inn ? { ...prev, inn: undefined } : prev));
	}

	function blurInn() {
		const result = validateInn(step2.inn);
		setStep2Errors((prev) => ({ ...prev, inn: result.ok ? undefined : result.error }));
	}

	function update3(questionId: string, patch: Step3Answer) {
		setStep3((prev) => {
			const current = prev.answers[questionId] ?? {};
			return { answers: { ...prev.answers, [questionId]: { ...current, ...patch } } };
		});
	}

	function validateStep1(): Step1Errors {
		const errors: Step1Errors = {};
		if (!step1.companyId) errors.company = "Выберите компанию";
		if (!step1.name.trim()) errors.name = "Укажите название позиции";
		return errors;
	}

	function validateStep2Inn(): Step2Errors {
		const result = validateInn(step2.inn);
		return result.ok ? {} : { inn: result.error };
	}

	function advance(): AdvanceResult {
		if (step === 1) {
			const errors = validateStep1();
			if (errors.company || errors.name) {
				setStep1Errors(errors);
				return { advanced: false, focus: errors.company ? "company" : "name" };
			}
			setStep1Errors({});
			setStep(2);
			return { advanced: true };
		}
		if (step === 2) {
			const errors = validateStep2Inn();
			setStep2Errors(errors);
			setStep(3);
			return { advanced: true };
		}
		return { advanced: false };
	}

	function goBack() {
		if (step === 2) setStep(1);
		else if (step === 3) setStep(2);
	}

	function reset() {
		setStep(1);
		setStep1(defaultStep1());
		setStep2(defaultStep2());
		setStep3(defaultStep3());
		setStep1Errors({});
		setStep2Errors({});
	}

	const isDirty = useMemo(
		() =>
			step1.companyId !== "" ||
			step1.folderId !== null ||
			step1.name !== "" ||
			step1.description !== "" ||
			step1.unit !== "" ||
			step1.quantityPerDelivery !== "" ||
			step1.annualQuantity !== "" ||
			step1.addressIds.length > 0 ||
			step1.deliveryCostType !== null ||
			step1.deliveryCost !== "" ||
			step1.unloading !== null ||
			step1.paymentMethod !== "bank_transfer" ||
			step1.deferralRequired ||
			step1.sampleRequired ||
			step1.analoguesAllowed ||
			step1.additionalInfo !== "" ||
			step1.files.length > 0 ||
			step2.companyName !== "" ||
			step2.inn !== "" ||
			step2.pricePerUnit !== "" ||
			step2.paymentType !== "prepayment" ||
			step2.deferralDays !== "" ||
			Object.values(step3.answers).some((a) => a.selectedOption || a.freeText),
		[step1, step2, step3],
	);

	function toPayload(): NewItemInput {
		const addressStrings = resolveAddressStrings(step1.companyId, step1.addressIds);
		return buildNewItemInput(step1, step2, step3, addressStrings);
	}

	return {
		step,
		step1,
		step2,
		step3,
		step1Errors,
		step2Errors,
		update1,
		update2,
		update3,
		blurInn,
		advance,
		goBack,
		reset,
		isDirty,
		toPayload,
	};
}
