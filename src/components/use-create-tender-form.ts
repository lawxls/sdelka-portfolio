import { useState } from "react";
import type { CreateTenderInput } from "@/data/domains/tenders";
import type { GeneratedAnswer, NewItemInput, Unit, UnloadingType } from "@/data/types";
import { formatShortDate, isoDateInDays, toNumberOrUndefined } from "@/lib/format";

export type WizardStep = 1 | 2;

type AdvanceFocus = "company" | "name" | "deadline";
type AdvanceResult = { advanced: boolean; focus?: AdvanceFocus; positionIndex?: number };

const DEFAULT_DEADLINE_DAYS = 14;
const defaultDeadline = () => isoDateInDays(DEFAULT_DEADLINE_DAYS);

export interface PositionDraft {
	name: string;
	description: string;
	unit: Unit | "";
	quantityPerDelivery: string;
	annualQuantity: string;
	pricePerUnit: string;
	currentSupplierInn: string;
}

interface Step1State {
	deadline: string;
	companyId: string;
	folderId: string | null;
	positions: PositionDraft[];
	addressIds: string[];
	unloading: UnloadingType | null;
	cashPaymentAllowed: boolean;
	analoguesNotAllowed: boolean;
	additionalInfo: string;
	files: File[];
}

interface Step2Answer {
	selectedOption?: string;
	freeText?: string;
}

interface Step2State {
	answers: Record<string, Step2Answer>;
}

interface PositionErrors {
	name?: string;
}

interface Step1Errors {
	deadline?: string;
	company?: string;
	positions: PositionErrors[];
}

function defaultPosition(): PositionDraft {
	return {
		name: "",
		description: "",
		unit: "",
		quantityPerDelivery: "",
		annualQuantity: "",
		pricePerUnit: "",
		currentSupplierInn: "",
	};
}

function defaultStep1(initialDeadline: string): Step1State {
	return {
		deadline: initialDeadline,
		companyId: "",
		folderId: null,
		positions: [defaultPosition()],
		addressIds: [],
		unloading: null,
		cashPaymentAllowed: false,
		analoguesNotAllowed: false,
		additionalInfo: "",
		files: [],
	};
}

function defaultStep2(): Step2State {
	return { answers: {} };
}

function defaultStep1Errors(): Step1Errors {
	return { positions: [{}] };
}

function buildGeneratedAnswers(step2: Step2State): GeneratedAnswer[] | undefined {
	const entries: GeneratedAnswer[] = [];
	for (const [questionId, answer] of Object.entries(step2.answers)) {
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

function buildNewItemInput(position: PositionDraft, step2: Step2State): NewItemInput {
	const payload: NewItemInput = {
		name: position.name.trim(),
		paymentType: "prepayment",
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

	const answers = buildGeneratedAnswers(step2);
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
	return `Новый запрос ${formatShortDate(new Date().toISOString())}`;
}

function buildTenderInput(step1: Step1State): CreateTenderInput {
	const tender: CreateTenderInput = {
		name: generateTenderName(step1),
		companyId: step1.companyId,
		folderId: step1.folderId,
		budget: 0,
		deadline: step1.deadline,
	};

	if (step1.addressIds.length > 0) tender.addressIds = step1.addressIds;
	if (step1.unloading) tender.unloading = step1.unloading;
	if (step1.cashPaymentAllowed) tender.paymentMethod = "cash";
	tender.analoguesAllowed = !step1.analoguesNotAllowed;
	const info = step1.additionalInfo.trim();
	if (info) tender.additionalInfo = info;
	if (step1.files.length > 0) {
		tender.attachedFiles = step1.files.map((f) => ({ name: f.name, size: f.size }));
	}

	const supplierInn = step1.positions.map((p) => p.currentSupplierInn.trim()).find((inn) => inn !== "");
	if (supplierInn) {
		tender.currentSupplier = {
			companyName: "",
			inn: supplierInn,
			deferralDays: 0,
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
	const [initialDeadline] = useState(defaultDeadline);
	const [step, setStep] = useState<WizardStep>(1);
	const [step1, setStep1] = useState<Step1State>(() => defaultStep1(initialDeadline));
	const [step2, setStep2] = useState<Step2State>(defaultStep2);
	const [step1Errors, setStep1Errors] = useState<Step1Errors>(defaultStep1Errors);

	function update1<K extends SharedStep1Key>(key: K, value: Step1State[K]) {
		setStep1((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
		if (key === "companyId") setStep1Errors((prev) => (prev.company ? { ...prev, company: undefined } : prev));
		if (key === "deadline") setStep1Errors((prev) => (prev.deadline ? { ...prev, deadline: undefined } : prev));
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

	function update2(questionId: string, patch: Step2Answer) {
		setStep2((prev) => {
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
		if (!step1.companyId) errors.company = "Выберите компанию";
		return errors;
	}

	function advance(): AdvanceResult {
		if (step === 1) {
			const errors = validateStep1();
			const firstNameErrorIndex = errors.positions.findIndex((e) => e.name);
			const blocked = errors.deadline || errors.company || firstNameErrorIndex >= 0;
			if (blocked) {
				setStep1Errors(errors);
				if (errors.deadline) return { advanced: false, focus: "deadline" };
				if (errors.company) return { advanced: false, focus: "company" };
				return { advanced: false, focus: "name", positionIndex: firstNameErrorIndex };
			}
			setStep1Errors({ positions: step1.positions.map(() => ({})) });
			setStep(2);
			return { advanced: true };
		}
		return { advanced: false };
	}

	function goBack() {
		if (step === 2) setStep(1);
	}

	function reset() {
		setStep(1);
		setStep1(defaultStep1(initialDeadline));
		setStep2(defaultStep2());
		setStep1Errors(defaultStep1Errors());
	}

	function isPositionDirty(p: PositionDraft) {
		return (
			p.name !== "" ||
			p.description !== "" ||
			p.unit !== "" ||
			p.quantityPerDelivery !== "" ||
			p.annualQuantity !== "" ||
			p.pricePerUnit !== "" ||
			p.currentSupplierInn !== ""
		);
	}

	const isDirty =
		step1.deadline !== initialDeadline ||
		step1.companyId !== "" ||
		step1.folderId !== null ||
		step1.positions.length > 1 ||
		step1.positions.some(isPositionDirty) ||
		step1.addressIds.length > 0 ||
		step1.unloading !== null ||
		step1.cashPaymentAllowed ||
		step1.analoguesNotAllowed ||
		step1.additionalInfo !== "" ||
		step1.files.length > 0 ||
		Object.values(step2.answers).some((a) => a.selectedOption || a.freeText);

	const canAddPosition = (() => {
		const last = step1.positions[step1.positions.length - 1];
		return !!last && last.name.trim() !== "";
	})();

	function toPayload(): CreateTenderPayload {
		const tender = buildTenderInput(step1);
		const items = step1.positions.map((p) => buildNewItemInput(p, step2));
		return { tender, items };
	}

	return {
		step,
		step1,
		step2,
		step1Errors,
		update1,
		updatePosition,
		addPosition,
		removePosition,
		update2,
		advance,
		goBack,
		reset,
		isDirty,
		canAddPosition,
		toPayload,
	};
}
