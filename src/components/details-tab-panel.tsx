import { FileText, Paperclip } from "lucide-react";
import { useMemo, useState } from "react";
import { CardGrid, FieldCard, DetailSection as Section, ValueText } from "@/components/detail-section";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CREATION_QUESTIONS } from "@/data/mock-creation-questions";
import type { GeneratedAnswer, ProcurementItem, Unit } from "@/data/types";
import { DELIVERY_COST_TYPE_LABELS, formatPaymentType, UNITS, UNLOADING_LABELS } from "@/data/types";
import { useCompanyDetail } from "@/data/use-company-detail";
import { useFolders } from "@/data/use-folders";
import { useItemDetail, useUpdateItemDetail } from "@/data/use-item-detail";
import { useProcurementInquiry } from "@/data/use-procurement-inquiries";
import { formatCurrency, formatFileSize, toNumberOrUndefined } from "@/lib/format";

interface DetailsTabPanelProps {
	itemId: string;
}

type SectionKey = "info" | "answers" | null;

const QUESTION_BY_ID = new Map(CREATION_QUESTIONS.map((q) => [q.id, q]));

interface InfoFormState {
	name: string;
	description: string;
	unit: Unit | "";
	quantityPerDelivery: string;
	annualQuantity: string;
}

interface AnswersFormState {
	texts: Record<string, string>;
}

function initInfoForm(item: ProcurementItem): InfoFormState {
	return {
		name: item.name,
		description: item.description ?? "",
		unit: item.unit ?? "",
		quantityPerDelivery: item.quantityPerDelivery != null ? String(item.quantityPerDelivery) : "",
		annualQuantity: String(item.annualQuantity),
	};
}

function initAnswersForm(item: ProcurementItem): AnswersFormState {
	const texts: Record<string, string> = {};
	for (const a of item.generatedAnswers ?? []) {
		texts[a.questionId] = answerValueText(a);
	}
	return { texts };
}

function answerValueText(answer: GeneratedAnswer): string {
	const parts: string[] = [];
	if (answer.selectedOption) parts.push(answer.selectedOption);
	if (answer.freeText) parts.push(answer.freeText);
	return parts.join(" — ");
}

