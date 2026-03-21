import { Plus, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
	DeliveryType,
	Frequency,
	LegalEntityMode,
	PaymentMethod,
	PaymentType,
	ProcurementType,
	UnloadingType,
} from "@/data/types";
import {
	DELIVERY_TYPE_LABELS,
	DELIVERY_TYPES,
	FREQUENCIES,
	FREQUENCY_LABELS,
	LEGAL_ENTITY_LABELS,
	LEGAL_ENTITY_MODES,
	PAYMENT_METHOD_LABELS,
	PAYMENT_METHODS,
	PAYMENT_TYPE_LABELS,
	PAYMENT_TYPES,
	PROCUREMENT_TYPE_LABELS,
	PROCUREMENT_TYPES,
	UNITS,
	UNLOADING_LABELS,
	UNLOADING_TYPES,
} from "@/data/types";
import type { NewItemInput } from "@/data/use-custom-items";

interface PositionRow {
	key: string;
	name: string;
	description: string;
	quantity: string;
	unit: string;
	price: string;
	error?: string;
}

function createEmptyRow(): PositionRow {
	return {
		key: crypto.randomUUID(),
		name: "",
		description: "",
		quantity: "",
		unit: "",
		price: "",
	};
}

interface AddPositionsDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (items: NewItemInput[]) => void;
}

const MOCK_COMPANIES = ["ООО «Сделка»"];

interface DeliveryState {
	legalEntityEnabled: boolean;
	legalEntityMode: LegalEntityMode;
	legalEntityCompany: string;
	paymentEnabled: boolean;
	paymentType: PaymentType;
	paymentDeferralDays: string;
	vatIncluded: boolean;
	paymentMethod: PaymentMethod;
	deliveryEnabled: boolean;
	deliveryType: DeliveryType;
	deliveryAddress: string;
	unloadingEnabled: boolean;
	unloading: UnloadingType;
	analoguesEnabled: boolean;
	analoguesAllowed: boolean;
}

function createDefaultDelivery(): DeliveryState {
	return {
		legalEntityEnabled: false,
		legalEntityMode: "incognito",
		legalEntityCompany: "",
		paymentEnabled: false,
		paymentType: "prepayment",
		paymentDeferralDays: "",
		vatIncluded: true,
		paymentMethod: "bank_transfer",
		deliveryEnabled: false,
		deliveryType: "warehouse",
		deliveryAddress: "",
		unloadingEnabled: false,
		unloading: "supplier",
		analoguesEnabled: false,
		analoguesAllowed: true,
	};
}

function SegmentedControl<T extends string>({
	options,
	labels,
	value,
	onChange,
}: {
	options: readonly T[];
	labels: Record<T, string>;
	value: T;
	onChange: (v: T) => void;
}) {
	return (
		<div className="flex rounded-lg border border-input">
			{options.map((opt) => (
				<button
					key={opt}
					type="button"
					aria-pressed={value === opt}
					className={`px-3 py-1.5 text-sm font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
						value === opt
							? "bg-primary text-primary-foreground"
							: "bg-background text-muted-foreground hover:text-foreground"
					}`}
					onClick={() => onChange(opt)}
				>
					{labels[opt]}
				</button>
			))}
		</div>
	);
}

function DeliverySection({
	label,
	enabled,
	onToggle,
	children,
}: {
	label: string;
	enabled: boolean;
	onToggle: (v: boolean) => void;
	children: React.ReactNode;
}) {
	return (
		<div className="border-t border-border py-3">
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium">{label}</span>
				<Switch checked={enabled} onCheckedChange={onToggle} />
			</div>
			{enabled && <div className="mt-3 flex flex-wrap items-center gap-3">{children}</div>}
		</div>
	);
}

