import { Plus, Trash2, X } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
	DeliveryType,
	FrequencyPeriod,
	NewItemInput,
	PaymentMethod,
	PaymentType,
	PriceMonitoringPeriod,
	UnloadingType,
} from "@/data/types";
import {
	DELIVERY_TYPE_LABELS,
	DELIVERY_TYPES,
	FREQUENCY_PERIOD_LABELS,
	FREQUENCY_PERIODS,
	PAYMENT_METHOD_LABELS,
	PAYMENT_METHODS,
	PAYMENT_TYPE_LABELS,
	PAYMENT_TYPES,
	PRICE_MONITORING_PERIOD_LABELS,
	PRICE_MONITORING_PERIODS,
	UNITS,
	UNLOADING_LABELS,
	UNLOADING_TYPES,
} from "@/data/types";
import { formatFileSize } from "@/lib/format";

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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_TOTAL_SIZE = 25 * 1024 * 1024; // 25 MB

interface DeliveryState {
	paymentEnabled: boolean;
	paymentType: PaymentType;
	paymentDeferralDays: string;
	paymentMethod: PaymentMethod;
	deliveryEnabled: boolean;
	deliveryType: DeliveryType;
	deliveryAddress: string;
	unloadingEnabled: boolean;
	unloading: UnloadingType;
	analoguesEnabled: boolean;
	analoguesAllowed: boolean;
	additionalInfoEnabled: boolean;
	additionalInfo: string;
	filesEnabled: boolean;
	monitoringEnabled: boolean;
	monitoringPeriod: PriceMonitoringPeriod;
}

