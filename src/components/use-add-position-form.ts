import { useState } from "react";
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

type AdvanceResult = { advanced: boolean; focus?: "company" | "name"; positionIndex?: number };

export interface PositionDraft {
	name: string;
	description: string;
	unit: Unit | "";
	quantityPerDelivery: string;
	annualQuantity: string;
	pricePerUnit: string;
}

interface Step1State {
	companyId: string;
	folderId: string | null;
	positions: PositionDraft[];
	addressIds: string[];
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
	paymentType: PaymentType;
	deferralDays: string;
	prepaymentPercent: string;
	deliveryCostType: DeliveryCostType | null;
	deliveryCost: string;
}

interface Step3Answer {
	selectedOption?: string;
	freeText?: string;
}

interface Step3State {
	answers: Record<string, Step3Answer>;
}

interface PositionErrors {
	name?: string;
}

interface Step1Errors {
	company?: string;
	positions: PositionErrors[];
}

interface Step2Errors {
	inn?: string;
}

function defaultPosition(): PositionDraft {
	return {
		name: "",
		description: "",
		unit: "",
		quantityPerDelivery: "",
		annualQuantity: "",
		pricePerUnit: "",
	};
}

function defaultStep1(): Step1State {
	return {
		companyId: "",
		folderId: null,
		positions: [defaultPosition()],
		addressIds: [],
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
		paymentType: "prepayment",
		deferralDays: "",
		prepaymentPercent: "100",
		deliveryCostType: null,
		deliveryCost: "",
	};
}

function defaultStep3(): Step3State {
	return { answers: {} };
}

