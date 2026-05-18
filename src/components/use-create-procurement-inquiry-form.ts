import { useState } from "react";
import type { CreateProcurementInquiryInput } from "@/data/domains/procurement-inquiries";
import type { CurrentSupplier, GeneratedAnswer, NewItemInput, PaymentType, Unit, UnloadingType } from "@/data/types";
import { formatShortDate, isoDateInDays, toNumberOrUndefined } from "@/lib/format";
import { buildEmailVariant } from "./procurement-inquiry-email-templates";

export type WizardStep = 1 | 2 | 3;

type AdvanceFocus = "company" | "name" | "deadline";
type AdvanceResult = { advanced: boolean; focus?: AdvanceFocus; positionIndex?: number };

const DEFAULT_DEADLINE_DAYS = 14;
const defaultDeadline = () => isoDateInDays(DEFAULT_DEADLINE_DAYS);

export interface CurrentSupplierDraft {
	inn: string;
	companyName: string;
	website: string;
	address: string;
	email: string;
	pricePerUnit: string;
	paymentType: PaymentType;
	deferralDays: string;
	prepaymentPercent: string;
	deliveryIncluded: boolean;
	deliveryCost: string;
	leadTimeDays: string;
}

/** Hydrate a `CurrentSupplierDraft` from a stored `CurrentSupplier`. Inverse of
 * `buildCurrentSupplierFromDraft` — used by callers re-opening the modal for an
 * existing item. */
export function buildCurrentSupplierDraft(cs: CurrentSupplier): CurrentSupplierDraft {
	return {
		inn: cs.inn ?? "",
		companyName: cs.companyName,
		website: cs.website ?? "",
		address: cs.address ?? "",
		email: cs.email ?? "",
		pricePerUnit: cs.pricePerUnit != null ? String(cs.pricePerUnit) : "",
		paymentType: cs.paymentType ?? "prepayment",
		deferralDays: cs.deferralDays > 0 ? String(cs.deferralDays) : "",
		prepaymentPercent: cs.prepaymentPercent != null ? String(cs.prepaymentPercent) : "",
		deliveryIncluded: cs.deliveryCost == null,
		deliveryCost: cs.deliveryCost != null ? String(cs.deliveryCost) : "",
		leadTimeDays: cs.leadTimeDays != null ? String(cs.leadTimeDays) : "",
	};
}

/** Build the canonical `CurrentSupplier` payload from a draft. Numeric fields
 * parse via `toNumberOrUndefined`; missing optionals are dropped. */
export function buildCurrentSupplierFromDraft(draft: CurrentSupplierDraft): CurrentSupplier {
	const inn = draft.inn.trim();
	const supplier: CurrentSupplier = {
		companyName: draft.companyName.trim(),
		deferralDays: 0,
		pricePerUnit: toNumberOrUndefined(draft.pricePerUnit) ?? null,
		paymentType: draft.paymentType,
	};
	if (inn) supplier.inn = inn;
	const website = draft.website.trim();
	if (website) supplier.website = website;
	const address = draft.address.trim();
	if (address) supplier.address = address;
	const email = draft.email.trim();
	if (email) supplier.email = email;
	if (draft.paymentType === "deferred") {
		supplier.deferralDays = toNumberOrUndefined(draft.deferralDays) ?? 0;
	} else {
		const percent = toNumberOrUndefined(draft.prepaymentPercent);
		if (percent !== undefined) supplier.prepaymentPercent = percent;
	}
	supplier.deliveryCost = draft.deliveryIncluded ? null : (toNumberOrUndefined(draft.deliveryCost) ?? null);
	const leadTime = toNumberOrUndefined(draft.leadTimeDays);
	if (leadTime !== undefined) supplier.leadTimeDays = leadTime;
	return supplier;
}

export interface PositionDraft {
	name: string;
	description: string;
	unit: Unit | "";
	quantityPerDelivery: string;
	annualQuantity: string;
	currentSupplier?: CurrentSupplierDraft;
}