function createDefaultDelivery(): DeliveryState {
	return {
		paymentEnabled: false,
		paymentType: "prepayment",
		paymentDeferralDays: "",
		paymentMethod: "bank_transfer",
		deliveryEnabled: false,
		deliveryType: "warehouse",
		deliveryAddress: "",
		unloadingEnabled: false,
		unloading: "supplier",
		analoguesEnabled: false,
		analoguesAllowed: true,
		additionalInfoEnabled: false,
		additionalInfo: "",
		filesEnabled: false,
		monitoringEnabled: false,
		monitoringPeriod: "quarter",
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
	const [frequencyEnabled, setFrequencyEnabled] = useState(false);
	const [frequencyCount, setFrequencyCount] = useState("1");
	const [frequencyPeriod, setFrequencyPeriod] = useState<FrequencyPeriod>("month");
	const [hideCompanyInfo, setHideCompanyInfo] = useState(false);
	const [delivery, setDelivery] = useState<DeliveryState>(createDefaultDelivery);
	const [files, setFiles] = useState<File[]>([]);
	const [showConfirm, setShowConfirm] = useState(false);
	const pendingFocusKey = useRef<string | null>(null);
	const nameRefs = useRef<Map<string, HTMLInputElement>>(new Map());
	const fileInputRef = useRef<HTMLInputElement>(null);

	const isDirty =
		positions.some((p) => p.name || p.description || p.quantity || p.unit || p.price) ||
		frequencyEnabled ||
		hideCompanyInfo ||
		delivery.paymentEnabled ||
		delivery.deliveryEnabled ||
		delivery.unloadingEnabled ||
		delivery.analoguesEnabled ||
		delivery.additionalInfoEnabled ||
		delivery.filesEnabled ||
		delivery.monitoringEnabled;

	function resetForm() {
		setPositions([createEmptyRow()]);
		setFrequencyEnabled(false);
		setFrequencyCount("1");
		setFrequencyPeriod("month");
		setHideCompanyInfo(false);
		setDelivery(createDefaultDelivery());
		setFiles([]);
	}

	function updateDelivery<K extends keyof DeliveryState>(field: K, value: DeliveryState[K]) {
		setDelivery((prev) => ({ ...prev, [field]: value }));
	}

	function buildSharedFields(): Partial<NewItemInput> {
		const fields: Partial<NewItemInput> = {};

		if (frequencyEnabled) {
			const count = Number(frequencyCount);
			if (count >= 1) {
				fields.frequencyCount = count;
				fields.frequencyPeriod = frequencyPeriod;
			}
		}

		if (hideCompanyInfo) {
			fields.hideCompanyInfo = true;
		}

		if (delivery.paymentEnabled) {
			fields.paymentType = delivery.paymentType;
			if (delivery.paymentType === "deferred" && delivery.paymentDeferralDays) {
				fields.paymentDeferralDays = Number(delivery.paymentDeferralDays);
			}
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

		if (delivery.additionalInfoEnabled && delivery.additionalInfo.trim()) {
			fields.additionalInfo = delivery.additionalInfo.trim();
		}

		if (delivery.monitoringEnabled) {
			fields.priceMonitoringPeriod = delivery.monitoringPeriod;
		}

		return fields;
	}

	/** Validate all position names; returns true if valid, focuses first error otherwise. */
	function validatePositions(): boolean {
		let firstErrorKey: string | null = null;
		const validated = positions.map((p) => {
			if (!p.name.trim()) {
				if (!firstErrorKey) firstErrorKey = p.key;
				return { ...p, error: "Укажите название позиции" };
			}
			return p.error ? { ...p, error: undefined } : p;
		});

		if (firstErrorKey) {
			setPositions(validated);
			nameRefs.current.get(firstErrorKey)?.focus();
			return false;
		}
		return true;
	}

	function handleSubmit() {
		if (!validatePositions()) return;

		const deliveryFields = buildSharedFields();

		const items: NewItemInput[] = positions.map((p) => ({
			name: p.name.trim(),
			description: p.description.trim() || undefined,
			unit: (p.unit || undefined) as NewItemInput["unit"],
			annualQuantity: p.quantity ? Number(p.quantity) : undefined,
			currentPrice: p.price ? Number(p.price) : undefined,
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
		resetForm();
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
		if (!validatePositions()) return;
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

	function handleFilesAdd(newFiles: FileList | null) {
		if (!newFiles) return;
		const currentTotal = files.reduce((sum, f) => sum + f.size, 0);
		const toAdd: File[] = [];
		let runningTotal = currentTotal;

		for (const file of newFiles) {
			if (file.size > MAX_FILE_SIZE) continue;
			if (runningTotal + file.size > MAX_TOTAL_SIZE) break;
			toAdd.push(file);
			runningTotal += file.size;
		}

		if (toAdd.length > 0) {
			setFiles((prev) => [...prev, ...toAdd]);
		}
	}

	function handleFileRemove(index: number) {
		setFiles((prev) => prev.filter((_, i) => i !== index));
	}

	return (
		<>
			<Sheet open={open} onOpenChange={handleOpenChange}>
				<SheetContent className="flex flex-col">
					<SheetHeader>
						<SheetTitle>Добавить позиции</SheetTitle>
						<SheetDescription className="sr-only">Создание новых позиций закупок</SheetDescription>
					</SheetHeader>

					<div className="flex-1 overflow-y-auto px-4">
						<div className="flex flex-col gap-3">
							{positions.map((pos, i) => (
								<div key={pos.key} data-testid={`position-row-${i}`} className="rounded-lg border border-border p-3">
									<div className="mb-2 flex items-center justify-between">
										<span className="text-sm font-medium text-muted-foreground">Позиция {i + 1}</span>
										<Button
											type="button"
											variant="ghost"
											size="icon-xs"
											onClick={() => handleDeleteRow(pos.key)}
											aria-label="Удалить позицию"
										>
											<Trash2 aria-hidden="true" />
										</Button>
									</div>
									<div className="flex flex-col gap-2">
										<div>
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
												className={pos.error ? "border-destructive" : undefined}
											/>
											{pos.error && (
												<p id={`error-${pos.key}`} className="mt-1 text-sm text-destructive">
													{pos.error}
												</p>
											)}
										</div>
										<Input
											placeholder="Описание"
											value={pos.description}
											onChange={(e) => updatePosition(pos.key, "description", e.target.value)}
											spellCheck={false}
											autoComplete="off"
										/>
										<div className="flex gap-2">
											<Input
												type="number"
												inputMode="numeric"
												min={0}
												placeholder="Количество"
												value={pos.quantity}
												onChange={(e) => updatePosition(pos.key, "quantity", e.target.value)}
												autoComplete="off"
												className="flex-1"
											/>
											<select
												value={pos.unit}
												onChange={(e) => updatePosition(pos.key, "unit", e.target.value)}
												className="h-8 w-24 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
												aria-label="Единица измерения"
											>
												<option value="">Ед. изм.</option>
												{UNITS.map((u) => (
													<option key={u} value={u}>
														{u}
													</option>
												))}
											</select>
											<Input
												type="number"
												inputMode="numeric"
												min={0}
												placeholder="Моя цена (без НДС)"
												value={pos.price}
												onChange={(e) => updatePosition(pos.key, "price", e.target.value)}
												autoComplete="off"
												className="flex-1"
											/>
										</div>
									</div>
								</div>
							))}
						</div>

						<div className="mt-3">
							<Button type="button" variant="outline" size="sm" onClick={handleAddRow}>
								<Plus aria-hidden="true" />
								Добавить позицию
							</Button>
						</div>

						<p className="mt-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
							Указанные условия будут применены ко всем позициям
						</p>
						<div className="mt-3">
							<DeliverySection label="Частота закупок" enabled={frequencyEnabled} onToggle={setFrequencyEnabled}>
								<Input
									type="number"
									inputMode="numeric"
									min={1}
									placeholder="1"
									value={frequencyCount}
									onChange={(e) => setFrequencyCount(e.target.value)}
									aria-label="Количество"
									className="w-20"
									autoComplete="off"
								/>
								<span className="text-sm text-muted-foreground">раз(а) в</span>
								<Select value={frequencyPeriod} onValueChange={(v) => setFrequencyPeriod(v as FrequencyPeriod)}>
									<SelectTrigger aria-label="Период">
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
								{delivery.paymentType === "deferred" && (
									<div className="flex items-center gap-2">
										<Input
											type="number"
											inputMode="numeric"
											min={0}
											placeholder="0"
											value={delivery.paymentDeferralDays}
											onChange={(e) => updateDelivery("paymentDeferralDays", e.target.value)}
											aria-label="Дней отсрочки"
											className="w-20"
											autoComplete="off"
										/>
										<span className="text-sm text-muted-foreground">дн.</span>
									</div>
								)}
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

							<DeliverySection
								label="Дополнительная информация"
								enabled={delivery.additionalInfoEnabled}
								onToggle={(v) => updateDelivery("additionalInfoEnabled", v)}
							>
								<Textarea
									placeholder="Введите дополнительную информацию…"
									value={delivery.additionalInfo}
									onChange={(e) => updateDelivery("additionalInfo", e.target.value)}
									className="w-full"
									rows={3}
								/>
							</DeliverySection>

							<DeliverySection
								label="Дополнительные файлы"
								enabled={delivery.filesEnabled}
								onToggle={(v) => updateDelivery("filesEnabled", v)}
							>
								<div className="flex w-full flex-col gap-2">
									<button
										type="button"
										className="flex w-full cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed border-input p-4 text-center transition-colors hover:border-primary"
										onClick={() => fileInputRef.current?.click()}
										onDragOver={(e) => {
											e.preventDefault();
											e.stopPropagation();
										}}
										onDrop={(e) => {
											e.preventDefault();
											e.stopPropagation();
											handleFilesAdd(e.dataTransfer.files);
										}}
									>
										<p className="text-sm text-muted-foreground">Перетащите файлы сюда или нажмите для выбора</p>
										<p className="text-xs text-muted-foreground">Макс. 10&nbsp;МБ на файл, 25&nbsp;МБ суммарно</p>
									</button>
									<input
										ref={fileInputRef}
										type="file"
										multiple
										className="hidden"
										onChange={(e) => {
											handleFilesAdd(e.target.files);
											e.target.value = "";
										}}
									/>
									{files.length > 0 && (
										<ul className="flex flex-col gap-1">
											{files.map((file, i) => (
												<li key={`${file.name}-${file.size}`} className="flex items-center gap-2 text-sm">
													<span className="min-w-0 flex-1 truncate">{file.name}</span>
													<span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
													<Button
														type="button"
														variant="ghost"
														size="icon-xs"
														onClick={() => handleFileRemove(i)}
														aria-label={`Удалить ${file.name}`}
													>
														<X aria-hidden="true" />
													</Button>
												</li>
											))}
										</ul>
									)}
								</div>
							</DeliverySection>

							<DeliverySection
								label="Периодичность мониторинга цен"
								enabled={delivery.monitoringEnabled}
								onToggle={(v) => updateDelivery("monitoringEnabled", v)}
							>
								<Select
									value={delivery.monitoringPeriod}
									onValueChange={(v) => updateDelivery("monitoringPeriod", v as PriceMonitoringPeriod)}
								>
									<SelectTrigger aria-label="Период мониторинга">
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
							</DeliverySection>

							<div className="border-t border-border py-3">
								{/* biome-ignore lint/a11y/noLabelWithoutControl: Radix Checkbox renders a button internally */}
								<label className="flex items-center gap-2">
									<Checkbox checked={hideCompanyInfo} onCheckedChange={(v) => setHideCompanyInfo(v === true)} />
									<span className="text-sm font-medium">Скрыть информацию о компании в запросе</span>
								</label>
							</div>
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
			</Sheet>

			<AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Закрыть без сохранения?</AlertDialogTitle>
						<AlertDialogDescription>Внесённые данные будут потеряны.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Продолжить</AlertDialogCancel>
						<AlertDialogAction variant="destructive" onClick={handleConfirmDiscard}>
							Закрыть без сохранения
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
