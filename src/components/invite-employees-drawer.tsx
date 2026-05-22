import { ChevronDown, LoaderCircle, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BulkCard } from "@/components/ui/bulk-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { InviteEmployeeData } from "@/data/domains/workspace-employees";
import { TariffLimitExceededError, ValidationError } from "@/data/errors";
import { validateName } from "@/data/name-validation";
import type { CompanySummary, EmployeeRole } from "@/data/types";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/data/types";
import { useProcurementCompanies } from "@/data/use-companies";
import { useInviteEmployees } from "@/data/use-workspace-employees";
import { SURFACE_TINT } from "@/lib/class-presets";
import { cn } from "@/lib/utils";

interface InviteCard {
	key: string;
	email: string;
	firstName: string;
	lastName: string;
	patronymic: string;
	position: string;
	role: EmployeeRole;
	companies: string[];
}

function createEmptyCard(initialCompanyIds: string[]): InviteCard {
	return {
		key: crypto.randomUUID(),
		email: "",
		firstName: "",
		lastName: "",
		patronymic: "",
		position: "",
		role: "user",
		companies: [...initialCompanyIds],
	};
}

interface CardNameErrors {
	firstName: string | null;
	lastName: string | null;
	patronymic: string | null;
}

function cardNameErrors(c: InviteCard): CardNameErrors {
	return {
		firstName: validateName(c.firstName),
		lastName: validateName(c.lastName),
		patronymic: validateName(c.patronymic),
	};
}

function cardHasInvalidName(c: InviteCard): boolean {
	return validateName(c.firstName) !== null || validateName(c.lastName) !== null || validateName(c.patronymic) !== null;
}

function cardIsComplete(c: InviteCard): boolean {
	return c.email.trim() !== "" && c.firstName.trim() !== "" && c.lastName.trim() !== "" && !cardHasInvalidName(c);
}

function hasAlreadyBelongsError(body: unknown): boolean {
	if (!body || typeof body !== "object") return false;
	const invites = (body as { invites?: unknown }).invites;
	if (!Array.isArray(invites)) return false;
	return invites.some((row) => {
		if (!row || typeof row !== "object") return false;
		const emailErrs = (row as { email?: unknown }).email;
		return Array.isArray(emailErrs) && emailErrs.includes("already_belongs_to_a_workspace");
	});
}

interface InviteEmployeesDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** When set, the company picker is hidden and every invite is scoped to this id. */
	lockedCompanyId?: string;
}

export function InviteEmployeesDrawer({ open, onOpenChange, lockedCompanyId }: InviteEmployeesDrawerProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				showCloseButton={false}
				className="flex flex-col gap-0 max-md:!w-full max-md:!max-w-full max-md:!inset-0 max-md:!rounded-none"
			>
				{open && <InviteEmployeesDrawerContent lockedCompanyId={lockedCompanyId} onClose={() => onOpenChange(false)} />}
			</SheetContent>
		</Sheet>
	);
}

function InviteEmployeesDrawerContent({ lockedCompanyId, onClose }: { lockedCompanyId?: string; onClose: () => void }) {
	const { data: allCompanies, isLoading } = useProcurementCompanies();
	if (isLoading) {
		return (
			<>
				<SheetHeader className={cn("border-b pb-4", SURFACE_TINT)}>
					<SheetTitle>Добавить сотрудника</SheetTitle>
					<SheetDescription className="sr-only">Приглашение сотрудников</SheetDescription>
				</SheetHeader>
				<div className="flex flex-1 items-center justify-center">
					<LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-label="Загрузка…" />
				</div>
			</>
		);
	}
	return <InviteEmployeesForm allCompanies={allCompanies} lockedCompanyId={lockedCompanyId} onClose={onClose} />;
}

