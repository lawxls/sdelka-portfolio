import { LoaderCircle, Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type {
	CurrentSupplier,
	DeliveryCostType,
	PaymentType,
	ProcurementItem,
	Unit,
	UnloadingType,
} from "@/data/types";
import {
	DELIVERY_COST_TYPE_LABELS,
	PAYMENT_TYPE_LABELS,
	PAYMENT_TYPES,
	UNITS,
	UNLOADING_LABELS,
	UNLOADING_TYPES,
} from "@/data/types";
import { useFolders } from "@/data/use-folders";
import { useItemDetail, useUpdateItemDetail } from "@/data/use-item-detail";
import { formatCurrency } from "@/lib/format";

interface DetailsTabPanelProps {
	itemId: string;
}

type SectionKey = "info" | "logistics" | "additional" | "currentSupplier" | null;

interface InfoFormState {
	name: string;
	description: string;
	unit: Unit | "";
	quantityPerDelivery: string;
	annualQuantity: string;
}

interface LogisticsFormState {
	unloading: UnloadingType | "";
	paymentType: PaymentType;
}

interface AdditionalFormState {
	deferralRequired: boolean;
	sampleRequired: boolean;
	analoguesAllowed: boolean;
	additionalInfo: string;
}

interface SupplierFormState {
	companyName: string;
	inn: string;
	pricePerUnit: string;
	paymentType: PaymentType;
	deferralDays: string;
	deliveryCostType: DeliveryCostType | "";
	deliveryCost: string;
}

function toNumberOrUndefined(value: string): number | undefined {
	const trimmed = value.trim();
	if (trimmed === "") return undefined;
	const n = Number(trimmed);
	return Number.isFinite(n) ? n : undefined;
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

function initLogisticsForm(item: ProcurementItem): LogisticsFormState {
	return {
		unloading: item.unloading ?? "",
		paymentType: item.paymentType ?? "prepayment",
	};
}

function initAdditionalForm(item: ProcurementItem): AdditionalFormState {
	return {
		deferralRequired: item.deferralRequired ?? false,
		sampleRequired: item.sampleRequired ?? false,
		analoguesAllowed: item.analoguesAllowed ?? false,
		additionalInfo: item.additionalInfo ?? "",
	};
}

function initSupplierForm(item: ProcurementItem): SupplierFormState {
	const s = item.currentSupplier;
	return {
		companyName: s?.companyName ?? "",
		inn: s?.inn ?? "",
		pricePerUnit: s?.pricePerUnit != null ? String(s.pricePerUnit) : "",
		paymentType: s?.paymentType ?? "prepayment",
		deferralDays: s?.deferralDays != null ? String(s.deferralDays) : "",
		deliveryCostType: item.deliveryCostType ?? "",
		deliveryCost: item.deliveryCost != null ? String(item.deliveryCost) : "",
	};
}

function Section({
	title,
	editLabel,
	editing,
	onEdit,
	onCancel,
	onSave,
	saveDisabled,
	isPending,
	children,
}: {
	title: string;
	editLabel?: string;
	editing?: boolean;
	onEdit?: () => void;
	onCancel?: () => void;
	onSave?: () => void;
	saveDisabled?: boolean;
	isPending?: boolean;
	children: React.ReactNode;
}) {
	return (
		<section className="rounded-lg border border-border p-4">
			<div className="mb-3 flex items-center justify-between">
				<h3 className="text-sm font-medium">{title}</h3>
				{!editing && editLabel && onEdit && (
					<button
						type="button"
						className="inline-flex items-center justify-center size-6 rounded text-muted-foreground/60 hover:text-foreground transition-colors"
						onClick={onEdit}
						aria-label={editLabel}
					>
						<Pencil className="size-3" aria-hidden="true" />
					</button>
				)}
			</div>
			{children}
			{editing && onCancel && onSave && (
				<div className="mt-4 flex justify-end gap-2">
					<Button type="button" variant="outline" size="sm" onClick={onCancel}>
						Отмена
					</Button>
					<Button type="button" size="sm" disabled={saveDisabled} onClick={onSave}>
						{isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
						Сохранить
					</Button>
				</div>
			)}
		</section>
	);
}

function CardGrid({ children }: { children: React.ReactNode }) {
	return <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function FieldCard({ label, children, span }: { label: string; children: React.ReactNode; span?: "full" }) {
	return (
		<div
			className={`rounded-md border border-border/60 bg-muted/30 p-3 flex flex-col gap-1 ${span === "full" ? "md:col-span-2 lg:col-span-3" : ""}`}
		>
			<span className="text-xs text-muted-foreground">{label}</span>
			{children}
		</div>
	);
}

function ValueText({ value }: { value: string }) {
	const hasValue = value.length > 0;
	return <span className={`text-sm ${hasValue ? "" : "text-muted-foreground/50"}`}>{hasValue ? value : "\u2014"}</span>;
}

export function DetailsTabPanel({ itemId }: DetailsTabPanelProps) {
	const { data: item, isLoading, isError } = useItemDetail(itemId);
	const { data: folders } = useFolders();
	const updateMutation = useUpdateItemDetail();

	const [editingSection, setEditingSection] = useState<SectionKey>(null);
	const [infoForm, setInfoForm] = useState<InfoFormState | null>(null);
	const [logisticsForm, setLogisticsForm] = useState<LogisticsFormState | null>(null);
	const [additionalForm, setAdditionalForm] = useState<AdditionalFormState | null>(null);
	const [supplierForm, setSupplierForm] = useState<SupplierFormState | null>(null);

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

	// --- Info ---
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
		return (
			infoForm.name !== currentItem.name ||
			infoForm.description !== (currentItem.description ?? "") ||
			infoForm.unit !== (currentItem.unit ?? "") ||
			toNumberOrUndefined(infoForm.quantityPerDelivery) !== currentItem.quantityPerDelivery ||
			toNumberOrUndefined(infoForm.annualQuantity) !== currentItem.annualQuantity
		);
	}

	// --- Logistics ---
	function handleEditLogistics() {
		setLogisticsForm(initLogisticsForm(currentItem));
		setEditingSection("logistics");
	}

	function updateLogistics<K extends keyof LogisticsFormState>(key: K, value: LogisticsFormState[K]) {
		setLogisticsForm((prev) => (prev ? { ...prev, [key]: value } : prev));
	}

	function handleSaveLogistics() {
		if (!logisticsForm) return;
		const data: Record<string, unknown> = {};
		if (logisticsForm.unloading !== (currentItem.unloading ?? ""))
			data.unloading = logisticsForm.unloading || undefined;
		if (logisticsForm.paymentType !== (currentItem.paymentType ?? "prepayment"))
			data.paymentType = logisticsForm.paymentType;
		mutate(data);
	}

	function isLogisticsDirty() {
		if (!logisticsForm) return false;
		return (
			logisticsForm.unloading !== (currentItem.unloading ?? "") ||
			logisticsForm.paymentType !== (currentItem.paymentType ?? "prepayment")
		);
	}

	// --- Additional ---
	function handleEditAdditional() {
		setAdditionalForm(initAdditionalForm(currentItem));
		setEditingSection("additional");
	}

	function updateAdditional<K extends keyof AdditionalFormState>(key: K, value: AdditionalFormState[K]) {
		setAdditionalForm((prev) => (prev ? { ...prev, [key]: value } : prev));
	}

	function handleSaveAdditional() {
		if (!additionalForm) return;
		const data: Record<string, unknown> = {};
		if (additionalForm.deferralRequired !== (currentItem.deferralRequired ?? false))
			data.deferralRequired = additionalForm.deferralRequired;
		if (additionalForm.sampleRequired !== (currentItem.sampleRequired ?? false))
			data.sampleRequired = additionalForm.sampleRequired;
		if (additionalForm.analoguesAllowed !== (currentItem.analoguesAllowed ?? false))
			data.analoguesAllowed = additionalForm.analoguesAllowed;
		if (additionalForm.additionalInfo !== (currentItem.additionalInfo ?? ""))
			data.additionalInfo = additionalForm.additionalInfo || undefined;
		mutate(data);
	}

	function isAdditionalDirty() {
		if (!additionalForm) return false;
		return (
			additionalForm.deferralRequired !== (currentItem.deferralRequired ?? false) ||
			additionalForm.sampleRequired !== (currentItem.sampleRequired ?? false) ||
			additionalForm.analoguesAllowed !== (currentItem.analoguesAllowed ?? false) ||
			additionalForm.additionalInfo !== (currentItem.additionalInfo ?? "")
		);
	}

	// --- Current supplier ---
	function handleEditSupplier() {
		setSupplierForm(initSupplierForm(currentItem));
		setEditingSection("currentSupplier");
	}

	function updateSupplier<K extends keyof SupplierFormState>(key: K, value: SupplierFormState[K]) {
		setSupplierForm((prev) => (prev ? { ...prev, [key]: value } : prev));
	}

	function handleSaveSupplier() {
		if (!supplierForm) return;
		const data: Record<string, unknown> = {};

		const existing = currentItem.currentSupplier;
		const nextPrice = toNumberOrUndefined(supplierForm.pricePerUnit);
		const nextDeferral = toNumberOrUndefined(supplierForm.deferralDays) ?? 0;

		const companyName = supplierForm.companyName.trim();
		const inn = supplierForm.inn.trim();

		const nextSupplier: CurrentSupplier = {
			companyName,
			...(inn ? { inn } : {}),
			paymentType: supplierForm.paymentType,
			deferralDays: nextDeferral,
			pricePerUnit: nextPrice ?? null,
		};

		const supplierChanged =
			!existing ||
			existing.companyName !== nextSupplier.companyName ||
			(existing.inn ?? "") !== (nextSupplier.inn ?? "") ||
			(existing.paymentType ?? "prepayment") !== nextSupplier.paymentType ||
			(existing.deferralDays ?? 0) !== nextSupplier.deferralDays ||
			(existing.pricePerUnit ?? null) !== nextSupplier.pricePerUnit;

		if (supplierChanged) {
			data.currentSupplier = companyName ? nextSupplier : undefined;
		}

		if (nextPrice !== undefined && nextPrice !== currentItem.currentPrice) {
			data.currentPrice = nextPrice;
		}

		const nextDeliveryType = supplierForm.deliveryCostType || undefined;
		if (nextDeliveryType !== currentItem.deliveryCostType) {
			data.deliveryCostType = nextDeliveryType;
		}

		if (supplierForm.deliveryCostType === "paid") {
			const nextDeliveryCost = toNumberOrUndefined(supplierForm.deliveryCost);
			if (nextDeliveryCost !== currentItem.deliveryCost) {
				data.deliveryCost = nextDeliveryCost;
			}
		} else if (currentItem.deliveryCost !== undefined) {
			data.deliveryCost = undefined;
		}

		mutate(data);
	}

	function isSupplierDirty() {
		if (!supplierForm) return false;
		const existing = currentItem.currentSupplier;
		const nextPrice = toNumberOrUndefined(supplierForm.pricePerUnit);
		const nextDeferral = toNumberOrUndefined(supplierForm.deferralDays) ?? 0;

		return (
			(existing?.companyName ?? "") !== supplierForm.companyName.trim() ||
			(existing?.inn ?? "") !== supplierForm.inn.trim() ||
			(existing?.paymentType ?? "prepayment") !== supplierForm.paymentType ||
			(existing?.deferralDays ?? 0) !== nextDeferral ||
			(existing?.pricePerUnit ?? null) !== (nextPrice ?? null) ||
			(currentItem.deliveryCostType ?? "") !== supplierForm.deliveryCostType ||
			(supplierForm.deliveryCostType === "paid"
				? toNumberOrUndefined(supplierForm.deliveryCost) !== currentItem.deliveryCost
				: false)
		);
	}

	const isEditingInfo = editingSection === "info" && infoForm !== null;
	const isEditingLogistics = editingSection === "logistics" && logisticsForm !== null;
	const isEditingAdditional = editingSection === "additional" && additionalForm !== null;
	const isEditingSupplier = editingSection === "currentSupplier" && supplierForm !== null;

	const folder = folders?.find((f) => f.id === item.folderId);
	const addressesText =
		item.deliveryAddresses && item.deliveryAddresses.length > 0 ? item.deliveryAddresses.join("; ") : "";

	const yesNo = (v: boolean | undefined) => (v ? "Да" : "Нет");

	return (
		<div data-testid="tab-panel-details" className="flex flex-col gap-4">
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
								<SelectTrigger aria-label="Ед. изм.">
									<SelectValue placeholder="Не указана" />
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

					<FieldCard label="Категория">
						<ValueText value={folder?.name ?? ""} />
					</FieldCard>
				</CardGrid>
			</Section>

			{/* --- Логистика и финансы --- */}
			<Section
				title="Логистика и финансы"
				editLabel="Редактировать логистику и финансы"
				editing={isEditingLogistics}
				onEdit={handleEditLogistics}
				onCancel={handleCancel}
				onSave={handleSaveLogistics}
				saveDisabled={!isLogisticsDirty() || updateMutation.isPending}
				isPending={updateMutation.isPending}
			>
				<CardGrid>
					<FieldCard label="Разгрузка">
						{isEditingLogistics ? (
							<SegmentedControl
								options={UNLOADING_TYPES}
								labels={UNLOADING_LABELS}
								value={logisticsForm.unloading || UNLOADING_TYPES[0]}
								onChange={(v) => updateLogistics("unloading", v)}
							/>
						) : (
							<ValueText value={item.unloading ? UNLOADING_LABELS[item.unloading] : ""} />
						)}
					</FieldCard>

					<FieldCard label="Оплата">
						{isEditingLogistics ? (
							<SegmentedControl
								options={PAYMENT_TYPES}
								labels={PAYMENT_TYPE_LABELS}
								value={logisticsForm.paymentType}
								onChange={(v) => updateLogistics("paymentType", v)}
							/>
						) : (
							<ValueText value={PAYMENT_TYPE_LABELS[item.paymentType ?? "prepayment"]} />
						)}
					</FieldCard>

					<FieldCard label="Адреса доставки" span="full">
						<ValueText value={addressesText} />
					</FieldCard>
				</CardGrid>
			</Section>

			{/* --- Дополнительно --- */}
			<Section
				title="Дополнительно"
				editLabel="Редактировать дополнительно"
				editing={isEditingAdditional}
				onEdit={handleEditAdditional}
				onCancel={handleCancel}
				onSave={handleSaveAdditional}
				saveDisabled={!isAdditionalDirty() || updateMutation.isPending}
				isPending={updateMutation.isPending}
			>
				<CardGrid>
					<FieldCard label="Отсрочка нужна">
						{isEditingAdditional ? (
							<div className="flex items-center gap-2">
								<Checkbox
									id="detail-deferralRequired"
									aria-label="Отсрочка нужна"
									checked={additionalForm.deferralRequired}
									onCheckedChange={(v) => updateAdditional("deferralRequired", v === true)}
								/>
								<label htmlFor="detail-deferralRequired" className="text-sm">
									Да
								</label>
							</div>
						) : (
							<ValueText value={yesNo(item.deferralRequired)} />
						)}
					</FieldCard>

					<FieldCard label="Нужен образец">
						{isEditingAdditional ? (
							<div className="flex items-center gap-2">
								<Checkbox
									id="detail-sampleRequired"
									aria-label="Нужен образец"
									checked={additionalForm.sampleRequired}
									onCheckedChange={(v) => updateAdditional("sampleRequired", v === true)}
								/>
								<label htmlFor="detail-sampleRequired" className="text-sm">
									Да
								</label>
							</div>
						) : (
							<ValueText value={yesNo(item.sampleRequired)} />
						)}
					</FieldCard>

					<FieldCard label="Допускаются аналоги">
						{isEditingAdditional ? (
							<div className="flex items-center gap-2">
								<Checkbox
									id="detail-analoguesAllowed"
									aria-label="Допускаются аналоги"
									checked={additionalForm.analoguesAllowed}
									onCheckedChange={(v) => updateAdditional("analoguesAllowed", v === true)}
								/>
								<label htmlFor="detail-analoguesAllowed" className="text-sm">
									Да
								</label>
							</div>
						) : (
							<ValueText value={yesNo(item.analoguesAllowed)} />
						)}
					</FieldCard>

					<FieldCard label="Комментарий" span="full">
						{isEditingAdditional ? (
							<Textarea
								aria-label="Комментарий"
								value={additionalForm.additionalInfo}
								onChange={(e) => updateAdditional("additionalInfo", e.target.value)}
								autoComplete="off"
							/>
						) : (
							<ValueText value={item.additionalInfo ?? ""} />
						)}
					</FieldCard>

					<FieldCard label="Файлы">
						<ValueText value="" />
					</FieldCard>
				</CardGrid>
			</Section>

			{/* --- Текущий поставщик --- */}
			<Section
				title="Текущий поставщик"
				editLabel="Редактировать текущего поставщика"
				editing={isEditingSupplier}
				onEdit={handleEditSupplier}
				onCancel={handleCancel}
				onSave={handleSaveSupplier}
				saveDisabled={!isSupplierDirty() || updateMutation.isPending}
				isPending={updateMutation.isPending}
			>
				<CardGrid>
					<FieldCard label="Название">
						{isEditingSupplier ? (
							<Input
								aria-label="Название поставщика"
								value={supplierForm.companyName}
								onChange={(e) => updateSupplier("companyName", e.target.value)}
								autoComplete="organization"
							/>
						) : (
							<ValueText value={item.currentSupplier?.companyName ?? ""} />
						)}
					</FieldCard>

					<FieldCard label="ИНН">
						{isEditingSupplier ? (
							<Input
								aria-label="ИНН поставщика"
								value={supplierForm.inn}
								onChange={(e) => updateSupplier("inn", e.target.value)}
								inputMode="numeric"
								autoComplete="off"
								spellCheck={false}
							/>
						) : (
							<ValueText value={item.currentSupplier?.inn ?? ""} />
						)}
					</FieldCard>

					<FieldCard label="Цена">
						{isEditingSupplier ? (
							<Input
								aria-label="Цена поставщика"
								type="number"
								inputMode="decimal"
								min={0}
								value={supplierForm.pricePerUnit}
								onChange={(e) => updateSupplier("pricePerUnit", e.target.value)}
								autoComplete="off"
							/>
						) : (
							<ValueText
								value={
									item.currentSupplier?.pricePerUnit != null ? formatCurrency(item.currentSupplier.pricePerUnit) : ""
								}
							/>
						)}
					</FieldCard>

					<FieldCard label="Оплата">
						{isEditingSupplier ? (
							<div className="flex flex-col gap-2">
								<SegmentedControl
									options={PAYMENT_TYPES}
									labels={PAYMENT_TYPE_LABELS}
									value={supplierForm.paymentType}
									onChange={(v) => updateSupplier("paymentType", v)}
								/>
								{supplierForm.paymentType === "deferred" && (
									<div className="flex items-center gap-1.5">
										<Input
											aria-label="Дней отсрочки"
											type="number"
											inputMode="numeric"
											min={0}
											value={supplierForm.deferralDays}
											onChange={(e) => updateSupplier("deferralDays", e.target.value)}
											className="w-24"
											autoComplete="off"
										/>
										<span className="text-xs text-muted-foreground">дней</span>
									</div>
								)}
							</div>
						) : (
							<ValueText value={PAYMENT_TYPE_LABELS[item.currentSupplier?.paymentType ?? "prepayment"]} />
						)}
					</FieldCard>

					<FieldCard label="Доставка">
						{isEditingSupplier ? (
							<div className="flex flex-col gap-2">
								<Select
									value={supplierForm.deliveryCostType || undefined}
									onValueChange={(v) => updateSupplier("deliveryCostType", v as DeliveryCostType)}
								>
									<SelectTrigger aria-label="Тип доставки">
										<SelectValue placeholder="Не указан" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="free">{DELIVERY_COST_TYPE_LABELS.free}</SelectItem>
										<SelectItem value="paid">{DELIVERY_COST_TYPE_LABELS.paid}</SelectItem>
										<SelectItem value="pickup">{DELIVERY_COST_TYPE_LABELS.pickup}</SelectItem>
									</SelectContent>
								</Select>
								{supplierForm.deliveryCostType === "paid" && (
									<Input
										aria-label="Стоимость доставки"
										type="number"
										inputMode="numeric"
										min={0}
										value={supplierForm.deliveryCost}
										onChange={(e) => updateSupplier("deliveryCost", e.target.value)}
										autoComplete="off"
									/>
								)}
							</div>
						) : (
							<ValueText value={item.deliveryCostType ? DELIVERY_COST_TYPE_LABELS[item.deliveryCostType] : ""} />
						)}
					</FieldCard>
				</CardGrid>
			</Section>

			{/* --- Ответы на уточнения --- */}
			<Section title="Ответы на уточнения">
				<p className="text-sm text-muted-foreground/50">—</p>
			</Section>
		</div>
	);
}
