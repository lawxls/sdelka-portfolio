import { useState } from "react";
import type { CreateTenderInput } from "@/data/domains/tenders";
import type {
	DeliveryCostType,
	GeneratedAnswer,
	NewItemInput,
	PaymentMethod,
	PaymentType,
	Unit,
	UnloadingType,
} from "@/data/types";
import { formatShortDate, toNumberOrUndefined } from "@/lib/format";

export type WizardStep = 1 | 2 | 3;

type AdvanceFocus = "company" | "name" | "deadline" | "budget";
type AdvanceResult = { advanced: boolean; focus?: AdvanceFocus; positionIndex?: number };

export interface PositionDraft {
	name: string;
	description: string;
	unit: Unit | "";
	quantityPerDelivery: string;
	annualQuantity: string;
	pricePerUnit: string;
}

interface Step1State {
	budget: string;
	deadline: string;
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
	budget?: string;
	deadline?: string;
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
		budget: "",
		deadline: "",
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
const BUDGET_PATTERN = /^\d+$/;

function validateInn(value: string): { ok: boolean; error?: string } {
	const trimmed = value.trim();
	if (trimmed === "") return { ok: true };
	if (!INN_PATTERN.test(trimmed)) return { ok: false, error: "ИНН должен содержать 10 или 12 цифр" };
	return { ok: true };
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
): NewItemInput {
	const payload: NewItemInput = {
		name: position.name.trim(),
		paymentType: step1.deferralRequired ? "deferred" : "prepayment",
	};

	const description = position.description.trim();
	if (description) payload.description = description;

	if (position.unit !== "") payload.unit = position.unit;

	const annual = toNumberOrUndefined(position.annualQuantity);
	if (annual !== undefined) payload.annualQuantity = annual;

	const perDelivery = toNumberOrUndefined(position.quantityPerDelivery);
	if (perDelivery !== undefined) payload.quantityPerDelivery = perDelivery;

	const price = toNumberOrUndefined(position.pricePerUnit);
	if (price !== undefined) payload.currentPrice = price;

	if (step2.deliveryCostType !== null) {
		payload.deliveryCostType = step2.deliveryCostType;
		if (step2.deliveryCostType === "paid") {
			const cost = toNumberOrUndefined(step2.deliveryCost);
			if (cost !== undefined) payload.deliveryCost = cost;
		}
	}

	const answers = buildGeneratedAnswers(step3);
	if (answers) payload.generatedAnswers = answers;

	return payload;
}

function generateTenderName(step1: Step1State): string {
	const firstNamed = step1.positions.find((p) => p.name.trim() !== "");
	if (firstNamed) {
		const base = firstNamed.name.trim();
		const extra = step1.positions.filter((p) => p.name.trim() !== "").length - 1;
		return extra > 0 ? `${base} +${extra}` : base;
	}
	return `Новый тендер ${formatShortDate(new Date().toISOString())}`;
}

function buildTenderInput(step1: Step1State, step2: Step2State): CreateTenderInput {
	const tender: CreateTenderInput = {
		name: generateTenderName(step1),
		companyId: step1.companyId,
		folderId: step1.folderId,
		budget: toNumberOrUndefined(step1.budget) ?? 0,
		deadline: step1.deadline,
	};

	if (step1.addressIds.length > 0) tender.addressIds = step1.addressIds;
	if (step1.unloading) tender.unloading = step1.unloading;
	if (step1.paymentMethod !== "bank_transfer") tender.paymentMethod = step1.paymentMethod;
	if (step1.deferralRequired) tender.deferralRequired = true;
	if (step1.sampleRequired) tender.sampleRequired = true;
	if (step1.analoguesAllowed) tender.analoguesAllowed = true;
	const info = step1.additionalInfo.trim();
	if (info) tender.additionalInfo = info;
	if (step1.files.length > 0) {
		tender.attachedFiles = step1.files.map((f) => ({ name: f.name, size: f.size }));
	}

	const supplierName = step2.companyName.trim();
	const supplierInn = step2.inn.trim();
	if (supplierName) {
		tender.currentSupplier = {
			companyName: supplierName,
			...(supplierInn && { inn: supplierInn }),
			paymentType: step2.paymentType,
			deferralDays: toNumberOrUndefined(step2.deferralDays) ?? 0,
			...(step2.paymentType === "prepayment" && {
				prepaymentPercent: toNumberOrUndefined(step2.prepaymentPercent) ?? 100,
			}),
			pricePerUnit: null,
		};
	}

	return tender;
}

export interface CreateTenderPayload {
	tender: CreateTenderInput;
	items: NewItemInput[];
}

type SharedStep1Key = Exclude<keyof Step1State, "positions">;

export function useCreateTenderForm() {
	const [step, setStep] = useState<WizardStep>(1);
	const [step1, setStep1] = useState<Step1State>(defaultStep1);
	const [step2, setStep2] = useState<Step2State>(defaultStep2);
	const [step3, setStep3] = useState<Step3State>(defaultStep3);
	const [step1Errors, setStep1Errors] = useState<Step1Errors>(defaultStep1Errors);
	const [step2Errors, setStep2Errors] = useState<Step2Errors>({});

	function update1<K extends SharedStep1Key>(key: K, value: Step1State[K]) {
		setStep1((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
		if (key === "companyId") setStep1Errors((prev) => (prev.company ? { ...prev, company: undefined } : prev));
		if (key === "deadline") setStep1Errors((prev) => (prev.deadline ? { ...prev, deadline: undefined } : prev));
		if (key === "budget") setStep1Errors((prev) => (prev.budget ? { ...prev, budget: undefined } : prev));
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
		if (!step1.deadline) errors.deadline = "Укажите дедлайн";
		const budget = step1.budget.trim();
		if (budget && !BUDGET_PATTERN.test(budget)) errors.budget = "Бюджет должен быть целым числом";
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
			const blocked = errors.deadline || errors.budget || errors.company || firstNameErrorIndex >= 0;
			if (blocked) {
				setStep1Errors(errors);
				if (errors.deadline) return { advanced: false, focus: "deadline" };
				if (errors.budget) return { advanced: false, focus: "budget" };
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
		step1.budget !== "" ||
		step1.deadline !== "" ||
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

	function toPayload(): CreateTenderPayload {
		const tender = buildTenderInput(step1, step2);
		const items = step1.positions.map((p) => buildNewItemInput(p, step1, step2, step3));
		return { tender, items };
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