interface Step1State {
	deadline: string;
	companyId: string;
	folderId: string | null;
	positions: PositionDraft[];
	deliveryAddressId: string | null;
	unloading: UnloadingType | null;
	cashAllowed: boolean;
	analoguesNotAllowed: boolean;
	additionalInfo: string;
	copySuppliersFromInquiryId: string | null;
}

interface Step2Answer {
	selectedOption?: string;
	freeText?: string;
}

interface Step2State {
	answers: Record<string, Step2Answer>;
}

interface Step3State {
	autoSend: boolean;
	subject: string;
	body: string;
	generated: boolean;
	regenerateIndex: number;
}

interface PositionErrors {
	name?: string;
}

interface Step1Errors {
	deadline?: string;
	company?: string;
	positions: PositionErrors[];
}

export function defaultPosition(): PositionDraft {
	return {
		name: "",
		description: "",
		unit: "",
		quantityPerDelivery: "",
		annualQuantity: "",
	};
}

export function isPositionDraftDirty(p: PositionDraft): boolean {
	return (
		p.name !== "" ||
		p.description !== "" ||
		p.unit !== "" ||
		p.quantityPerDelivery !== "" ||
		p.annualQuantity !== "" ||
		p.currentSupplier !== undefined
	);
}

function defaultStep1(initialDeadline: string): Step1State {
	return {
		deadline: initialDeadline,
		companyId: "",
		folderId: null,
		positions: [defaultPosition()],
		deliveryAddressId: null,
		unloading: null,
		cashAllowed: false,
		analoguesNotAllowed: false,
		additionalInfo: "",
		copySuppliersFromInquiryId: null,
	};
}

function defaultStep2(): Step2State {
	return { answers: {} };
}

function defaultStep3(): Step3State {
	return {
		autoSend: false,
		subject: "",
		body: "",
		generated: false,
		regenerateIndex: 0,
	};
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

	const price = toNumberOrUndefined(position.currentSupplier?.pricePerUnit ?? "");
	if (price !== undefined) payload.currentPrice = price;

	if (position.currentSupplier) {
		payload.currentSupplier = buildCurrentSupplierFromDraft(position.currentSupplier);
	}

	const answers = buildGeneratedAnswers(step2);
	if (answers) payload.generatedAnswers = answers;

	return payload;
}

function generateProcurementInquiryName(step1: Step1State): string {
	const firstNamed = step1.positions.find((p) => p.name.trim() !== "");
	if (firstNamed) {
		const base = firstNamed.name.trim();
		const extra = step1.positions.filter((p) => p.name.trim() !== "").length - 1;
		return extra > 0 ? `${base} +${extra}` : base;
	}
	return `Новый запрос ${formatShortDate(new Date().toISOString())}`;
}

type InquiryWithoutItems = Omit<CreateProcurementInquiryInput, "items">;

function buildProcurementInquiryInput(step1: Step1State, step3: Step3State): InquiryWithoutItems {
	const procurementInquiry: InquiryWithoutItems = {
		name: generateProcurementInquiryName(step1),
		companyId: step1.companyId,
		folderId: step1.folderId,
		deadline: step1.deadline || null,
		deliveryAddressId: step1.deliveryAddressId,
		copySuppliersFromInquiryId: step1.copySuppliersFromInquiryId,
		cashAllowed: step1.cashAllowed,
		analoguesNotAllowed: step1.analoguesNotAllowed,
		sendRequestsAutomatically: step3.autoSend,
	};

	if (step1.unloading) procurementInquiry.unloading = step1.unloading;
	const info = step1.additionalInfo.trim();
	if (info) procurementInquiry.additionalInfo = info;

	const subject = step3.subject.trim();
	if (subject) procurementInquiry.emailSubject = subject;
	const body = step3.body.trim();
	if (body) procurementInquiry.emailBody = body;

	return procurementInquiry;
}

export interface CreateProcurementInquiryPayload {
	procurementInquiry: InquiryWithoutItems;
	items: NewItemInput[];
}

type SharedStep1Key = Exclude<keyof Step1State, "positions">;

