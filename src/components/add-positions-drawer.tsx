import { ChevronDown, ChevronRight, CircleHelp, Plus, Trash2, X } from "lucide-react";
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
import { OptionalSegmentedControl, SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type {
	CurrentSupplier,
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
} from "@/data/types";
import { useProcurementCompanies } from "@/data/use-companies";
import { formatCurrency, formatFileSize, formatGroupedInteger } from "@/lib/format";

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
	paymentType: PaymentType;
	paymentDeferralDays: string;
	paymentMethod: PaymentMethod;
	deliveryType: DeliveryType;
	unloading: UnloadingType | null;
	analoguesAllowed: boolean | null;
	additionalInfo: string;
	monitoringPeriod: PriceMonitoringPeriod;
}

function createDefaultDelivery(): DeliveryState {
	return {
		paymentType: "prepayment",
		paymentDeferralDays: "",
		paymentMethod: "bank_transfer",
		deliveryType: "warehouse",
		unloading: null,
		analoguesAllowed: null,
		additionalInfo: "",
		monitoringPeriod: "quarter",
	};
}

function HintTooltip({ text }: { text: string }) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Подсказка">
					<CircleHelp className="size-3.5" aria-hidden="true" />
				</button>
			</TooltipTrigger>
			<TooltipContent>{text}</TooltipContent>
		</Tooltip>
	);
}

