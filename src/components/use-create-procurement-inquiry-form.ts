import { useState } from "react";
import type {
	CreateProcurementInquiryGeneratedQuestionInput,
	CreateProcurementInquiryInput,
} from "@/data/domains/procurement-inquiries";
import type { CurrentSupplier, NewItemInput, PaymentType, Unit, UnloadingType } from "@/data/types";
import { isoDateInDays, toNumberOrUndefined } from "@/lib/format";

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
	attachments: File[];
	/** Set when the draft came from «Выбрать позиции» — an EXISTING standalone
	 * item. On submit it's attached to the inquiry (status → «Ищем
	 * поставщиков») instead of recreated, and the card renders read-only. */
	existingItemId?: string;
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

/** `answer === ""` means the buyer skipped; the row is still sent so the
 * inquiry record reflects what was asked. */
interface Step2GeneratedQuestion {
	questionText: string;
	suggests: string[];
	answer: string;
}

interface Step2State {
	generatedQuestions: Step2GeneratedQuestion[];
}

interface Step3State {
	autoSend: boolean;
	subject: string;
	body: string;
	generated: boolean;
	/** Variant counter driving the mock email generator's rotation. Lives in
	 * form state (not component state) so Назад → Далее resumes from where
	 * the user left off instead of restarting at 0 and re-showing a variant
	 * already cycled through. */
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
		attachments: [],
	};
}