function InviteEmployeesForm({
	allCompanies,
	lockedCompanyId,
	onClose,
}: {
	allCompanies: CompanySummary[];
	lockedCompanyId?: string;
	onClose: () => void;
}) {
	const inviteMutation = useInviteEmployees();

	const initialCompanyIds = useMemo<string[]>(() => {
		if (lockedCompanyId) return [lockedCompanyId];
		if (allCompanies.length === 1) return [allCompanies[0].id];
		return [];
	}, [lockedCompanyId, allCompanies]);

	const [cards, setCards] = useState<InviteCard[]>(() => [createEmptyCard(initialCompanyIds)]);
	const [validatedKeys, setValidatedKeys] = useState<Set<string>>(() => new Set());

	function addCard() {
		const invalid = cards.filter((c) => !cardIsComplete(c));
		if (invalid.length > 0) {
			setValidatedKeys((prev) => {
				const next = new Set(prev);
				for (const c of invalid) next.add(c.key);
				return next;
			});
			return;
		}
		setCards((prev) => [...prev, createEmptyCard(initialCompanyIds)]);
	}

	function removeCard(key: string) {
		setCards((prev) => (prev.length > 1 ? prev.filter((c) => c.key !== key) : prev));
	}

	function updateCard(key: string, patch: Partial<Omit<InviteCard, "key">>) {
		setCards((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
	}

	function handleSubmit() {
		const invites: InviteEmployeeData[] = cards.map((c) => ({
			email: c.email.trim(),
			firstName: c.firstName.trim(),
			lastName: c.lastName.trim(),
			patronymic: c.patronymic.trim(),
			position: c.position.trim(),
			role: c.role,
			companies: c.companies,
		}));

		inviteMutation.mutate(invites, {
			onSuccess: () => {
				toast.success("Приглашения отправлены");
				onClose();
			},
			onError: (err) => {
				if (err instanceof TariffLimitExceededError && err.restriction === "employees") {
					toast.error("Превышен лимит тарифа на количество сотрудников в рабочем пространстве");
					return;
				}
				if (err instanceof ValidationError && hasAlreadyBelongsError(err.body)) {
					toast.error("Пользователь с таким email адресом уже зарегистрирован в системе");
					return;
				}
				toast.error("Не удалось отправить приглашения");
			},
		});
	}

	const canSubmit = cards.every(cardIsComplete) && !inviteMutation.isPending;

	return (
		<>
			<SheetHeader className={cn("border-b pb-4", SURFACE_TINT)}>
				<SheetTitle>Добавить сотрудника</SheetTitle>
				<SheetDescription className="sr-only">Приглашение сотрудников</SheetDescription>
			</SheetHeader>

			<div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
				{cards.map((card, idx) => (
					<InviteCardRow
						key={card.key}
						card={card}
						cardNumber={idx + 1}
						canRemove={cards.length > 1}
						validated={validatedKeys.has(card.key)}
						allCompanies={allCompanies}
						hideCompanyPicker={lockedCompanyId != null}
						onUpdate={(patch) => updateCard(card.key, patch)}
						onRemove={() => removeCard(card.key)}
					/>
				))}

				<Button type="button" variant="outline" size="sm" className="self-start" onClick={addCard}>
					<Plus aria-hidden="true" />
					Добавить
				</Button>
			</div>

			<SheetFooter className={cn("sticky bottom-0 flex-row justify-between border-t", SURFACE_TINT)}>
				<Button type="button" variant="ghost" onClick={onClose}>
					Отмена
				</Button>
				<Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
					{inviteMutation.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
					Отправить приглашения
				</Button>
			</SheetFooter>
		</>
	);
}

function InviteCardRow({
	card,
	cardNumber,
	canRemove,
	validated,
	allCompanies,
	hideCompanyPicker,
	onUpdate,
	onRemove,
}: {
	card: InviteCard;
	cardNumber: number;
	canRemove: boolean;
	/** True once the parent has tried to submit/add — gates inline error display. */
	validated: boolean;
	allCompanies: CompanySummary[];
	hideCompanyPicker: boolean;
	onUpdate: (patch: Partial<Omit<InviteCard, "key">>) => void;
	onRemove: () => void;
}) {
	const nameErrors = validated ? cardNameErrors(card) : null;
	const emailError = validated && card.email.trim() === "";
	const firstNameError = validated && (card.firstName.trim() === "" || nameErrors?.firstName != null);
	const lastNameError = validated && (card.lastName.trim() === "" || nameErrors?.lastName != null);
	const patronymicError = nameErrors?.patronymic != null;
	const firstNameMessage = nameErrors?.firstName ?? null;
	const lastNameMessage = nameErrors?.lastName ?? null;
	const patronymicMessage = nameErrors?.patronymic ?? null;
	return (
		<BulkCard
			label={`Сотрудник ${cardNumber}`}
			canRemove={canRemove}
			onRemove={onRemove}
			removeAriaLabel="Удалить приглашение"
			data-testid={`invite-card-${cardNumber}`}
		>
			<div className="flex flex-col gap-2">
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
					<div className="flex flex-col gap-1">
						<label className="text-xs text-muted-foreground" htmlFor={`lastName-${card.key}`}>
							Фамилия
						</label>
						<Input
							id={`lastName-${card.key}`}
							className={cn(lastNameError && "border-destructive")}
							value={card.lastName}
							onChange={(e) => onUpdate({ lastName: e.target.value })}
							placeholder="Иванов"
							aria-invalid={lastNameError || undefined}
							spellCheck={false}
							autoComplete="family-name"
						/>
						{lastNameMessage && <p className="text-xs text-destructive">{lastNameMessage}</p>}
					</div>
					<div className="flex flex-col gap-1">
						<label className="text-xs text-muted-foreground" htmlFor={`firstName-${card.key}`}>
							Имя
						</label>
						<Input
							id={`firstName-${card.key}`}
							className={cn(firstNameError && "border-destructive")}
							value={card.firstName}
							onChange={(e) => onUpdate({ firstName: e.target.value })}
							placeholder="Иван"
							aria-invalid={firstNameError || undefined}
							spellCheck={false}
							autoComplete="given-name"
						/>
						{firstNameMessage && <p className="text-xs text-destructive">{firstNameMessage}</p>}
					</div>
					<div className="flex flex-col gap-1">
						<label className="text-xs text-muted-foreground" htmlFor={`patronymic-${card.key}`}>
							Отчество
						</label>
						<Input
							id={`patronymic-${card.key}`}
							className={cn(patronymicError && "border-destructive")}
							value={card.patronymic}
							onChange={(e) => onUpdate({ patronymic: e.target.value })}
							placeholder="Иванович"
							aria-invalid={patronymicError || undefined}
							spellCheck={false}
							autoComplete="off"
						/>
						{patronymicMessage && <p className="text-xs text-destructive">{patronymicMessage}</p>}
					</div>
				</div>

				<div className="flex flex-col gap-1">
					<label className="text-xs text-muted-foreground" htmlFor={`email-${card.key}`}>
						Электронная почта
					</label>
					<Input
						id={`email-${card.key}`}
						className={cn(emailError && "border-destructive")}
						type="email"
						value={card.email}
						onChange={(e) => onUpdate({ email: e.target.value })}
						placeholder="email@example.com"
						aria-invalid={emailError || undefined}
						spellCheck={false}
						autoComplete="off"
					/>
				</div>

				<div className="flex flex-col gap-1">
					<label className="text-xs text-muted-foreground" htmlFor={`position-${card.key}`}>
						Должность
					</label>
					<Input
						id={`position-${card.key}`}
						value={card.position}
						onChange={(e) => onUpdate({ position: e.target.value })}
						placeholder="Менеджер"
						spellCheck={false}
						autoComplete="off"
					/>
				</div>

				<div className="flex flex-col gap-1">
					<span className="text-xs text-muted-foreground" id={`role-label-${card.key}`}>
						Роль
					</span>
					<Select value={card.role} onValueChange={(v) => onUpdate({ role: v as EmployeeRole })}>
						<SelectTrigger aria-labelledby={`role-label-${card.key}`}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{ASSIGNABLE_ROLES.map((r) => (
								<SelectItem key={r} value={r}>
									{ROLE_LABELS[r]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{!hideCompanyPicker && allCompanies.length > 0 && (
					<div className="flex flex-col gap-1">
						<span className="text-xs text-muted-foreground">Компании</span>
						<CompanyMultiSelect
							companies={allCompanies}
							selectedIds={card.companies}
							onChange={(companies) => onUpdate({ companies })}
						/>
					</div>
				)}
			</div>
		</BulkCard>
	);
}

function CompanyMultiSelect({
	companies,
	selectedIds,
	onChange,
}: {
	companies: CompanySummary[];
	selectedIds: string[];
	onChange: (ids: string[]) => void;
}) {
	const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
	const selectedCount = selectedIds.length;
	const allSelected = companies.length > 0 && selectedCount === companies.length;
	const triggerLabel =
		selectedCount === 0
			? "Выберите компании"
			: selectedCount === 1
				? (companies.find((c) => c.id === selectedIds[0])?.name ?? "Выбрана 1 компания")
				: `Выбрано: ${selectedCount} из ${companies.length}`;

	function toggleOne(id: string, checked: boolean) {
		onChange(checked ? [...selectedIds, id] : selectedIds.filter((x) => x !== id));
	}

	function toggleAll() {
		onChange(allSelected ? [] : companies.map((c) => c.id));
	}

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					aria-label="Выбор компаний"
					className={cn("w-full justify-between font-normal", selectedCount === 0 && "text-muted-foreground")}
				>
					<span className="truncate">{triggerLabel}</span>
					<ChevronDown aria-hidden="true" className="ml-2 size-4 opacity-60" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-(--radix-popover-trigger-width) max-h-80 overflow-auto">
				{companies.length > 1 && (
					<button
						type="button"
						className="self-start text-xs text-primary hover:underline focus-visible:outline-hidden focus-visible:underline"
						onClick={toggleAll}
					>
						{allSelected ? "Снять все" : "Выбрать все"}
					</button>
				)}
				<div className="flex flex-col gap-1.5">
					{companies.map((c) => (
						// biome-ignore lint/a11y/noLabelWithoutControl: Radix Checkbox renders a button internally
						<label key={c.id} className="flex cursor-pointer items-center gap-2">
							<Checkbox
								checked={selectedSet.has(c.id)}
								onCheckedChange={(checked) => toggleOne(c.id, checked === true)}
								aria-label={c.name}
							/>
							<span className="min-w-0 flex-1 text-sm">{c.name}</span>
						</label>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
