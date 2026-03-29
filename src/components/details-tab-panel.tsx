import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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

interface FormState {
	name: string;
	annualQuantity: number;
	currentPrice: number;
	unit: Unit | "";
	frequencyCount: number;
	paymentType: PaymentType;
	deliveryType: DeliveryType;
	folderId: string | null;
}

function initFormState(item: ProcurementItem): FormState {
	return {
		name: item.name,
		annualQuantity: item.annualQuantity,
		currentPrice: item.currentPrice,
		unit: item.unit ?? "",
		frequencyCount: item.frequencyCount ?? 1,
		paymentType: item.paymentType ?? "prepayment",
		deliveryType: item.deliveryType ?? "warehouse",
		folderId: item.folderId,
	};
}

function FieldRow({ label, children, htmlFor }: { label: string; children: React.ReactNode; htmlFor?: string }) {
	return (
		<div className="flex flex-col gap-1.5">
			<label htmlFor={htmlFor} className="text-sm font-medium">
				{label}
			</label>
			{children}
		</div>
	);
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
	return (
		<FieldRow label={label} htmlFor={`field-${label}`}>
			<Input
				id={`field-${label}`}
				value={value}
				readOnly
				aria-label={label}
				className="bg-muted text-muted-foreground"
			/>
		</FieldRow>
	);
}

export function DetailsTabPanel({ itemId }: DetailsTabPanelProps) {
	const { data: item, isLoading } = useItemDetail(itemId);
	const updateMutation = useUpdateItemDetail();
	const [form, setForm] = useState<FormState | null>(null);

	const formState = form ?? (item ? initFormState(item) : null);

	if (isLoading || !item || !formState) {
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

	// Non-null alias — TS doesn't preserve narrowing into closures
	const currentItem = item;

	function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
		setForm((prev) => ({ ...(prev ?? initFormState(currentItem)), [field]: value }));
	}

	function handleSave() {
		if (!formState) return;
		const data: Record<string, unknown> = { id: itemId };

		if (formState.name !== currentItem.name) data.name = formState.name;
		if (formState.annualQuantity !== currentItem.annualQuantity) data.annualQuantity = formState.annualQuantity;
		if (formState.currentPrice !== currentItem.currentPrice) data.currentPrice = formState.currentPrice;
		if (formState.unit !== (currentItem.unit ?? "")) data.unit = formState.unit || undefined;
		if (formState.frequencyCount !== (currentItem.frequencyCount ?? 1)) data.frequencyCount = formState.frequencyCount;
		if (formState.paymentType !== (currentItem.paymentType ?? "prepayment")) data.paymentType = formState.paymentType;
		if (formState.deliveryType !== (currentItem.deliveryType ?? "warehouse"))
			data.deliveryType = formState.deliveryType;
		if (formState.folderId !== currentItem.folderId) data.folderId = formState.folderId;

		updateMutation.mutate(data as Parameters<typeof updateMutation.mutate>[0]);
	}

	return (
		<div data-testid="tab-panel-details" className="flex flex-col gap-5">
			<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Основная информация</h3>

			<FieldRow label="Название" htmlFor="detail-name">
				<Input
					id="detail-name"
					aria-label="Название"
					value={formState.name}
					onChange={(e) => updateField("name", e.target.value)}
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
						value={formState.annualQuantity}
						onChange={(e) => updateField("annualQuantity", Number(e.target.value))}
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
						value={formState.currentPrice}
						onChange={(e) => updateField("currentPrice", Number(e.target.value))}
						autoComplete="off"
					/>
				</FieldRow>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<FieldRow label="Единица измерения">
					<Select value={formState.unit || undefined} onValueChange={(v) => updateField("unit", v as Unit)}>
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
						value={formState.frequencyCount}
						onChange={(e) => updateField("frequencyCount", Number(e.target.value))}
						autoComplete="off"
					/>
				</FieldRow>
			</div>

			<h3 className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Условия</h3>

			<FieldRow label="Условия оплаты">
				<SegmentedControl
					options={PAYMENT_TYPES}
					labels={PAYMENT_TYPE_LABELS}
					value={formState.paymentType}
					onChange={(v) => updateField("paymentType", v)}
				/>
			</FieldRow>

			<FieldRow label="Доставка">
				<SegmentedControl
					options={DELIVERY_TYPES}
					labels={DELIVERY_TYPE_LABELS}
					value={formState.deliveryType}
					onChange={(v) => updateField("deliveryType", v)}
				/>
			</FieldRow>

			<h3 className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Системные данные</h3>

			<ReadOnlyField label="Статус" value={STATUS_LABELS[currentItem.status]} />

			<div className="grid grid-cols-2 gap-4">
				<ReadOnlyField label="Лучшая цена" value={formatCurrency(currentItem.bestPrice)} />
				<ReadOnlyField label="Средняя цена" value={formatCurrency(currentItem.averagePrice)} />
			</div>

			<div className="pt-2">
				<Button type="button" onClick={handleSave} disabled={updateMutation.isPending}>
					{updateMutation.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
					Сохранить
				</Button>
			</div>
		</div>
	);
}
