import { ChevronDown, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { InviteEmployeeData } from "@/data/domains/workspace-employees";
import type { CompanySummary, EmployeeRole } from "@/data/types";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/data/types";
import { useProcurementCompanies } from "@/data/use-companies";
import { useInviteEmployees } from "@/data/use-workspace-employees";
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
				<SheetHeader className="border-b pb-4">
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
		const invalid = cards.filter((c) => c.email.trim() === "" || c.firstName.trim() === "" || c.lastName.trim() === "");
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
			onError: () => {
				toast.error("Не удалось отправить приглашения");
			},
		});
	}

	const canSubmit =
		cards.every((c) => c.email.trim() !== "" && c.firstName.trim() !== "" && c.lastName.trim() !== "") &&
		!inviteMutation.isPending;

	return (
		<>
			<SheetHeader className="border-b pb-4">
				<SheetTitle>Добавить сотрудника</SheetTitle>
				<SheetDescription className="sr-only">Приглашение сотрудников</SheetDescription>
			</SheetHeader>

			<div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
				{cards.map((card, idx) => {
					const validated = validatedKeys.has(card.key);
					return (
						<InviteCardRow
							key={card.key}
							card={card}
							cardNumber={idx + 1}
							canRemove={cards.length > 1}
							emailError={validated && card.email.trim() === ""}
							firstNameError={validated && card.firstName.trim() === ""}
							lastNameError={validated && card.lastName.trim() === ""}
							allCompanies={allCompanies}
							hideCompanyPicker={lockedCompanyId != null}
							onUpdate={(patch) => updateCard(card.key, patch)}
							onRemove={() => removeCard(card.key)}
						/>
					);
				})}

				<Button type="button" variant="outline" size="sm" className="self-start" onClick={addCard}>
					<Plus aria-hidden="true" />
					Добавить
				</Button>
			</div>

			<SheetFooter className="sticky bottom-0 flex-row justify-between border-t bg-background">
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
	emailError,
	firstNameError,
	lastNameError,
	allCompanies,
	hideCompanyPicker,
	onUpdate,
	onRemove,
}: {
	card: InviteCard;
	cardNumber: number;
	canRemove: boolean;
	emailError: boolean;
	firstNameError: boolean;
	lastNameError: boolean;
	allCompanies: CompanySummary[];
	hideCompanyPicker: boolean;
	onUpdate: (patch: Partial<Omit<InviteCard, "key">>) => void;
	onRemove: () => void;
}) {
	return (
		<div className="flex flex-col gap-2 rounded-lg border border-border p-3" data-testid={`invite-card-${cardNumber}`}>
			<div className="flex items-center justify-between">
				<span className="text-xs font-medium text-muted-foreground">Сотрудник {cardNumber}</span>
				{canRemove && (
					<button
						type="button"
						onClick={onRemove}
						aria-label="Удалить приглашение"
						className="relative flex size-6 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring after:absolute after:inset-[-8px] after:content-['']"
					>
						<Trash2 className="size-3.5" aria-hidden="true" />
					</button>
				)}
			</div>

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
					</div>
					<div className="flex flex-col gap-1">
						<label className="text-xs text-muted-foreground" htmlFor={`patronymic-${card.key}`}>
							Отчество
						</label>
						<Input
							id={`patronymic-${card.key}`}
							value={card.patronymic}
							onChange={(e) => onUpdate({ patronymic: e.target.value })}
							placeholder="Иванович"
							spellCheck={false}
							autoComplete="off"
						/>
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
		</div>
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