export function DetailsTabPanel({ itemId }: DetailsTabPanelProps) {
	const { data: item, isLoading, isError } = useItemDetail(itemId);
	const { data: folders = [] } = useFolders();
	// ProcurementInquiry-level meta (company, category, address, payment method, current
	// supplier, requirements) lives on the parent inquiry after the schema
	// migration. Read-only here in the item drawer; edits are deferred to the
	// inquiry detail page in a later slice.
	const { data: procurementInquiry } = useProcurementInquiry(item?.procurementInquiryId ?? null);
	const { data: company } = useCompanyDetail(procurementInquiry?.companyId ?? null);
	const updateMutation = useUpdateItemDetail();

	const [editingSection, setEditingSection] = useState<SectionKey>(null);
	const [infoForm, setInfoForm] = useState<InfoFormState | null>(null);
	const [answersForm, setAnswersForm] = useState<AnswersFormState | null>(null);

	const folder = useMemo(
		() => folders.find((f) => f.id === procurementInquiry?.folderId),
		[folders, procurementInquiry?.folderId],
	);

	const addressesText = useMemo(() => {
		if (!procurementInquiry?.addressIds || !company?.addresses) return "";
		const set = new Set(procurementInquiry.addressIds);
		return company.addresses
			.filter((a) => set.has(a.id))
			.map((a) => a.address)
			.join("; ");
	}, [procurementInquiry?.addressIds, company?.addresses]);

	if (isLoading) {
		return (
			<div data-testid="details-loading" className="flex flex-col gap-4">
				{["s1", "s2", "s3", "s4", "s5", "s6"].map((k) => (
					<div key={k} className="flex flex-col gap-1.5">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-9 w-full" />
					</div>
				))}
			</div>
		);
	}

	if (isError || !item) {
		return (
			<p data-testid="details-error" className="py-8 text-center text-sm text-muted-foreground">
				Не удалось загрузить данные
			</p>
		);
	}

	const currentItem = item;

	function handleCancel() {
		setEditingSection(null);
	}

	function mutate(data: Record<string, unknown>) {
		updateMutation.mutate({ id: itemId, ...data } as Parameters<typeof updateMutation.mutate>[0], {
			onSuccess: () => setEditingSection(null),
		});
	}

	function handleEditInfo() {
		setInfoForm(initInfoForm(currentItem));
		setEditingSection("info");
	}

	function updateInfo<K extends keyof InfoFormState>(key: K, value: InfoFormState[K]) {
		setInfoForm((prev) => (prev ? { ...prev, [key]: value } : prev));
	}

	function handleSaveInfo() {
		if (!infoForm) return;
		const data: Record<string, unknown> = {};
		if (infoForm.name !== currentItem.name) data.name = infoForm.name;
		if (infoForm.description !== (currentItem.description ?? "")) data.description = infoForm.description || undefined;
		if (infoForm.unit !== (currentItem.unit ?? "")) data.unit = infoForm.unit || undefined;
		const qpd = toNumberOrUndefined(infoForm.quantityPerDelivery);
		if (qpd !== currentItem.quantityPerDelivery) data.quantityPerDelivery = qpd;
		const aq = toNumberOrUndefined(infoForm.annualQuantity);
		if (aq !== undefined && aq !== currentItem.annualQuantity) data.annualQuantity = aq;
		mutate(data);
	}

	function isInfoDirty() {
		if (!infoForm) return false;
		const aq = toNumberOrUndefined(infoForm.annualQuantity);
		return (
			infoForm.name !== currentItem.name ||
			infoForm.description !== (currentItem.description ?? "") ||
			infoForm.unit !== (currentItem.unit ?? "") ||
			toNumberOrUndefined(infoForm.quantityPerDelivery) !== currentItem.quantityPerDelivery ||
			(aq !== undefined && aq !== currentItem.annualQuantity)
		);
	}

	function handleEditAnswers() {
		setAnswersForm(initAnswersForm(currentItem));
		setEditingSection("answers");
	}

	function updateAnswerText(questionId: string, text: string) {
		setAnswersForm((prev) => (prev ? { texts: { ...prev.texts, [questionId]: text } } : prev));
	}

	function handleSaveAnswers() {
		if (!answersForm) return;
		const prev = currentItem.generatedAnswers ?? [];
		const next: GeneratedAnswer[] = [];
		for (const p of prev) {
			const edited = (answersForm.texts[p.questionId] ?? "").trim();
			if (!edited) continue;
			if (edited === answerValueText(p)) {
				next.push(p);
			} else {
				next.push({ questionId: p.questionId, freeText: edited });
			}
		}
		mutate({ generatedAnswers: next.length > 0 ? next : undefined });
	}

	function isAnswersDirty() {
		if (!answersForm) return false;
		const prev = currentItem.generatedAnswers ?? [];
		return prev.some((p) => (answersForm.texts[p.questionId] ?? "").trim() !== answerValueText(p));
	}

	const isEditingInfo = editingSection === "info" && infoForm !== null;
	const isEditingAnswers = editingSection === "answers" && answersForm !== null;

	const yesNo = (v: boolean | undefined) => (v ? "Да" : "Нет");
	const answers = item.generatedAnswers ?? [];
	const currentSupplier = item.currentSupplier;

	return (
		<div data-testid="tab-panel-details" className="flex flex-col gap-6">
			{/* --- Основное --- */}
			<Section
				title="Основное"
				editLabel="Редактировать основную информацию"
				editing={isEditingInfo}
				onEdit={handleEditInfo}
				onCancel={handleCancel}
				onSave={handleSaveInfo}
				saveDisabled={!isInfoDirty() || (infoForm?.name.trim() ?? "") === "" || updateMutation.isPending}
				isPending={updateMutation.isPending}
			>
				<CardGrid>
					<FieldCard label="Компания">
						<ValueText value={company?.name ?? ""} />
					</FieldCard>

					<FieldCard label="Категория">
						<ValueText value={folder?.name ?? ""} />
					</FieldCard>

					<FieldCard label="Название" span="full">
						{isEditingInfo ? (
							<Input
								aria-label="Название"
								value={infoForm.name}
								onChange={(e) => updateInfo("name", e.target.value)}
								spellCheck={false}
								autoComplete="off"
							/>
						) : (
							<ValueText value={item.name} />
						)}
					</FieldCard>

					<FieldCard label="Описание" span="full">
						{isEditingInfo ? (
							<Textarea
								aria-label="Описание"
								value={infoForm.description}
								onChange={(e) => updateInfo("description", e.target.value)}
								autoComplete="off"
							/>
						) : (
							<ValueText value={item.description ?? ""} />
						)}
					</FieldCard>

					<FieldCard label="Ед. изм.">
						{isEditingInfo ? (
							<Select value={infoForm.unit || undefined} onValueChange={(v) => updateInfo("unit", v as Unit)}>
								<SelectTrigger aria-label="Ед. изм." className="h-8 w-24">
									<SelectValue placeholder="—" />
								</SelectTrigger>
								<SelectContent>
									{UNITS.map((u) => (
										<SelectItem key={u} value={u}>
											{u}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : (
							<ValueText value={item.unit ?? ""} />
						)}
					</FieldCard>

					<FieldCard label="Кол-во в поставке">
						{isEditingInfo ? (
							<Input
								aria-label="Кол-во в поставке"
								type="number"
								inputMode="numeric"
								min={0}
								value={infoForm.quantityPerDelivery}
								onChange={(e) => updateInfo("quantityPerDelivery", e.target.value)}
								autoComplete="off"
							/>
						) : (
							<ValueText value={item.quantityPerDelivery != null ? String(item.quantityPerDelivery) : ""} />
						)}
					</FieldCard>

					<FieldCard label="Объём в год">
						{isEditingInfo ? (
							<Input
								aria-label="Объём в год"
								type="number"
								inputMode="numeric"
								min={0}
								value={infoForm.annualQuantity}
								onChange={(e) => updateInfo("annualQuantity", e.target.value)}
								autoComplete="off"
							/>
						) : (
							<ValueText value={String(item.annualQuantity)} />
						)}
					</FieldCard>
				</CardGrid>
			</Section>

			{/* --- Логистика (read-only, owned by parent inquiry) --- */}
			<Section title="Логистика" editing={false}>
				<CardGrid>
					<FieldCard label="Разгрузка">
						<ValueText value={procurementInquiry?.unloading ? UNLOADING_LABELS[procurementInquiry.unloading] : ""} />
					</FieldCard>

					<FieldCard label="Адрес доставки" span="full">
						<ValueText value={addressesText} />
					</FieldCard>
				</CardGrid>
			</Section>

			{/* --- Дополнительно (read-only, owned by parent inquiry) --- */}
			{procurementInquiry && (
				<Section title="Дополнительно" editing={false}>
					<CardGrid>
						<FieldCard label="Условия" span="half">
							<ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
								<li>
									<span className="text-muted-foreground">Допускается оплата наличными:</span>{" "}
									{yesNo(procurementInquiry.paymentMethod === "cash")}
								</li>
								<li>
									<span className="text-muted-foreground">Аналоги допускаются:</span>{" "}
									{yesNo(procurementInquiry.analoguesAllowed)}
								</li>
							</ul>
						</FieldCard>

						<FieldCard label="Комментарий" span="full">
							<ValueText value={procurementInquiry.additionalInfo ?? ""} />
						</FieldCard>
					</CardGrid>

					<div className="mt-3">
						<div className="mb-1.5 flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
							<Paperclip className="size-3" aria-hidden="true" />
							Прикреплённые файлы
						</div>
						{procurementInquiry.attachedFiles && procurementInquiry.attachedFiles.length > 0 ? (
							<ul className="flex flex-wrap gap-1.5">
								{procurementInquiry.attachedFiles.map((file) => (
									<li
										key={`${file.name}-${file.size}`}
										className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-sm"
									>
										<FileText className="size-3 text-muted-foreground" aria-hidden="true" />
										<span className="max-w-[18rem] truncate">{file.name}</span>
										<span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
									</li>
								))}
							</ul>
						) : (
							<p className="text-sm text-muted-foreground/50">Нет прикреплённых файлов</p>
						)}
					</div>
				</Section>
			)}

			{/* --- Ваш поставщик (read-only, owned by parent inquiry) --- */}
			<Section title="Ваш поставщик" editing={false}>
				<CardGrid>
					<FieldCard label="Название">
						<ValueText value={currentSupplier?.companyName ?? ""} />
					</FieldCard>

					<FieldCard label="ИНН">
						<ValueText value={currentSupplier?.inn ?? ""} />
					</FieldCard>

					<FieldCard label="Цена">
						<ValueText
							value={currentSupplier?.pricePerUnit != null ? formatCurrency(currentSupplier.pricePerUnit) : ""}
						/>
					</FieldCard>

					<FieldCard label="Оплата">
						<ValueText
							value={
								currentSupplier
									? formatPaymentType(currentSupplier.paymentType ?? "prepayment", {
											deferralDays: currentSupplier.deferralDays ?? 0,
											prepaymentPercent: currentSupplier.prepaymentPercent,
										})
									: ""
							}
						/>
					</FieldCard>

					<FieldCard label="Доставка">
						<ValueText
							value={
								item.deliveryCostType
									? item.deliveryCostType === "paid" && item.deliveryCost != null
										? `${DELIVERY_COST_TYPE_LABELS.paid} · ${formatCurrency(item.deliveryCost)}`
										: DELIVERY_COST_TYPE_LABELS[item.deliveryCostType]
									: ""
							}
						/>
					</FieldCard>
				</CardGrid>
			</Section>

			{/* --- Ответы на уточнения --- */}
			{answers.length > 0 && (
				<Section
					title="Ответы на уточнения"
					editLabel="Редактировать ответы на уточнения"
					editing={isEditingAnswers}
					onEdit={handleEditAnswers}
					onCancel={handleCancel}
					onSave={handleSaveAnswers}
					saveDisabled={!isAnswersDirty() || updateMutation.isPending}
					isPending={updateMutation.isPending}
				>
					<CardGrid>
						{answers.map((answer) => {
							const question = QUESTION_BY_ID.get(answer.questionId);
							const label = question?.label ?? answer.questionId;
							return (
								<FieldCard key={answer.questionId} label={label} span="full">
									{isEditingAnswers ? (
										<Textarea
											aria-label={`${label}: ответ`}
											value={answersForm.texts[answer.questionId] ?? ""}
											onChange={(e) => updateAnswerText(answer.questionId, e.target.value)}
											autoComplete="off"
										/>
									) : (
										<ValueText value={answerValueText(answer)} />
									)}
								</FieldCard>
							);
						})}
					</CardGrid>
				</Section>
			)}
		</div>
	);
}