export function isPositionDraftDirty(p: PositionDraft): boolean {
	return (
		p.name !== "" ||
		p.description !== "" ||
		p.unit !== "" ||
		p.quantityPerDelivery !== "" ||
		p.annualQuantity !== "" ||
		p.currentSupplier !== undefined ||
		p.attachments.length > 0
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
	return { generatedQuestions: [] };
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

function buildNewItemInput(position: PositionDraft, step1: Step1State): NewItemInput {
	const payload: NewItemInput = {
		name: position.name.trim(),
		companyId: step1.companyId,
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

	return payload;
}

type InquiryWithoutItems = Omit<CreateProcurementInquiryInput, "items">;

function buildProcurementInquiryInput(step1: Step1State, step3: Step3State): InquiryWithoutItems {
	const procurementInquiry: InquiryWithoutItems = {
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
	/** Existing standalone positions to attach (vs. the recreated `items`). */
	attachItemIds: string[];
}

type SharedStep1Key = Exclude<keyof Step1State, "positions">;

export function useCreateProcurementInquiryForm() {
	const [initialDeadline] = useState(defaultDeadline);
	const [step, setStep] = useState<WizardStep>(1);
	const [step1, setStep1] = useState<Step1State>(() => defaultStep1(initialDeadline));
	const [step2, setStep2] = useState<Step2State>(defaultStep2);
	const [step3, setStep3] = useState<Step3State>(defaultStep3);
	const [step1Errors, setStep1Errors] = useState<Step1Errors>(defaultStep1Errors);
	// Tracks whether the user has interacted with the form. Auto-fills
	// (e.g. locking the company when the workspace has only one) must NOT
	// flip this — otherwise we'd prompt "Закрыть без сохранения?" on a
	// pristine drawer the user never typed in.
	const [touched, setTouched] = useState(false);

	/** Drop cached AI artifacts when the data they were generated from
	 * changes. Step 2 (questions) and Step 3 (email) both close over Step 1
	 * inputs; if the buyer goes Назад and edits a position/logistics field,
	 * the cached questions and email are stale and must be regenerated on
	 * next entry. Subject/body are kept around so the previous render
	 * doesn't flash empty before the refetch lands. */
	function invalidateGeneratedArtifacts() {
		setStep2((prev) => (prev.generatedQuestions.length === 0 ? prev : { generatedQuestions: [] }));
		setStep3((prev) =>
			prev.generated || prev.regenerateIndex !== 0 ? { ...prev, generated: false, regenerateIndex: 0 } : prev,
		);
	}

	function writeStep1<K extends SharedStep1Key>(key: K, value: Step1State[K], markTouched: boolean) {
		setStep1((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
		if (markTouched) setTouched(true);
		if (key === "companyId") setStep1Errors((prev) => (prev.company ? { ...prev, company: undefined } : prev));
		if (key === "deadline") setStep1Errors((prev) => (prev.deadline ? { ...prev, deadline: undefined } : prev));
		// Only flip caches on real user edits. Auto-fills (markTouched=false)
		// don't represent intent and shouldn't trigger a refetch. The
		// invalidator is idempotent — no-op when nothing's cached — so we
		// don't bother short-circuiting when the value didn't actually change.
		if (markTouched) invalidateGeneratedArtifacts();
	}

	function update1<K extends SharedStep1Key>(key: K, value: Step1State[K]) {
		writeStep1(key, value, true);
	}

	/** Apply a server-side default (auto-lock single company, auto-pick main
	 * delivery address) without flipping `touched`, so we don't prompt
	 * "Закрыть без сохранения?" on a drawer the user never typed in. */
	function setInitial<K extends SharedStep1Key>(key: K, value: Step1State[K]) {
		writeStep1(key, value, false);
	}

	function updatePosition<K extends keyof PositionDraft>(index: number, key: K, value: PositionDraft[K]) {
		let changed = false;
		setStep1((prev) => {
			const current = prev.positions[index];
			if (!current || current[key] === value) return prev;
			changed = true;
			const positions = prev.positions.slice();
			positions[index] = { ...current, [key]: value };
			return { ...prev, positions };
		});
		if (!changed) return;
		setTouched(true);
		if (key === "name") {
			setStep1Errors((prev) => {
				if (!prev.positions[index]?.name) return prev;
				const positions = prev.positions.slice();
				positions[index] = { ...positions[index], name: undefined };
				return { ...prev, positions };
			});
		}
		invalidateGeneratedArtifacts();
	}

	function addPosition() {
		setStep1((prev) => ({ ...prev, positions: [...prev.positions, defaultPosition()] }));
		setStep1Errors((prev) => ({ ...prev, positions: [...prev.positions, {}] }));
		setTouched(true);
		invalidateGeneratedArtifacts();
	}

	function removePosition(index: number) {
		let removed = false;
		setStep1((prev) => {
			if (prev.positions.length <= 1) return prev;
			removed = true;
			return { ...prev, positions: prev.positions.filter((_, i) => i !== index) };
		});
		setStep1Errors((prev) => {
			if (prev.positions.length <= 1) return prev;
			return { ...prev, positions: prev.positions.filter((_, i) => i !== index) };
		});
		if (!removed) return;
		setTouched(true);
		invalidateGeneratedArtifacts();
	}

	/** Append positions picked from «Выбрать позиции» (each carrying an
	 * `existingItemId`). De-duped against already-attached ids; pristine empty
	 * starter cards are dropped so a picked-only inquiry has no blank required
	 * position. Typed-but-dirty cards are preserved (mixing is allowed). */
	function appendAttachedPositions(attached: PositionDraft[]) {
		let nextPositions: PositionDraft[] | null = null;
		setStep1((prev) => {
			const seen = new Set(prev.positions.map((p) => p.existingItemId).filter((id): id is string => Boolean(id)));
			const additions = attached.filter((p) => p.existingItemId && !seen.has(p.existingItemId));
			if (additions.length === 0) return prev;
			const kept = prev.positions.filter((p) => p.existingItemId || isPositionDraftDirty(p));
			nextPositions = [...kept, ...additions];
			return { ...prev, positions: nextPositions };
		});
		if (!nextPositions) return;
		const synced: PositionDraft[] = nextPositions;
		setStep1Errors((prev) => ({ ...prev, positions: synced.map(() => ({})) }));
		setTouched(true);
		invalidateGeneratedArtifacts();
	}

	function setGeneratedQuestions(qs: Step2GeneratedQuestion[]) {
		setStep2({ generatedQuestions: qs });
	}

	function updateGeneratedAnswer(index: number, answer: string) {
		setStep2((prev) => {
			const current = prev.generatedQuestions[index];
			if (!current || current.answer === answer) return prev;
			const next = prev.generatedQuestions.slice();
			next[index] = { ...current, answer };
			return { generatedQuestions: next };
		});
		setTouched(true);
	}

	function update3<K extends keyof Step3State>(key: K, value: Step3State[K]) {
		setStep3((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
		setTouched(true);
	}

	/** Replace subject/body after a successful preview call. Marks the
	 * email as generated so re-mounts (Назад → Далее) don't refetch. The
	 * optional ``regenerateIndex`` is the variant the BE was asked to
	 * produce; only advance the persisted counter when the request succeeds
	 * so a failed Перегенерировать doesn't skip a variant the user never
	 * saw. */
	function applyGeneratedEmail({
		subject,
		body,
		regenerateIndex,
	}: {
		subject: string;
		body: string;
		regenerateIndex?: number;
	}) {
		setStep3((prev) => ({
			...prev,
			subject,
			body,
			generated: true,
			regenerateIndex: regenerateIndex ?? prev.regenerateIndex,
		}));
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
		setTouched(false);
	}

	const isDirty = touched;

	const canAddPosition = (() => {
		const last = step1.positions[step1.positions.length - 1];
		return !!last && last.name.trim() !== "";
	})();

	function toPayload(): CreateProcurementInquiryPayload {
		const procurementInquiry = buildProcurementInquiryInput(step1, step3);
		const generatedQuestions: CreateProcurementInquiryGeneratedQuestionInput[] = step2.generatedQuestions.map((q) => ({
			questionText: q.questionText,
			suggests: q.suggests,
			answer: q.answer,
		}));
		if (generatedQuestions.length > 0) procurementInquiry.generatedQuestions = generatedQuestions;
		// Picked existing positions are attached (by id); only typed-from-scratch
		// positions are recreated as new items.
		const items = step1.positions.filter((p) => !p.existingItemId).map((p) => buildNewItemInput(p, step1));
		const attachItemIds = step1.positions.map((p) => p.existingItemId).filter((id): id is string => Boolean(id));
		return { procurementInquiry, items, attachItemIds };
	}

	return {
		step,
		step1,
		step2,
		step3,
		step1Errors,
		update1,
		setInitial,
		updatePosition,
		addPosition,
		removePosition,
		appendAttachedPositions,
		setGeneratedQuestions,
		updateGeneratedAnswer,
		update3,
		applyGeneratedEmail,
		advance,
		goBack,
		reset,
		isDirty,
		canAddPosition,
		toPayload,
	};
}
