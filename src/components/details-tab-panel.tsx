import { LoaderCircle, Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewField } from "@/components/view-field";
import type { DeliveryType, PaymentType, ProcurementItem, Unit } from "@/data/types";
import {
	DELIVERY_TYPE_LABELS,
	DELIVERY_TYPES,
	PAYMENT_TYPE_LABELS,
	PAYMENT_TYPES,
	STATUS_LABELS,
	UNITS,
} from "@/data/types";
import { useItemDetail, useUpdateItemDetail } from "@/data/use-item-detail";
import { formatCurrency } from "@/lib/format";

interface DetailsTabPanelProps {
	itemId: string;
}

type EditingSection = "info" | "conditions" | null;

interface InfoFormState {
	name: string;
	annualQuantity: number;
	currentPrice: number;
	unit: Unit | "";
	frequencyCount: number;
}

interface ConditionsFormState {
	paymentType: PaymentType;
	deliveryType: DeliveryType;
}

function initInfoForm(item: ProcurementItem): InfoFormState {
	return {
		name: item.name,
		annualQuantity: item.annualQuantity,
		currentPrice: item.currentPrice,
		unit: item.unit ?? "",
		frequencyCount: item.frequencyCount ?? 1,
	};
}

function initConditionsForm(item: ProcurementItem): ConditionsFormState {
	return {
		paymentType: item.paymentType ?? "prepayment",
		deliveryType: item.deliveryType ?? "warehouse",
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

export function DetailsTabPanel({ itemId }: DetailsTabPanelProps) {
	const { data: item, isLoading, isError } = useItemDetail(itemId);
	const updateMutation = useUpdateItemDetail();
	const [editingSection, setEditingSection] = useState<EditingSection>(null);
	const [infoForm, setInfoForm] = useState<InfoFormState | null>(null);
	const [conditionsForm, setConditionsForm] = useState<ConditionsFormState | null>(null);

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

	// Non-null alias — TS doesn't preserve narrowing into closures
	const currentItem = item;

	function handleEditInfo() {
		setInfoForm(initInfoForm(currentItem));
		setEditingSection("info");
	}

	function handleEditConditions() {
		setConditionsForm(initConditionsForm(currentItem));
		setEditingSection("conditions");
	}

	function handleCancel() {
		setEditingSection(null);
	}

	function updateInfo<K extends keyof InfoFormState>(field: K, value: InfoFormState[K]) {
		setInfoForm((prev) => (prev ? { ...prev, [field]: value } : prev));
	}

	function updateConditions<K extends keyof ConditionsFormState>(field: K, value: ConditionsFormState[K]) {
		setConditionsForm((prev) => (prev ? { ...prev, [field]: value } : prev));
	}

	function handleSaveInfo() {
		if (!infoForm) return;
		const data: Record<string, unknown> = { id: itemId };

		if (infoForm.name !== currentItem.name) data.name = infoForm.name;
		if (infoForm.annualQuantity !== currentItem.annualQuantity) data.annualQuantity = infoForm.annualQuantity;
		if (infoForm.currentPrice !== currentItem.currentPrice) data.currentPrice = infoForm.currentPrice;
		if (infoForm.unit !== (currentItem.unit ?? "")) data.unit = infoForm.unit || undefined;
		if (infoForm.frequencyCount !== (currentItem.frequencyCount ?? 1)) data.frequencyCount = infoForm.frequencyCount;

		updateMutation.mutate(data as Parameters<typeof updateMutation.mutate>[0], {
			onSuccess: () => setEditingSection(null),
		});
	}

	function handleSaveConditions() {
		if (!conditionsForm) return;
		const data: Record<string, unknown> = { id: itemId };

		if (conditionsForm.paymentType !== (currentItem.paymentType ?? "prepayment"))
			data.paymentType = conditionsForm.paymentType;
		if (conditionsForm.deliveryType !== (currentItem.deliveryType ?? "warehouse"))
			data.deliveryType = conditionsForm.deliveryType;

		updateMutation.mutate(data as Parameters<typeof updateMutation.mutate>[0], {
			onSuccess: () => setEditingSection(null),
		});
	}

	function isInfoDirty() {
		if (!infoForm) return false;
		return (
			infoForm.name !== currentItem.name ||
			infoForm.annualQuantity !== currentItem.annualQuantity ||
			infoForm.currentPrice !== currentItem.currentPrice ||
			infoForm.unit !== (currentItem.unit ?? "") ||
			infoForm.frequencyCount !== (currentItem.frequencyCount ?? 1)
		);
	}

	function isConditionsDirty() {
		if (!conditionsForm) return false;
		return (
			conditionsForm.paymentType !== (currentItem.paymentType ?? "prepayment") ||
			conditionsForm.deliveryType !== (currentItem.deliveryType ?? "warehouse")
		);
	}

	return (
		<div data-testid="tab-panel-details" className="flex flex-col gap-4">
			{editingSection === "info" && infoForm ? (
				<div className="rounded-lg border border-border p-4">
					<h3 className="text-sm font-medium mb-3">Основная информация</h3>
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

						<div className="grid grid-cols-2 gap-4">
							<FieldRow label="Годовой объём" htmlFor="detail-annualQuantity">
								<Input
									id="detail-annualQuantity"
									aria-label="Годовой объём"
									type="number"
									inputMode="numeric"
									min={0}
									value={infoForm.annualQuantity}
									onChange={(e) => updateInfo("annualQuantity", Number(e.target.value))}
									autoComplete="off"
								/>
							</FieldRow>

							<FieldRow label="Текущая цена" htmlFor="detail-currentPrice">
								<Input
									id="detail-currentPrice"
									aria-label="Текущая цена"
									type="number"
									inputMode="numeric"
									min={0}
									value={infoForm.currentPrice}
									onChange={(e) => updateInfo("currentPrice", Number(e.target.value))}
									autoComplete="off"
								/>
							</FieldRow>
						</div>

						<div className="grid grid-cols-2 gap-4">
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

							<FieldRow label="Частота поставок" htmlFor="detail-frequencyCount">
								<Input
									id="detail-frequencyCount"
									aria-label="Частота поставок"
									type="number"
									inputMode="numeric"
									min={1}
									value={infoForm.frequencyCount}
									onChange={(e) => updateInfo("frequencyCount", Number(e.target.value))}
									autoComplete="off"
								/>
							</FieldRow>
						</div>
					</div>
					<div className="flex justify-end gap-2 mt-4">
						<Button type="button" variant="outline" size="sm" onClick={handleCancel}>
							Отмена
						</Button>
						<Button
							type="button"
							size="sm"
							disabled={!isInfoDirty() || infoForm.name.trim() === "" || updateMutation.isPending}
							onClick={handleSaveInfo}
						>
							{updateMutation.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
							Сохранить
						</Button>
					</div>
				</div>
			) : (
				<div className="relative rounded-lg border border-border p-4">
					<button
						type="button"
						className="absolute top-2 right-2 inline-flex items-center justify-center size-6 rounded text-muted-foreground/60 hover:text-foreground transition-colors"
						onClick={handleEditInfo}
						aria-label="Редактировать основную информацию"
					>
						<Pencil className="size-3" aria-hidden="true" />
					</button>
					<h3 className="text-sm font-medium mb-3">Основная информация</h3>
					<div className="grid grid-cols-2 gap-x-4 gap-y-3">
						<ViewField label="Название" value={item.name} />
						<ViewField label="Годовой объём" value={String(item.annualQuantity)} />
						<ViewField label="Текущая цена" value={formatCurrency(item.currentPrice)} />
						<ViewField label="Единица измерения" value={item.unit ?? ""} />
						<ViewField label="Частота поставок" value={String(item.frequencyCount ?? 1)} />
					</div>
				</div>
			)}

			{editingSection === "conditions" && conditionsForm ? (
				<div className="rounded-lg border border-border p-4">
					<h3 className="text-sm font-medium mb-3">Условия</h3>
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
					</div>
					<div className="flex justify-end gap-2 mt-4">
						<Button type="button" variant="outline" size="sm" onClick={handleCancel}>
							Отмена
						</Button>
						<Button
							type="button"
							size="sm"
							disabled={!isConditionsDirty() || updateMutation.isPending}
							onClick={handleSaveConditions}
						>
							{updateMutation.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
							Сохранить
						</Button>
					</div>
				</div>
			) : (
				<div className="relative rounded-lg border border-border p-4">
					<button
						type="button"
						className="absolute top-2 right-2 inline-flex items-center justify-center size-6 rounded text-muted-foreground/60 hover:text-foreground transition-colors"
						onClick={handleEditConditions}
						aria-label="Редактировать условия"
					>
						<Pencil className="size-3" aria-hidden="true" />
					</button>
					<h3 className="text-sm font-medium mb-3">Условия</h3>
					<div className="grid grid-cols-2 gap-x-4 gap-y-3">
						<ViewField label="Условия оплаты" value={PAYMENT_TYPE_LABELS[item.paymentType ?? "prepayment"]} />
						<ViewField label="Доставка" value={DELIVERY_TYPE_LABELS[item.deliveryType ?? "warehouse"]} />
					</div>
				</div>
			)}

			<div className="rounded-lg border border-border p-4">
				<h3 className="text-sm font-medium mb-3">Системные данные</h3>
				<div className="grid grid-cols-2 gap-x-4 gap-y-3">
					<ViewField label="Статус" value={STATUS_LABELS[item.status]} />
					<div />
					<ViewField label="Лучшая цена" value={formatCurrency(item.bestPrice)} />
					<ViewField label="Средняя цена" value={formatCurrency(item.averagePrice)} />
				</div>
			</div>
		</div>
	);
}