function defaultStep1Errors(): Step1Errors {
	return { positions: [{}] };
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

function buildCurrentSupplier(step2: Step2State, position: PositionDraft): CurrentSupplier | undefined {
	// Drop the supplier when any of {company name, ИНН, this position's price} is missing
	// — downstream surfaces (Поставщики / Предложения) treat a present record as fully
	// identifiable, so a partial one would render as an unnamed or zero-priced row.
	const companyName = step2.companyName.trim();
	const inn = step2.inn.trim();
	if (companyName === "" || inn === "" || position.pricePerUnit.trim() === "") return undefined;

	const prepaymentPercentNum = step2.paymentType === "prepayment" ? (toNumber(step2.prepaymentPercent) ?? 100) : 100;

	const supplier: CurrentSupplier = {
		companyName,
		inn,
		paymentType: step2.paymentType,
		deferralDays: step2.paymentType === "deferred" ? (toNumber(step2.deferralDays) ?? 0) : 0,
		pricePerUnit: Number(position.pricePerUnit),
	};
	if (step2.paymentType === "prepayment" && prepaymentPercentNum !== 100) {
		supplier.prepaymentPercent = prepaymentPercentNum;
	}
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
	position: PositionDraft,
	step1: Step1State,
	step2: Step2State,
	step3: Step3State,
	addressStrings: string[],
): NewItemInput {
	const payload: NewItemInput = {
		name: position.name.trim(),
		paymentType: step1.deferralRequired ? "deferred" : "prepayment",
		paymentMethod: step1.paymentMethod,
	};

	if (step1.folderId !== null) payload.folderId = step1.folderId;

	const description = position.description.trim();
	if (description) payload.description = description;

	if (position.unit !== "") payload.unit = position.unit;

	const annual = toNumber(position.annualQuantity);
	if (annual !== undefined) payload.annualQuantity = annual;

	const perDelivery = toNumber(position.quantityPerDelivery);
	if (perDelivery !== undefined) payload.quantityPerDelivery = perDelivery;

	const price = toNumber(position.pricePerUnit);
	if (price !== undefined) payload.currentPrice = price;

	if (addressStrings.length > 0) payload.deliveryAddresses = addressStrings;

	if (step2.deliveryCostType !== null) {
		payload.deliveryCostType = step2.deliveryCostType;
		if (step2.deliveryCostType === "paid") {
			const cost = toNumber(step2.deliveryCost);
			if (cost !== undefined) payload.deliveryCost = cost;
		}
	}

	if (step1.unloading !== null) payload.unloading = step1.unloading;
	if (step1.sampleRequired) payload.sampleRequired = true;
	if (step1.analoguesAllowed) payload.analoguesAllowed = true;
	if (step1.deferralRequired) payload.deferralRequired = true;

	const info = step1.additionalInfo.trim();
	if (info) payload.additionalInfo = info;

	const supplier = buildCurrentSupplier(step2, position);
	if (supplier) payload.currentSupplier = supplier;

	const answers = buildGeneratedAnswers(step3);
	if (answers) payload.generatedAnswers = answers;

	if (step1.files.length > 0) {
		payload.attachedFiles = step1.files.map((f) => ({ name: f.name, size: f.size }));
	}

	return payload;
}

export interface UseAddPositionFormArgs {
	resolveAddressStrings: (companyId: string, addressIds: string[]) => string[];
}

type SharedStep1Key = Exclude<keyof Step1State, "positions">;

export function useAddPositionForm({ resolveAddressStrings }: UseAddPositionFormArgs) {
	const [step, setStep] = useState<WizardStep>(1);
	const [step1, setStep1] = useState<Step1State>(defaultStep1);
	const [step2, setStep2] = useState<Step2State>(defaultStep2);
	const [step3, setStep3] = useState<Step3State>(defaultStep3);
	const [step1Errors, setStep1Errors] = useState<Step1Errors>(defaultStep1Errors);
	const [step2Errors, setStep2Errors] = useState<Step2Errors>({});

	function update1<K extends SharedStep1Key>(key: K, value: Step1State[K]) {
		setStep1((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
		if (key === "companyId") setStep1Errors((prev) => (prev.company ? { ...prev, company: undefined } : prev));
	}

	function updatePosition<K extends keyof PositionDraft>(index: number, key: K, value: PositionDraft[K]) {
		setStep1((prev) => {
			const current = prev.positions[index];
			if (!current || current[key] === value) return prev;
			const positions = prev.positions.slice();
			positions[index] = { ...current, [key]: value };
			return { ...prev, positions };
		});
		if (key === "name") {
			setStep1Errors((prev) => {
				if (!prev.positions[index]?.name) return prev;
				const positions = prev.positions.slice();
				positions[index] = { ...positions[index], name: undefined };
				return { ...prev, positions };
			});
		}
	}

	function addPosition() {
		setStep1((prev) => ({ ...prev, positions: [...prev.positions, defaultPosition()] }));
		setStep1Errors((prev) => ({ ...prev, positions: [...prev.positions, {}] }));
	}

	function removePosition(index: number) {
		setStep1((prev) => {
			if (prev.positions.length <= 1) return prev;
			return { ...prev, positions: prev.positions.filter((_, i) => i !== index) };
		});
		setStep1Errors((prev) => {
			if (prev.positions.length <= 1) return prev;
			return { ...prev, positions: prev.positions.filter((_, i) => i !== index) };
		});
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
		const positionErrors: PositionErrors[] = step1.positions.map((p) =>
			p.name.trim() ? {} : { name: "Укажите название позиции" },
		);
		const errors: Step1Errors = { positions: positionErrors };
		if (!step1.companyId) errors.company = "Выберите компанию";
		return errors;
	}

	function validateStep2Inn(): Step2Errors {
		const result = validateInn(step2.inn);
		return result.ok ? {} : { inn: result.error };
	}

	function advance(): AdvanceResult {
		if (step === 1) {
			const errors = validateStep1();
			const firstNameErrorIndex = errors.positions.findIndex((e) => e.name);
			if (errors.company || firstNameErrorIndex >= 0) {
				setStep1Errors(errors);
				if (errors.company) return { advanced: false, focus: "company" };
				return { advanced: false, focus: "name", positionIndex: firstNameErrorIndex };
			}
			setStep1Errors({ positions: step1.positions.map(() => ({})) });
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
		setStep1Errors(defaultStep1Errors());
		setStep2Errors({});
	}

	function isPositionDirty(p: PositionDraft) {
		return (
			p.name !== "" ||
			p.description !== "" ||
			p.unit !== "" ||
			p.quantityPerDelivery !== "" ||
			p.annualQuantity !== "" ||
			p.pricePerUnit !== ""
		);
	}

	const isDirty =
		step1.companyId !== "" ||
		step1.folderId !== null ||
		step1.positions.length > 1 ||
		step1.positions.some(isPositionDirty) ||
		step1.addressIds.length > 0 ||
		step1.unloading !== null ||
		step1.paymentMethod !== "bank_transfer" ||
		step1.deferralRequired ||
		step1.sampleRequired ||
		step1.analoguesAllowed ||
		step1.additionalInfo !== "" ||
		step1.files.length > 0 ||
		step2.companyName !== "" ||
		step2.inn !== "" ||
		step2.paymentType !== "prepayment" ||
		step2.deferralDays !== "" ||
		step2.prepaymentPercent !== "100" ||
		step2.deliveryCostType !== null ||
		step2.deliveryCost !== "" ||
		Object.values(step3.answers).some((a) => a.selectedOption || a.freeText);

	const canAddPosition = (() => {
		const last = step1.positions[step1.positions.length - 1];
		return !!last && last.name.trim() !== "";
	})();

	function toPayload(): NewItemInput[] {
		const addressStrings = resolveAddressStrings(step1.companyId, step1.addressIds);
		return step1.positions.map((p) => buildNewItemInput(p, step1, step2, step3, addressStrings));
	}

	return {
		step,
		step1,
		step2,
		step3,
		step1Errors,
		step2Errors,
		update1,
		updatePosition,
		addPosition,
		removePosition,
		update2,
		update3,
		blurInn,
		advance,
		goBack,
		reset,
		isDirty,
		canAddPosition,
		toPayload,
	};
}
