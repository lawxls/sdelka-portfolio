import { LoaderCircle, Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ViewField } from "@/components/view-field";
import type {
	DeliveryType,
	FrequencyPeriod,
	PaymentType,
	PriceMonitoringPeriod,
	ProcurementItem,
	Unit,
	UnloadingType,
} from "@/data/types";
import {
	DELIVERY_TYPE_LABELS,
	DELIVERY_TYPES,
	FREQUENCY_PERIOD_LABELS,
	FREQUENCY_PERIODS,
	PAYMENT_TYPE_LABELS,
	PAYMENT_TYPES,
	PRICE_MONITORING_PERIOD_LABELS,
	PRICE_MONITORING_PERIODS,
	UNITS,
	UNLOADING_LABELS,
	UNLOADING_TYPES,
} from "@/data/types";
import { useItemDetail, useUpdateItemDetail } from "@/data/use-item-detail";
import { formatCurrency } from "@/lib/format";

interface DetailsTabPanelProps {
	itemId: string;
}

type EditingSection = "info" | "conditions" | "requestParams" | "additional" | null;

interface InfoFormState {
	name: string;
	description: string;
	annualQuantity: number;
	currentPrice: number;
	unit: Unit | "";
}

interface ConditionsFormState {
	paymentType: PaymentType;
	deliveryType: DeliveryType;
	unloading: UnloadingType | "";
	frequencyCount: number;
	frequencyPeriod: FrequencyPeriod;
}

interface RequestParamsFormState {
	priceMonitoringPeriod: PriceMonitoringPeriod;
	analoguesAllowed: boolean;
	hideCompanyInfo: boolean;
}

interface AdditionalFormState {
	additionalInfo: string;
}

function initInfoForm(item: ProcurementItem): InfoFormState {
	return {
		name: item.name,
		description: item.description ?? "",
		annualQuantity: item.annualQuantity,
		currentPrice: item.currentPrice,
		unit: item.unit ?? "",
	};
}

function initConditionsForm(item: ProcurementItem): ConditionsFormState {
	return {
		paymentType: item.paymentType ?? "prepayment",
		deliveryType: item.deliveryType ?? "warehouse",
		unloading: item.unloading ?? "",
		frequencyCount: item.frequencyCount ?? 1,
		frequencyPeriod: item.frequencyPeriod ?? "month",
	};
}

function initRequestParamsForm(item: ProcurementItem): RequestParamsFormState {
	return {
		priceMonitoringPeriod: item.priceMonitoringPeriod ?? "quarter",
		analoguesAllowed: item.analoguesAllowed ?? false,
		hideCompanyInfo: item.hideCompanyInfo ?? false,
	};
}

function initAdditionalForm(item: ProcurementItem): AdditionalFormState {
	return {
		additionalInfo: item.additionalInfo ?? "",
	};
}

function FieldRow({ label, children, htmlFor }: { label: string; children: React.ReactNode; htmlFor?: string }) {
	return (
		<div className="flex flex-col gap-1">
			<label htmlFor={htmlFor} className="text-xs text-muted-foreground">
				{label}
			</label>
			{children}
		</div>
	);
}

function CheckboxRow({
	label,
	checked,
	onCheckedChange,
	id,
}: {
	label: string;
	checked: boolean;
	onCheckedChange: (v: boolean) => void;
	id: string;
}) {
	return (
		<div className="flex items-center gap-2">
			<Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
			<label htmlFor={id} className="text-xs text-muted-foreground">
				{label}
			</label>
		</div>
	);
}

function SectionHeader({ title }: { title: string }) {
	return <h3 className="text-sm font-medium mb-3">{title}</h3>;
}

function EditButton({ onClick, label }: { onClick: () => void; label: string }) {
	return (
		<button
			type="button"
			className="absolute top-2 right-2 inline-flex items-center justify-center size-6 rounded text-muted-foreground/60 hover:text-foreground transition-colors"
			onClick={onClick}
			aria-label={label}
		>
			<Pencil className="size-3" aria-hidden="true" />
		</button>
	);
}

