import { useMemo, useState } from "react";
import { CardGrid, FieldCard, DetailSection as Section, ValueText } from "@/components/detail-section";
import { FolderSelect } from "@/components/ui/folder-select";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { ProcurementInquiry } from "@/data/domains/procurement-inquiries";
import type { ProcurementItem, Unit, UnloadingType } from "@/data/types";
import { DELIVERY_COST_TYPE_LABELS, formatPaymentType, UNITS, UNLOADING_LABELS } from "@/data/types";
import { useCompanyDetail } from "@/data/use-company-detail";
import { nextUnusedColor, useCreateFolder, useFolders } from "@/data/use-folders";
import { useItemDetail, useUpdateItemDetail } from "@/data/use-item-detail";
import { useProcurementInquiry, useUpdateProcurementInquiry } from "@/data/use-procurement-inquiries";
import { formatCurrency, toNumberOrUndefined } from "@/lib/format";

interface DetailsTabPanelProps {
	itemId: string;
}

interface InfoFormState {
	name: string;
	description: string;
	unit: Unit | "";
	quantityPerDelivery: string;
	annualQuantity: string;
	folderId: string | null;
}

function initInfoForm(item: ProcurementItem, procurementInquiry: ProcurementInquiry | undefined): InfoFormState {
	return {
		name: item.name,
		description: item.description ?? "",
		unit: item.unit ?? "",
		quantityPerDelivery: item.quantityPerDelivery != null ? String(item.quantityPerDelivery) : "",
		annualQuantity: String(item.annualQuantity),
		folderId: item.folderId ?? procurementInquiry?.folderId ?? null,
	};
}

export function DetailsTabPanel({ itemId }: DetailsTabPanelProps) {
	const { data: item, isLoading, isError } = useItemDetail(itemId);
	const { data: folders = [] } = useFolders();
	// ProcurementInquiry-level meta (company, category, address, payment method, current
	// supplier, requirements) lives on the parent inquiry after the schema
	// migration. Read-only here in the item drawer; edits are deferred to the
	// inquiry detail page in a later slice. Manual-add items skip the inquiry
	// and stamp company/category onto the item itself — fall back to those.
	const { data: procurementInquiry } = useProcurementInquiry(item?.procurementInquiryId ?? null);
	const effectiveCompanyId = item?.companyId ?? procurementInquiry?.companyId ?? null;
	const effectiveFolderId = item?.folderId ?? procurementInquiry?.folderId ?? null;
	const { data: company } = useCompanyDetail(effectiveCompanyId);
	const updateMutation = useUpdateItemDetail();
	const updateInquiryMutation = useUpdateProcurementInquiry();
	const createFolderMutation = useCreateFolder();
	const nextFolderColor = useMemo(() => nextUnusedColor(folders), [folders]);

	const [editingInfo, setEditingInfo] = useState(false);
	const [infoForm, setInfoForm] = useState<InfoFormState | null>(null);

	const folder = useMemo(() => folders.find((f) => f.id === effectiveFolderId), [folders, effectiveFolderId]);

	const addressText = useMemo(() => {
		if (!procurementInquiry?.deliveryAddressId || !company?.addresses) return "";
		return company.addresses.find((a) => a.id === procurementInquiry.deliveryAddressId)?.address ?? "";
	}, [procurementInquiry?.deliveryAddressId, company?.addresses]);

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
		setEditingInfo(false);
	}

	function handleEditInfo() {
		setInfoForm(initInfoForm(currentItem, procurementInquiry));
		setEditingInfo(true);
	}

	function updateInfo<K extends keyof InfoFormState>(key: K, value: InfoFormState[K]) {
		setInfoForm((prev) => (prev ? { ...prev, [key]: value } : prev));
	}

	function handleCreateFolder(name: string, color: string) {
		createFolderMutation.mutate(
			{ name, color },
			{
				onSuccess: (created) => {
					setInfoForm((prev) => (prev ? { ...prev, folderId: created.id } : prev));
				},
			},
		);
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

		const folderChanged = procurementInquiry && infoForm.folderId !== (procurementInquiry.folderId ?? null);
		const hasItemChanges = Object.keys(data).length > 0;

		const pending: Promise<unknown>[] = [];
		if (hasItemChanges) {
			pending.push(updateMutation.mutateAsync({ id: itemId, ...data } as Parameters<typeof updateMutation.mutate>[0]));
		}
		if (folderChanged && procurementInquiry) {
			pending.push(
				updateInquiryMutation.mutateAsync({ id: procurementInquiry.id, patch: { folderId: infoForm.folderId } }),
			);
		}
		if (pending.length === 0) {
			setEditingInfo(false);
			return;
		}
		// Errors are surfaced via each mutation's onError toast; on failure
		// we leave edit mode open so the user can retry.
		Promise.all(pending).then(
			() => setEditingInfo(false),
			() => {},
		);
	}

	function isInfoDirty() {
		if (!infoForm) return false;
		const aq = toNumberOrUndefined(infoForm.annualQuantity);
		return (
			infoForm.name !== currentItem.name ||
			infoForm.description !== (currentItem.description ?? "") ||
			infoForm.unit !== (currentItem.unit ?? "") ||
			toNumberOrUndefined(infoForm.quantityPerDelivery) !== currentItem.quantityPerDelivery ||
			(aq !== undefined && aq !== currentItem.annualQuantity) ||
			infoForm.folderId !== effectiveFolderId
		);
	}

	const isEditingInfo = editingInfo && infoForm !== null;
	const isSavingInfo = updateMutation.isPending || updateInquiryMutation.isPending;

	const yesNo = (v: boolean | undefined) => (v ? "Да" : "Нет");
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
				saveDisabled={!isInfoDirty() || (infoForm?.name.trim() ?? "") === "" || isSavingInfo}
				isPending={isSavingInfo}
			>
				<CardGrid>
					<FieldCard label="Компания">
						<ValueText value={company?.name ?? ""} />
					</FieldCard>

					<FieldCard label="Категория">
						{isEditingInfo && procurementInquiry ? (
							<FolderSelect
								folders={folders}
								value={infoForm.folderId}
								onChange={(id) => updateInfo("folderId", id)}
								onCreateFolder={handleCreateFolder}
								nextFolderColor={nextFolderColor}
							/>
						) : (
							<ValueText value={folder?.name ?? ""} />
						)}
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
						<ValueText
							value={
								procurementInquiry?.unloading ? UNLOADING_LABELS[procurementInquiry.unloading as UnloadingType] : ""
							}
						/>
					</FieldCard>

					<FieldCard label="Адрес доставки" span="full">
						<ValueText value={addressText} />
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
									{yesNo(procurementInquiry.cashAllowed)}
								</li>
								<li>
									<span className="text-muted-foreground">Аналоги допускаются:</span>{" "}
									{yesNo(!procurementInquiry.analoguesNotAllowed)}
								</li>
							</ul>
						</FieldCard>

						<FieldCard label="Комментарий" span="full">
							<ValueText value={procurementInquiry.additionalInfo ?? ""} />
						</FieldCard>
					</CardGrid>
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
		</div>
	);
}