export function useCreateProcurementInquiryForm() {
	const [initialDeadline] = useState(defaultDeadline);
	const [step, setStep] = useState<WizardStep>(1);
	const [step1, setStep1] = useState<Step1State>(() => defaultStep1(initialDeadline));
	const [step2, setStep2] = useState<Step2State>(defaultStep2);
	const [step3, setStep3] = useState<Step3State>(defaultStep3);
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

	/** Bulk-set positions — used when importing items from /positions.
	 * Always leaves at least one position so cards never render empty. */
	function setPositions(positions: PositionDraft[]) {
		const next = positions.length > 0 ? positions : [defaultPosition()];
		setStep1((prev) => ({ ...prev, positions: next }));
		setStep1Errors((prev) => ({ ...prev, positions: next.map(() => ({})) }));
	}

	function update2(questionId: string, patch: Step2Answer) {
		setStep2((prev) => {
			const current = prev.answers[questionId] ?? {};
			return { answers: { ...prev.answers, [questionId]: { ...current, ...patch } } };
		});
	}

	function update3<K extends keyof Step3State>(key: K, value: Step3State[K]) {
		setStep3((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
	}

	function buildEmailContext(folderName: string | null) {
		return {
			folderName,
			deadline: step1.deadline,
			positions: step1.positions.map((p) => ({
				name: p.name,
				quantityPerDelivery: p.quantityPerDelivery,
				annualQuantity: p.annualQuantity,
				unit: p.unit,
			})),
		};
	}

	function seedEmail(folderName: string | null) {
		setStep3((prev) => {
			if (prev.generated) return prev;
			const variant = buildEmailVariant(0, buildEmailContext(folderName));
			return { ...prev, subject: variant.subject, body: variant.body, generated: true, regenerateIndex: 0 };
		});
	}

	function regenerateEmail(folderName: string | null) {
		setStep3((prev) => {
			const nextIndex = prev.regenerateIndex + 1;
			const variant = buildEmailVariant(nextIndex, buildEmailContext(folderName));
			return {
				...prev,
				subject: variant.subject,
				body: variant.body,
				generated: true,
				regenerateIndex: nextIndex,
			};
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
		if (step === 2) {
			setStep(3);
			return { advanced: true };
		}
		return { advanced: false };
	}

	function goBack() {
		if (step === 3) setStep(2);
		else if (step === 2) setStep(1);
	}

	function reset() {
		setStep(1);
		setStep1(defaultStep1(initialDeadline));
		setStep2(defaultStep2());
		setStep3(defaultStep3());
		setStep1Errors(defaultStep1Errors());
	}

	function isPositionDirty(p: PositionDraft) {
		return isPositionDraftDirty(p);
	}

	const isDirty =
		step1.deadline !== initialDeadline ||
		step1.companyId !== "" ||
		step1.folderId !== null ||
		step1.positions.length > 1 ||
		step1.positions.some(isPositionDirty) ||
		step1.deliveryAddressId !== null ||
		step1.unloading !== null ||
		step1.cashAllowed ||
		step1.analoguesNotAllowed ||
		step1.additionalInfo !== "" ||
		step1.copySuppliersFromInquiryId !== null ||
		Object.values(step2.answers).some((a) => a.selectedOption || a.freeText) ||
		step3.autoSend ||
		step3.generated;

	const canAddPosition = (() => {
		const last = step1.positions[step1.positions.length - 1];
		return !!last && last.name.trim() !== "";
	})();

	function toPayload(): CreateProcurementInquiryPayload {
		const procurementInquiry = buildProcurementInquiryInput(step1, step3);
		const items = step1.positions.map((p) => buildNewItemInput(p, step2));
		return { procurementInquiry, items };
	}

	return {
		step,
		step1,
		step2,
		step3,
		step1Errors,
		update1,
		updatePosition,
		addPosition,
		removePosition,
		setPositions,
		update2,
		update3,
		seedEmail,
		regenerateEmail,
		advance,
		goBack,
		reset,
		isDirty,
		canAddPosition,
		toPayload,
	};
}