export function AddPositionsDrawer({ open, onOpenChange, onSubmit }: AddPositionsDrawerProps) {
	const [positions, setPositions] = useState<PositionRow[]>(() => [createEmptyRow()]);
	const [procurementType, setProcurementType] = useState<ProcurementType>("one-time");
	const [frequency, setFrequency] = useState<Frequency | "">("");
	const [delivery, setDelivery] = useState<DeliveryState>(createDefaultDelivery);
	const [showConfirm, setShowConfirm] = useState(false);
	const pendingFocusKey = useRef<string | null>(null);
	const nameRefs = useRef<Map<string, HTMLInputElement>>(new Map());

	const isDirty =
		positions.some((p) => p.name || p.description || p.quantity || p.unit || p.price) ||
		procurementType !== "one-time" ||
		delivery.legalEntityEnabled ||
		delivery.paymentEnabled ||
		delivery.deliveryEnabled ||
		delivery.unloadingEnabled ||
		delivery.analoguesEnabled;

	function resetForm() {
		setPositions([createEmptyRow()]);
		setProcurementType("one-time");
		setFrequency("");
		setDelivery(createDefaultDelivery());
	}

	function updateDelivery<K extends keyof DeliveryState>(field: K, value: DeliveryState[K]) {
		setDelivery((prev) => ({ ...prev, [field]: value }));
	}

	function buildDeliveryFields(): Partial<NewItemInput> {
		const fields: Partial<NewItemInput> = {};

		if (delivery.legalEntityEnabled) {
			fields.legalEntityMode = delivery.legalEntityMode;
			if (delivery.legalEntityMode === "company" && delivery.legalEntityCompany) {
				fields.legalEntityCompany = delivery.legalEntityCompany;
			}
		}

		if (delivery.paymentEnabled) {
			fields.paymentType = delivery.paymentType;
			if (delivery.paymentType === "deferred" && delivery.paymentDeferralDays) {
				fields.paymentDeferralDays = Number(delivery.paymentDeferralDays);
			}
			fields.vatIncluded = delivery.vatIncluded;
			fields.paymentMethod = delivery.paymentMethod;
		}

		if (delivery.deliveryEnabled) {
			fields.deliveryType = delivery.deliveryType;
			if (delivery.deliveryType === "warehouse" && delivery.deliveryAddress.trim()) {
				fields.deliveryAddress = delivery.deliveryAddress.trim();
			}
		}

		if (delivery.unloadingEnabled) {
			fields.unloading = delivery.unloading;
		}

		if (delivery.analoguesEnabled) {
			fields.analoguesAllowed = delivery.analoguesAllowed;
		}

		return fields;
	}

	function handleSubmit() {
		let hasError = false;
		let firstErrorKey: string | null = null;
		const validated = positions.map((p) => {
			if (!p.name.trim()) {
				hasError = true;
				if (!firstErrorKey) firstErrorKey = p.key;
				return { ...p, error: "Укажите название позиции" };
			}
			return { ...p, error: undefined };
		});

		if (hasError) {
			setPositions(validated);
			if (firstErrorKey) {
				nameRefs.current.get(firstErrorKey)?.focus();
			}
			return;
		}

		const deliveryFields = buildDeliveryFields();

		const items: NewItemInput[] = positions.map((p) => ({
			name: p.name.trim(),
			description: p.description.trim() || undefined,
			unit: (p.unit || undefined) as NewItemInput["unit"],
			annualQuantity: p.quantity ? Number(p.quantity) : undefined,
			currentPrice: p.price ? Number(p.price) : undefined,
			procurementType,
			frequency: procurementType === "regular" && frequency ? (frequency as Frequency) : undefined,
			...deliveryFields,
		}));

		onSubmit(items);
		resetForm();
		onOpenChange(false);
	}

	function handleCancel() {
		if (isDirty) {
			setShowConfirm(true);
			return;
		}
		onOpenChange(false);
	}

	function handleConfirmDiscard() {
		setShowConfirm(false);
		resetForm();
		onOpenChange(false);
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) {
			if (isDirty) {
				setShowConfirm(true);
				return;
			}
			resetForm();
		}
		onOpenChange(nextOpen);
	}

	function updatePosition(key: string, field: keyof PositionRow, value: string) {
		setPositions((prev) =>
			prev.map((p) => {
				if (p.key !== key) return p;
				const updated = { ...p, [field]: value };
				if (field === "name" && p.error) {
					updated.error = undefined;
				}
				return updated;
			}),
		);
	}

	function handleAddRow() {
		const row = createEmptyRow();
		pendingFocusKey.current = row.key;
		setPositions((prev) => [...prev, row]);
	}

	function handleDeleteRow(key: string) {
		setPositions((prev) => {
			if (prev.length === 1) {
				return [createEmptyRow()];
			}
			return prev.filter((p) => p.key !== key);
		});
	}

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
			<SheetContent className="flex flex-col">
				<SheetHeader>
					<SheetTitle>Добавить позиции</SheetTitle>
					<SheetDescription className="sr-only">Создание новых позиций закупок</SheetDescription>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto px-4">
					<div className="mb-4 flex flex-wrap items-center gap-3">
						<SegmentedControl
							options={PROCUREMENT_TYPES}
							labels={PROCUREMENT_TYPE_LABELS}
							value={procurementType}
							onChange={setProcurementType}
						/>
						{procurementType === "regular" && (
							<select
								value={frequency}
								onChange={(e) => setFrequency(e.target.value as Frequency | "")}
								className="h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
								aria-label="Периодичность"
							>
								<option value="">Периодичность…</option>
								{FREQUENCIES.map((f) => (
									<option key={f} value={f}>
										{FREQUENCY_LABELS[f]}
									</option>
								))}
							</select>
						)}
					</div>

					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-8">№</TableHead>
									<TableHead className="min-w-40">Наименование</TableHead>
									<TableHead className="min-w-32">Описание</TableHead>
									<TableHead className="w-24">Количество</TableHead>
									<TableHead className="w-24">Ед. изм.</TableHead>
									<TableHead className="w-28">Моя цена</TableHead>
									<TableHead className="w-10" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{positions.map((pos, i) => (
									<TableRow key={pos.key} data-testid={`position-row-${i}`}>
										<TableCell className="text-muted-foreground">{i + 1}</TableCell>
										<TableCell>
											<div className="flex flex-col gap-1">
												<Input
													ref={(el) => {
														if (el) {
															nameRefs.current.set(pos.key, el);
															if (pos.key === pendingFocusKey.current) {
																el.focus();
																pendingFocusKey.current = null;
															}
														} else {
															nameRefs.current.delete(pos.key);
														}
													}}
													placeholder="Название позиции"
													value={pos.name}
													onChange={(e) => updatePosition(pos.key, "name", e.target.value)}
													autoFocus={i === 0}
													spellCheck={false}
													autoComplete="off"
													aria-invalid={pos.error ? true : undefined}
													aria-describedby={pos.error ? `error-${pos.key}` : undefined}
												/>
												{pos.error && (
													<p id={`error-${pos.key}`} className="text-sm text-destructive">
														{pos.error}
													</p>
												)}
											</div>
										</TableCell>
										<TableCell>
											<Input
												placeholder="Описание"
												value={pos.description}
												onChange={(e) => updatePosition(pos.key, "description", e.target.value)}
												spellCheck={false}
												autoComplete="off"
											/>
										</TableCell>
										<TableCell>
											<Input
												type="number"
												inputMode="numeric"
												min={0}
												placeholder="0"
												value={pos.quantity}
												onChange={(e) => updatePosition(pos.key, "quantity", e.target.value)}
												autoComplete="off"
											/>
										</TableCell>
										<TableCell>
											<select
												value={pos.unit}
												onChange={(e) => updatePosition(pos.key, "unit", e.target.value)}
												className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
												aria-label="Единица измерения"
											>
												<option value="">—</option>
												{UNITS.map((u) => (
													<option key={u} value={u}>
														{u}
													</option>
												))}
											</select>
										</TableCell>
										<TableCell>
											<Input
												type="number"
												inputMode="numeric"
												min={0}
												placeholder="0"
												value={pos.price}
												onChange={(e) => updatePosition(pos.key, "price", e.target.value)}
												autoComplete="off"
											/>
										</TableCell>
										<TableCell>
											<Button
												type="button"
												variant="ghost"
												size="icon-xs"
												onClick={() => handleDeleteRow(pos.key)}
												aria-label="Удалить позицию"
											>
												<Trash2 aria-hidden="true" />
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					<div className="mt-3 flex gap-2">
						<Button type="button" variant="outline" size="sm" onClick={handleAddRow}>
							<Plus aria-hidden="true" />
							Добавить позицию
						</Button>
						<Button type="button" variant="outline" size="sm" disabled>
							<Upload aria-hidden="true" />
							Загрузить из файла
						</Button>
					</div>

					{/* Delivery conditions */}
					<div className="mt-4">
						<DeliverySection
							label="Юридическое лицо"
							enabled={delivery.legalEntityEnabled}
							onToggle={(v) => updateDelivery("legalEntityEnabled", v)}
						>
							<SegmentedControl
								options={LEGAL_ENTITY_MODES}
								labels={LEGAL_ENTITY_LABELS}
								value={delivery.legalEntityMode}
								onChange={(v) => updateDelivery("legalEntityMode", v)}
							/>
							{delivery.legalEntityMode === "company" && (
								<select
									value={delivery.legalEntityCompany}
									onChange={(e) => updateDelivery("legalEntityCompany", e.target.value)}
									className="h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
									aria-label="Компания"
								>
									<option value="">Выберите компанию…</option>
									{MOCK_COMPANIES.map((c) => (
										<option key={c} value={c}>
											{c}
										</option>
									))}
								</select>
							)}
						</DeliverySection>

						<DeliverySection
							label="Условия оплаты"
							enabled={delivery.paymentEnabled}
							onToggle={(v) => updateDelivery("paymentEnabled", v)}
						>
							<SegmentedControl
								options={PAYMENT_TYPES}
								labels={PAYMENT_TYPE_LABELS}
								value={delivery.paymentType}
								onChange={(v) => updateDelivery("paymentType", v)}
							/>
							<div className="flex items-center gap-2">
								<Input
									type="number"
									inputMode="numeric"
									min={0}
									placeholder="0"
									value={delivery.paymentDeferralDays}
									onChange={(e) => updateDelivery("paymentDeferralDays", e.target.value)}
									disabled={delivery.paymentType !== "deferred"}
									aria-label="Дней отсрочки"
									className="w-20"
									autoComplete="off"
								/>
								<span className="text-sm text-muted-foreground">дн.</span>
							</div>
							<SegmentedControl
								options={["vat-yes", "vat-no"] as const}
								labels={{ "vat-yes": "С НДС", "vat-no": "Без НДС" }}
								value={delivery.vatIncluded ? "vat-yes" : "vat-no"}
								onChange={(v) => updateDelivery("vatIncluded", v === "vat-yes")}
							/>
							<SegmentedControl
								options={PAYMENT_METHODS}
								labels={PAYMENT_METHOD_LABELS}
								value={delivery.paymentMethod}
								onChange={(v) => updateDelivery("paymentMethod", v)}
							/>
						</DeliverySection>

						<DeliverySection
							label="Доставка"
							enabled={delivery.deliveryEnabled}
							onToggle={(v) => updateDelivery("deliveryEnabled", v)}
						>
							<SegmentedControl
								options={DELIVERY_TYPES}
								labels={DELIVERY_TYPE_LABELS}
								value={delivery.deliveryType}
								onChange={(v) => updateDelivery("deliveryType", v)}
							/>
							{delivery.deliveryType === "warehouse" && (
								<Input
									placeholder="Адрес доставки"
									value={delivery.deliveryAddress}
									onChange={(e) => updateDelivery("deliveryAddress", e.target.value)}
									spellCheck={false}
									autoComplete="off"
									className="min-w-48"
								/>
							)}
						</DeliverySection>

						<DeliverySection
							label="Разгрузка"
							enabled={delivery.unloadingEnabled}
							onToggle={(v) => updateDelivery("unloadingEnabled", v)}
						>
							<SegmentedControl
								options={UNLOADING_TYPES}
								labels={UNLOADING_LABELS}
								value={delivery.unloading}
								onChange={(v) => updateDelivery("unloading", v)}
							/>
						</DeliverySection>

						<DeliverySection
							label="Аналоги"
							enabled={delivery.analoguesEnabled}
							onToggle={(v) => updateDelivery("analoguesEnabled", v)}
						>
							<SegmentedControl
								options={["allowed", "not-allowed"] as const}
								labels={{ allowed: "Допускаются", "not-allowed": "Не допускаются" }}
								value={delivery.analoguesAllowed ? "allowed" : "not-allowed"}
								onChange={(v) => updateDelivery("analoguesAllowed", v === "allowed")}
							/>
						</DeliverySection>
					</div>
				</div>

				<SheetFooter className="sticky bottom-0 flex-row justify-between border-t border-border bg-background">
					<Button type="button" variant="ghost" onClick={handleCancel}>
						Отмена
					</Button>
					<Button type="button" onClick={handleSubmit}>
						Создать позиции
					</Button>
				</SheetFooter>
			</SheetContent>

			<AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Закрыть без сохранения?</AlertDialogTitle>
						<AlertDialogDescription>Внесённые данные будут потеряны.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Продолжить редактирование</AlertDialogCancel>
						<AlertDialogAction variant="destructive" onClick={handleConfirmDiscard}>
							Закрыть без сохранения
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Sheet>
	);
}