function SectionLabel({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
	return (
		<div className="border-t border-border py-3">
			<div className="flex items-center gap-1.5">
				<span className="text-sm font-medium">{label}</span>
				{hint && <HintTooltip text={hint} />}
			</div>
			<div className="mt-3 flex flex-wrap items-center gap-3">{children}</div>
		</div>
	);
}

function SectionGroupHeader({ title }: { title: string }) {
	return <h3 className="mt-5 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>;
}

export function AddPositionsDrawer({ open, onOpenChange, onSubmit }: AddPositionsDrawerProps) {
	const [positions, setPositions] = useState<PositionRow[]>(() => [createEmptyRow()]);
	const [frequencyCount, setFrequencyCount] = useState("1");
	const [frequencyPeriod, setFrequencyPeriod] = useState<FrequencyPeriod>("month");
	const [hideCompanyInfo, setHideCompanyInfo] = useState(false);
	const [delivery, setDelivery] = useState<DeliveryState>(createDefaultDelivery);
	const [files, setFiles] = useState<File[]>([]);
	const [showConfirm, setShowConfirm] = useState(false);
	const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
	const [selectedAddressIds, setSelectedAddressIds] = useState<string[]>([]);
	const [companyError, setCompanyError] = useState<string>("");
	const [csExpanded, setCsExpanded] = useState(false);
	const [csCompanyName, setCsCompanyName] = useState("");
	const [csDeliveryCost, setCsDeliveryCost] = useState("");
	const [csDeferralDays, setCsDeferralDays] = useState("");
	const [csPricePerUnit, setCsPricePerUnit] = useState("");
	const [csTco, setCsTco] = useState("");
	const pendingFocusKey = useRef<string | null>(null);
	const nameRefs = useRef<Map<string, HTMLInputElement>>(new Map());
	const fileInputRef = useRef<HTMLInputElement>(null);

	const { data: companies } = useProcurementCompanies();
	const selectedCompany = selectedCompanyId ? companies.find((c) => c.id === selectedCompanyId) : undefined;

	const isDirty =
		positions.some((p) => p.name || p.description || p.quantity || p.unit || p.price) ||
		frequencyCount !== "1" ||
		frequencyPeriod !== "month" ||
		hideCompanyInfo ||
		selectedCompanyId !== "" ||
		selectedAddressIds.length > 0 ||
		delivery.paymentType !== "prepayment" ||
		delivery.paymentDeferralDays !== "" ||
		delivery.paymentMethod !== "bank_transfer" ||
		delivery.deliveryType !== "warehouse" ||
		delivery.unloading !== null ||
		delivery.analoguesAllowed !== null ||
		delivery.additionalInfo !== "" ||
		delivery.monitoringPeriod !== "quarter" ||
		files.length > 0 ||
		csCompanyName !== "" ||
		csDeliveryCost !== "" ||
		csDeferralDays !== "" ||
		csPricePerUnit !== "" ||
		csTco !== "";

	function resetForm() {
		setPositions([createEmptyRow()]);
		setFrequencyCount("1");
		setFrequencyPeriod("month");
		setHideCompanyInfo(false);
		setSelectedCompanyId("");
		setSelectedAddressIds([]);
		setCompanyError("");
		setDelivery(createDefaultDelivery());
		setFiles([]);
		setCsExpanded(false);
		setCsCompanyName("");
		setCsDeliveryCost("");
		setCsDeferralDays("");
		setCsPricePerUnit("");
		setCsTco("");
	}

	function updateDelivery<K extends keyof DeliveryState>(field: K, value: DeliveryState[K]) {
		setDelivery((prev) => ({ ...prev, [field]: value }));
	}

	function buildCurrentSupplier(): CurrentSupplier | undefined {
		const hasAnyValue = csCompanyName || csDeliveryCost || csDeferralDays || csPricePerUnit || csTco;
		if (!hasAnyValue) return undefined;
		return {
			companyName: csCompanyName,
			deliveryCost: csDeliveryCost ? Number(csDeliveryCost) : null,
			deferralDays: csDeferralDays ? Number(csDeferralDays) : 0,
			pricePerUnit: csPricePerUnit ? Number(csPricePerUnit) : null,
			tco: csTco ? Number(csTco) : null,
		};
	}

	function buildSharedFields(): Partial<NewItemInput> {
		const fields: Partial<NewItemInput> = {};

		const count = Number(frequencyCount);
		if (count >= 1) {
			fields.frequencyCount = count;
			fields.frequencyPeriod = frequencyPeriod;
		}

		if (hideCompanyInfo) {
			fields.hideCompanyInfo = true;
		}

		fields.paymentType = delivery.paymentType;
		if (delivery.paymentType === "deferred" && delivery.paymentDeferralDays) {
			fields.paymentDeferralDays = Number(delivery.paymentDeferralDays);
		}
		fields.paymentMethod = delivery.paymentMethod;

		fields.deliveryType = delivery.deliveryType;
		if (selectedAddressIds.length > 0 && selectedCompany) {
			const addresses = selectedCompany.addresses
				.filter((a) => selectedAddressIds.includes(a.id))
				.map((a) => a.address);
			if (addresses.length > 0) {
				fields.deliveryAddresses = addresses;
			}
		}

		if (delivery.unloading !== null) {
			fields.unloading = delivery.unloading;
		}

		if (delivery.analoguesAllowed !== null) {
			fields.analoguesAllowed = delivery.analoguesAllowed;
		}

		if (delivery.additionalInfo.trim()) {
			fields.additionalInfo = delivery.additionalInfo.trim();
		}

		fields.priceMonitoringPeriod = delivery.monitoringPeriod;

		return fields;
	}

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

		if (!selectedCompanyId) {
			setCompanyError("Выберите компанию");
			return;
		}
		if (selectedAddressIds.length === 0) {
			setCompanyError("Выберите хотя бы один адрес");
			return;
		}

		const deliveryFields = buildSharedFields();
		const currentSupplier = buildCurrentSupplier();

		const items: NewItemInput[] = positions.map((p) => ({
			name: p.name.trim(),
			description: p.description.trim() || undefined,
			unit: (p.unit || undefined) as NewItemInput["unit"],
			annualQuantity: p.quantity ? Number(p.quantity) : undefined,
			currentPrice: p.price ? Number(p.price) : undefined,
			...deliveryFields,
			...(currentSupplier ? { currentSupplier } : {}),
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
				<SheetContent
					showCloseButton={false}
					className="flex flex-col gap-0 max-md:!w-full max-md:!max-w-full max-md:!inset-0 max-md:!rounded-none"
				>
					<SheetHeader className="border-b pb-4">
						<SheetTitle>Добавить позиции</SheetTitle>
						<SheetDescription className="sr-only">Создание новых позиций закупок</SheetDescription>
					</SheetHeader>

					<div className="flex-1 overflow-y-auto px-4">
						<div className="flex flex-col gap-3 pt-4">
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
												placeholder="Название позиции *"
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
										<div className="flex flex-wrap gap-2">
											<Input
												type="number"
												inputMode="numeric"
												min={0}
												placeholder="Количество в год"
												value={pos.quantity}
												onChange={(e) => updatePosition(pos.key, "quantity", e.target.value)}
												autoComplete="off"
												className="flex-1"
											/>
											<Select value={pos.unit || undefined} onValueChange={(v) => updatePosition(pos.key, "unit", v)}>
												<SelectTrigger aria-label="Единица измерения" className="w-24">
													<SelectValue placeholder="Ед. изм." />
												</SelectTrigger>
												<SelectContent>
													{UNITS.map((u) => (
														<SelectItem key={u} value={u}>
															{u}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<div className="flex flex-1 basis-full items-center gap-1.5 md:basis-auto">
												<Input
													inputMode="numeric"
													placeholder="Цена без НДС"
													value={formatGroupedInteger(pos.price)}
													onChange={(e) => {
														const digits = e.target.value.replace(/\D/g, "");
														updatePosition(pos.key, "price", digits);
													}}
													autoComplete="off"
												/>
												<span className="text-sm text-muted-foreground">₽</span>
											</div>
										</div>
										{Number(pos.quantity) > 0 && Number(pos.price) > 0 && (
											<p className="text-xs text-muted-foreground">
												Годовой бюджет {formatCurrency(Number(pos.quantity) * Number(pos.price))}
											</p>
										)}
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

						{/* ── Текущий поставщик (collapsible) ── */}
						<div className="mt-4 rounded-lg border border-border">
							<button
								type="button"
								className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium hover:bg-muted/50"
								aria-expanded={csExpanded}
								onClick={() => setCsExpanded((prev) => !prev)}
							>
								{csExpanded ? (
									<ChevronDown className="size-4" aria-hidden="true" />
								) : (
									<ChevronRight className="size-4" aria-hidden="true" />
								)}
								Текущий поставщик
							</button>
							{csExpanded && (
								<div className="flex flex-col gap-3 border-t border-border px-3 pb-3 pt-2">
									<Input
										placeholder="Название компании"
										value={csCompanyName}
										onChange={(e) => setCsCompanyName(e.target.value)}
										spellCheck={false}
										autoComplete="off"
									/>
									<div className="grid grid-cols-2 gap-3">
										<div>
											<Input
												type="number"
												inputMode="numeric"
												min={0}
												value={csDeliveryCost}
												onChange={(e) => setCsDeliveryCost(e.target.value)}
												aria-label="Доставка, ₽"
												placeholder="Доставка"
												autoComplete="off"
											/>
										</div>
										<div>
											<Input
												type="number"
												inputMode="numeric"
												min={0}
												value={csDeferralDays}
												onChange={(e) => setCsDeferralDays(e.target.value)}
												aria-label="Отсрочка, дн."
												placeholder="Отсрочка"
												autoComplete="off"
											/>
										</div>
										<div>
											<Input
												type="number"
												inputMode="numeric"
												min={0}
												value={csPricePerUnit}
												onChange={(e) => setCsPricePerUnit(e.target.value)}
												aria-label="Цена/ед., ₽"
												placeholder="Цена/ед."
												autoComplete="off"
											/>
										</div>
										<div>
											<Input
												type="number"
												inputMode="numeric"
												min={0}
												value={csTco}
												onChange={(e) => setCsTco(e.target.value)}
												aria-label="ТСО, ₽"
												placeholder="ТСО"
												autoComplete="off"
											/>
										</div>
									</div>
								</div>
							)}
						</div>

						<p className="mt-4 rounded-lg bg-muted px-3 py-2 text-xs max-md:text-[0.65rem] text-muted-foreground">
							Условия ниже применяются ко всем позициям указанным в этом окне
						</p>

						<TooltipProvider>
							<div className="mt-3">
								{/* ── Компания ── */}
								<SectionGroupHeader title="Компания" />

								<div className="border-t border-border py-3 flex flex-col gap-3">
									<div>
										<Select
											value={selectedCompanyId || undefined}
											onValueChange={(v) => {
												setSelectedCompanyId(v);
												setCompanyError("");
												const company = companies.find((c) => c.id === v);
												setSelectedAddressIds(company?.addresses.map((a) => a.id) ?? []);
											}}
										>
											<SelectTrigger
												aria-label="Компания"
												aria-invalid={companyError && !selectedCompanyId ? true : undefined}
												className={companyError && !selectedCompanyId ? "border-destructive" : undefined}
											>
												<SelectValue placeholder="Выберите компанию *" />
											</SelectTrigger>
											<SelectContent position="popper">
												{companies.map((c) => (
													<SelectItem key={c.id} value={c.id}>
														{c.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									{selectedCompany && selectedCompany.addresses.length > 0 && (
										<div className="flex flex-col gap-1.5">
											<div className="flex items-center justify-between">
												<span className="text-sm text-muted-foreground">Адреса доставки</span>
												<button
													type="button"
													className="text-xs text-primary hover:underline"
													onClick={() => {
														const allSelected = selectedAddressIds.length === selectedCompany.addresses.length;
														setSelectedAddressIds(allSelected ? [] : selectedCompany.addresses.map((a) => a.id));
														setCompanyError("");
													}}
												>
													{selectedAddressIds.length === selectedCompany.addresses.length ? "Снять все" : "Выбрать все"}
												</button>
											</div>
											{selectedCompany.addresses.map((a) => (
												// biome-ignore lint/a11y/noLabelWithoutControl: Radix Checkbox renders a button internally
												<label key={a.id} className="flex cursor-pointer items-center gap-2">
													<Checkbox
														checked={selectedAddressIds.includes(a.id)}
														onCheckedChange={(checked) => {
															setSelectedAddressIds((prev) =>
																checked ? [...prev, a.id] : prev.filter((id) => id !== a.id),
															);
															setCompanyError("");
														}}
														aria-label={`${a.name} — ${a.address}`}
													/>
													<span className="min-w-0 flex-1 text-sm">
														{a.name} — {a.address}
													</span>
												</label>
											))}
										</div>
									)}
									{companyError && <p className="text-sm text-destructive">{companyError}</p>}
								</div>

								{/* ── Условия поставки ── */}
								<SectionGroupHeader title="Условия поставки" />

								<SectionLabel label="Частота поставок">
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
								</SectionLabel>

								<SectionLabel label="Условия оплаты">
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
								</SectionLabel>

								<SectionLabel label="Доставка">
									<SegmentedControl
										options={DELIVERY_TYPES}
										labels={DELIVERY_TYPE_LABELS}
										value={delivery.deliveryType}
										onChange={(v) => updateDelivery("deliveryType", v)}
									/>
								</SectionLabel>

								<SectionLabel label="Разгрузка">
									<OptionalSegmentedControl
										options={["supplier", "self"] as const}
										labels={UNLOADING_LABELS}
										value={delivery.unloading}
										onChange={(v) => updateDelivery("unloading", v)}
									/>
								</SectionLabel>

								{/* ── Параметры запроса ── */}
								<SectionGroupHeader title="Параметры запроса" />

								<SectionLabel label="Периодичность мониторинга цен">
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
								</SectionLabel>

								<div className="flex items-center gap-2 py-1">
									<Checkbox
										id="analogues-allowed"
										checked={delivery.analoguesAllowed === true}
										onCheckedChange={(checked) => updateDelivery("analoguesAllowed", checked === true ? true : null)}
										aria-label="Аналоги допускаются"
									/>
									<label htmlFor="analogues-allowed" className="text-sm">
										Допускаются аналоги
									</label>
								</div>

								<div className="border-t border-border py-3">
									<div className="flex items-center gap-2">
										{/* biome-ignore lint/a11y/noLabelWithoutControl: Radix Checkbox renders a button internally */}
										<label className="flex items-center gap-2">
											<Checkbox
												checked={hideCompanyInfo}
												onCheckedChange={(v) => setHideCompanyInfo(v === true)}
												aria-label="Скрыть информацию о компании"
											/>
											<span className="text-sm font-medium">Скрыть информацию о компании в запросе</span>
										</label>
										<HintTooltip text="Запрос будет от имени Sdelka.ai, название вашей компании будет скрыто. Это может снизить количество предложений от поставщиков" />
									</div>
								</div>

								{/* ── Дополнительно ── */}
								<SectionGroupHeader title="Дополнительно" />

								<SectionLabel
									label="Комментарий"
									hint="Опишите дополнительные требования к позициям — ИИ учтёт их при поиске поставщиков и в переговорах"
								>
									<Textarea
										placeholder="Введите комментарий…"
										value={delivery.additionalInfo}
										onChange={(e) => updateDelivery("additionalInfo", e.target.value)}
										className="w-full"
										rows={3}
									/>
								</SectionLabel>

								<SectionLabel
									label="Приложить файлы"
									hint="Прикрепите макеты, спецификации и другие документы — это поможет поставщикам сделать точный расчёт"
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
								</SectionLabel>
							</div>
						</TooltipProvider>
					</div>

					<SheetFooter className="sticky bottom-0 flex-row justify-between border-t bg-background">
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