function SaveCancelButtons({
	onCancel,
	onSave,
	disabled,
	isPending,
}: {
	onCancel: () => void;
	onSave: () => void;
	disabled: boolean;
	isPending: boolean;
}) {
	return (
		<div className="flex justify-end gap-2 mt-4">
			<Button type="button" variant="outline" size="sm" onClick={onCancel}>
				Отмена
			</Button>
			<Button type="button" size="sm" disabled={disabled} onClick={onSave}>
				{isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
				Сохранить
			</Button>
		</div>
	);
}

export function DetailsTabPanel({ itemId }: DetailsTabPanelProps) {
	const { data: item, isLoading, isError } = useItemDetail(itemId);
	const updateMutation = useUpdateItemDetail();
	const [editingSection, setEditingSection] = useState<EditingSection>(null);
	const [infoForm, setInfoForm] = useState<InfoFormState | null>(null);
	const [conditionsForm, setConditionsForm] = useState<ConditionsFormState | null>(null);
	const [requestParamsForm, setRequestParamsForm] = useState<RequestParamsFormState | null>(null);
	const [additionalForm, setAdditionalForm] = useState<AdditionalFormState | null>(null);

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

	// --- Info section ---

	function handleEditInfo() {
		setInfoForm(initInfoForm(currentItem));
		setEditingSection("info");
	}

	function updateInfo<K extends keyof InfoFormState>(field: K, value: InfoFormState[K]) {
		setInfoForm((prev) => (prev ? { ...prev, [field]: value } : prev));
	}

	function handleSaveInfo() {
		if (!infoForm) return;
		const data: Record<string, unknown> = { id: itemId };

		if (infoForm.name !== currentItem.name) data.name = infoForm.name;
		if (infoForm.description !== (currentItem.description ?? "")) data.description = infoForm.description || undefined;
		if (infoForm.annualQuantity !== currentItem.annualQuantity) data.annualQuantity = infoForm.annualQuantity;
		if (infoForm.currentPrice !== currentItem.currentPrice) data.currentPrice = infoForm.currentPrice;
		if (infoForm.unit !== (currentItem.unit ?? "")) data.unit = infoForm.unit || undefined;

		updateMutation.mutate(data as Parameters<typeof updateMutation.mutate>[0], {
			onSuccess: () => setEditingSection(null),
		});
	}

	function isInfoDirty() {
		if (!infoForm) return false;
		return (
			infoForm.name !== currentItem.name ||
			infoForm.description !== (currentItem.description ?? "") ||
			infoForm.annualQuantity !== currentItem.annualQuantity ||
			infoForm.currentPrice !== currentItem.currentPrice ||
			infoForm.unit !== (currentItem.unit ?? "")
		);
	}

	// --- Conditions section ---

	function handleEditConditions() {
		setConditionsForm(initConditionsForm(currentItem));
		setEditingSection("conditions");
	}

	function updateConditions<K extends keyof ConditionsFormState>(field: K, value: ConditionsFormState[K]) {
		setConditionsForm((prev) => (prev ? { ...prev, [field]: value } : prev));
	}

	function handleSaveConditions() {
		if (!conditionsForm) return;
		const data: Record<string, unknown> = { id: itemId };

		if (conditionsForm.paymentType !== (currentItem.paymentType ?? "prepayment"))
			data.paymentType = conditionsForm.paymentType;
		if (conditionsForm.deliveryType !== (currentItem.deliveryType ?? "warehouse"))
			data.deliveryType = conditionsForm.deliveryType;
		if (conditionsForm.unloading !== (currentItem.unloading ?? ""))
			data.unloading = conditionsForm.unloading || undefined;
		if (conditionsForm.frequencyCount !== (currentItem.frequencyCount ?? 1))
			data.frequencyCount = conditionsForm.frequencyCount;
		if (conditionsForm.frequencyPeriod !== (currentItem.frequencyPeriod ?? "month"))
			data.frequencyPeriod = conditionsForm.frequencyPeriod;

		updateMutation.mutate(data as Parameters<typeof updateMutation.mutate>[0], {
			onSuccess: () => setEditingSection(null),
		});
	}

	function isConditionsDirty() {
		if (!conditionsForm) return false;
		return (
			conditionsForm.paymentType !== (currentItem.paymentType ?? "prepayment") ||
			conditionsForm.deliveryType !== (currentItem.deliveryType ?? "warehouse") ||
			conditionsForm.unloading !== (currentItem.unloading ?? "") ||
			conditionsForm.frequencyCount !== (currentItem.frequencyCount ?? 1) ||
			conditionsForm.frequencyPeriod !== (currentItem.frequencyPeriod ?? "month")
		);
	}

	// --- Request params section ---

	function handleEditRequestParams() {
		setRequestParamsForm(initRequestParamsForm(currentItem));
		setEditingSection("requestParams");
	}

	function updateRequestParams<K extends keyof RequestParamsFormState>(field: K, value: RequestParamsFormState[K]) {
		setRequestParamsForm((prev) => (prev ? { ...prev, [field]: value } : prev));
	}

	function handleSaveRequestParams() {
		if (!requestParamsForm) return;
		const data: Record<string, unknown> = { id: itemId };

		if (requestParamsForm.priceMonitoringPeriod !== (currentItem.priceMonitoringPeriod ?? "quarter"))
			data.priceMonitoringPeriod = requestParamsForm.priceMonitoringPeriod;
		if (requestParamsForm.analoguesAllowed !== (currentItem.analoguesAllowed ?? false))
			data.analoguesAllowed = requestParamsForm.analoguesAllowed;
		if (requestParamsForm.hideCompanyInfo !== (currentItem.hideCompanyInfo ?? false))
			data.hideCompanyInfo = requestParamsForm.hideCompanyInfo;

		updateMutation.mutate(data as Parameters<typeof updateMutation.mutate>[0], {
			onSuccess: () => setEditingSection(null),
		});
	}

	function isRequestParamsDirty() {
		if (!requestParamsForm) return false;
		return (
			requestParamsForm.priceMonitoringPeriod !== (currentItem.priceMonitoringPeriod ?? "quarter") ||
			requestParamsForm.analoguesAllowed !== (currentItem.analoguesAllowed ?? false) ||
			requestParamsForm.hideCompanyInfo !== (currentItem.hideCompanyInfo ?? false)
		);
	}

	// --- Additional section ---

	function handleEditAdditional() {
		setAdditionalForm(initAdditionalForm(currentItem));
		setEditingSection("additional");
	}

	function handleSaveAdditional() {
		if (!additionalForm) return;
		const data: Record<string, unknown> = { id: itemId };

		if (additionalForm.additionalInfo !== (currentItem.additionalInfo ?? ""))
			data.additionalInfo = additionalForm.additionalInfo || undefined;

		updateMutation.mutate(data as Parameters<typeof updateMutation.mutate>[0], {
			onSuccess: () => setEditingSection(null),
		});
	}

	function isAdditionalDirty() {
		if (!additionalForm) return false;
		return additionalForm.additionalInfo !== (currentItem.additionalInfo ?? "");
	}

	const frequencyDisplay = item.frequencyCount
		? `${item.frequencyCount} раз / ${FREQUENCY_PERIOD_LABELS[item.frequencyPeriod ?? "month"].toLowerCase()}`
		: "Не указана";

	return (
		<div data-testid="tab-panel-details" className="flex flex-col gap-4">
			{/* --- Основная информация --- */}
			{editingSection === "info" && infoForm ? (
				<div className="rounded-lg border border-border p-4">
					<SectionHeader title="Основная информация" />
					<div className="flex flex-col gap-3">
						<FieldRow label="Название" htmlFor="detail-name">
							<Input
								id="detail-name"
								aria-label="Название"
								value={infoForm.name}
								onChange={(e) => updateInfo("name", e.target.value)}
								spellCheck={false}
								autoComplete="off"
							/>
						</FieldRow>

						<FieldRow label="Описание" htmlFor="detail-description">
							<Textarea
								id="detail-description"
								aria-label="Описание"
								value={infoForm.description}
								onChange={(e) => updateInfo("description", e.target.value)}
								autoComplete="off"
							/>
						</FieldRow>

						<div className="grid grid-cols-2 gap-4 max-w-xs">
							<FieldRow label="Количество" htmlFor="detail-annualQuantity">
								<Input
									id="detail-annualQuantity"
									aria-label="Количество"
									type="number"
									inputMode="numeric"
									min={0}
									value={infoForm.annualQuantity}
									onChange={(e) => updateInfo("annualQuantity", Number(e.target.value))}
									autoComplete="off"
								/>
							</FieldRow>

							<FieldRow label="Единица измерения">
								<Select value={infoForm.unit || undefined} onValueChange={(v) => updateInfo("unit", v as Unit)}>
									<SelectTrigger aria-label="Единица измерения">
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
							</FieldRow>
						</div>

						<FieldRow label="Текущая цена" htmlFor="detail-currentPrice">
							<Input
								id="detail-currentPrice"
								aria-label="Текущая цена"
								className="max-w-36"
								type="number"
								inputMode="numeric"
								min={0}
								value={infoForm.currentPrice}
								onChange={(e) => updateInfo("currentPrice", Number(e.target.value))}
								autoComplete="off"
							/>
						</FieldRow>
					</div>
					<SaveCancelButtons
						onCancel={handleCancel}
						onSave={handleSaveInfo}
						disabled={!isInfoDirty() || infoForm.name.trim() === "" || updateMutation.isPending}
						isPending={updateMutation.isPending}
					/>
				</div>
			) : (
				<div className="relative rounded-lg border border-border p-4">
					<EditButton onClick={handleEditInfo} label="Редактировать основную информацию" />
					<SectionHeader title="Основная информация" />
					<div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
						<ViewField label="Название" value={item.name} />
						<ViewField label="Описание" value={item.description ?? ""} />
						<ViewField label="Количество" value={String(item.annualQuantity)} />
						<ViewField label="Единица измерения" value={item.unit ?? ""} />
						<ViewField label="Текущая цена" value={formatCurrency(item.currentPrice)} />
					</div>
				</div>
			)}

			{/* --- Условия --- */}
			{editingSection === "conditions" && conditionsForm ? (
				<div className="rounded-lg border border-border p-4">
					<SectionHeader title="Условия" />
					<div className="flex flex-col gap-3">
						<FieldRow label="Условия оплаты">
							<SegmentedControl
								options={PAYMENT_TYPES}
								labels={PAYMENT_TYPE_LABELS}
								value={conditionsForm.paymentType}
								onChange={(v) => updateConditions("paymentType", v)}
							/>
						</FieldRow>

						<FieldRow label="Доставка">
							<SegmentedControl
								options={DELIVERY_TYPES}
								labels={DELIVERY_TYPE_LABELS}
								value={conditionsForm.deliveryType}
								onChange={(v) => updateConditions("deliveryType", v)}
							/>
						</FieldRow>

						<FieldRow label="Разгрузка">
							<SegmentedControl
								options={UNLOADING_TYPES}
								labels={UNLOADING_LABELS}
								value={conditionsForm.unloading || UNLOADING_TYPES[0]}
								onChange={(v) => updateConditions("unloading", v)}
							/>
						</FieldRow>

						<div className="grid grid-cols-2 gap-4 max-w-xs">
							<FieldRow label="Частота поставок" htmlFor="detail-frequencyCount">
								<Input
									id="detail-frequencyCount"
									aria-label="Частота поставок"
									type="number"
									inputMode="numeric"
									min={1}
									value={conditionsForm.frequencyCount}
									onChange={(e) => updateConditions("frequencyCount", Number(e.target.value))}
									autoComplete="off"
								/>
							</FieldRow>

							<FieldRow label="Период">
								<Select
									value={conditionsForm.frequencyPeriod}
									onValueChange={(v) => updateConditions("frequencyPeriod", v as FrequencyPeriod)}
								>
									<SelectTrigger aria-label="Период частоты поставок">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{FREQUENCY_PERIODS.map((p) => (
											<SelectItem key={p} value={p}>
												{FREQUENCY_PERIOD_LABELS[p]}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</FieldRow>
						</div>
					</div>
					<SaveCancelButtons
						onCancel={handleCancel}
						onSave={handleSaveConditions}
						disabled={!isConditionsDirty() || updateMutation.isPending}
						isPending={updateMutation.isPending}
					/>
				</div>
			) : (
				<div className="relative rounded-lg border border-border p-4">
					<EditButton onClick={handleEditConditions} label="Редактировать условия" />
					<SectionHeader title="Условия" />
					<div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
						<ViewField label="Условия оплаты" value={PAYMENT_TYPE_LABELS[item.paymentType ?? "prepayment"]} />
						<ViewField label="Доставка" value={DELIVERY_TYPE_LABELS[item.deliveryType ?? "warehouse"]} />
						<ViewField label="Разгрузка" value={item.unloading ? UNLOADING_LABELS[item.unloading] : ""} />
						<ViewField label="Частота поставок" value={frequencyDisplay} />
					</div>
				</div>
			)}

			{/* --- Параметры запроса --- */}
			{editingSection === "requestParams" && requestParamsForm ? (
				<div className="rounded-lg border border-border p-4">
					<SectionHeader title="Параметры запроса" />
					<div className="flex flex-col gap-3">
						<FieldRow label="Периодичность мониторинга цен">
							<Select
								value={requestParamsForm.priceMonitoringPeriod}
								onValueChange={(v) => updateRequestParams("priceMonitoringPeriod", v as PriceMonitoringPeriod)}
							>
								<SelectTrigger aria-label="Периодичность мониторинга цен">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PRICE_MONITORING_PERIODS.map((p) => (
										<SelectItem key={p} value={p}>
											{PRICE_MONITORING_PERIOD_LABELS[p]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</FieldRow>

						<CheckboxRow
							id="detail-analoguesAllowed"
							label="Допускаются аналоги"
							checked={requestParamsForm.analoguesAllowed}
							onCheckedChange={(v) => updateRequestParams("analoguesAllowed", v)}
						/>

						<CheckboxRow
							id="detail-hideCompanyInfo"
							label="Скрыть информацию о компании в запросе"
							checked={requestParamsForm.hideCompanyInfo}
							onCheckedChange={(v) => updateRequestParams("hideCompanyInfo", v)}
						/>
					</div>
					<SaveCancelButtons
						onCancel={handleCancel}
						onSave={handleSaveRequestParams}
						disabled={!isRequestParamsDirty() || updateMutation.isPending}
						isPending={updateMutation.isPending}
					/>
				</div>
			) : (
				<div className="relative rounded-lg border border-border p-4">
					<EditButton onClick={handleEditRequestParams} label="Редактировать параметры запроса" />
					<SectionHeader title="Параметры запроса" />
					<div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
						<ViewField
							label="Периодичность мониторинга цен"
							value={PRICE_MONITORING_PERIOD_LABELS[item.priceMonitoringPeriod ?? "quarter"]}
						/>
						<ViewField label="Допускаются аналоги" value={item.analoguesAllowed ? "Да" : "Нет"} />
						<ViewField label="Скрыть информацию о компании" value={item.hideCompanyInfo ? "Да" : "Нет"} />
					</div>
				</div>
			)}

			{/* --- Дополнительно --- */}
			{editingSection === "additional" && additionalForm ? (
				<div className="rounded-lg border border-border p-4">
					<SectionHeader title="Дополнительно" />
					<div className="flex flex-col gap-3">
						<FieldRow label="Комментарий" htmlFor="detail-additionalInfo">
							<Textarea
								id="detail-additionalInfo"
								aria-label="Комментарий"
								value={additionalForm.additionalInfo}
								onChange={(e) =>
									setAdditionalForm((prev) => (prev ? { ...prev, additionalInfo: e.target.value } : prev))
								}
								autoComplete="off"
							/>
						</FieldRow>

						<FieldRow label="Файлы">
							<p className="text-sm text-muted-foreground">Нет файлов</p>
						</FieldRow>
					</div>
					<SaveCancelButtons
						onCancel={handleCancel}
						onSave={handleSaveAdditional}
						disabled={!isAdditionalDirty() || updateMutation.isPending}
						isPending={updateMutation.isPending}
					/>
				</div>
			) : (
				<div className="relative rounded-lg border border-border p-4">
					<EditButton onClick={handleEditAdditional} label="Редактировать дополнительно" />
					<SectionHeader title="Дополнительно" />
					<div className="flex flex-col gap-3">
						<ViewField label="Комментарий" value={item.additionalInfo ?? ""} />
						<ViewField label="Файлы" value="Нет файлов" />
					</div>
				</div>
			)}
		</div>
	);
}
