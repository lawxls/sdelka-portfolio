import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { InviteEmployeeData } from "@/data/api-client";
import type { CompanySummary, EmployeeRole } from "@/data/types";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/data/types";
import { useProcurementCompanies } from "@/data/use-companies";
import { useInviteEmployees } from "@/data/use-workspace-employees";

interface InviteCard {
	key: string;
	email: string;
	position: string;
	role: EmployeeRole;
	companies: string[];
}

function createEmptyCard(): InviteCard {
	return {
		key: crypto.randomUUID(),
		email: "",
		position: "",
		role: "user",
		companies: [],
	};
}

interface InviteEmployeesDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function InviteEmployeesDrawer({ open, onOpenChange }: InviteEmployeesDrawerProps) {
	const [cards, setCards] = useState<InviteCard[]>(() => [createEmptyCard()]);
	const { data: allCompanies } = useProcurementCompanies();
	const inviteMutation = useInviteEmployees();

	function handleOpenChange(next: boolean) {
		if (!next) {
			setCards([createEmptyCard()]);
			inviteMutation.reset();
		}
		onOpenChange(next);
	}

	function addCard() {
		setCards((prev) => [...prev, createEmptyCard()]);
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
			position: c.position.trim(),
			role: c.role,
			companies: c.companies,
		}));

		inviteMutation.mutate(invites, {
			onSuccess: () => {
				toast.success("Приглашения отправлены");
				handleOpenChange(false);
			},
			onError: () => {
				toast.error("Не удалось отправить приглашения");
			},
		});
	}

	const canSubmit = cards.every((c) => c.email.trim() !== "") && !inviteMutation.isPending;

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
			<SheetContent className="flex flex-col max-md:!w-full max-md:!max-w-full max-md:!inset-0 max-md:!rounded-none">
				<SheetHeader>
					<SheetTitle>Отправить приглашения</SheetTitle>
				</SheetHeader>

				<div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-2">
					{cards.map((card, idx) => (
						<InviteCardRow
							key={card.key}
							card={card}
							cardNumber={idx + 1}
							canRemove={cards.length > 1}
							allCompanies={allCompanies}
							onUpdate={(patch) => updateCard(card.key, patch)}
							onRemove={() => removeCard(card.key)}
						/>
					))}

					<button
						type="button"
						onClick={addCard}
						className="flex items-center gap-1.5 rounded text-sm text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<Plus className="size-4" aria-hidden="true" />
						<span>Добавить</span>
					</button>
				</div>

				<SheetFooter>
					<Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
						{inviteMutation.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
						Отправить
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

function InviteCardRow({
	card,
	cardNumber,
	canRemove,
	allCompanies,
	onUpdate,
	onRemove,
}: {
	card: InviteCard;
	cardNumber: number;
	canRemove: boolean;
	allCompanies: CompanySummary[];
	onUpdate: (patch: Partial<Omit<InviteCard, "key">>) => void;
	onRemove: () => void;
}) {
	function toggleCompany(companyId: string, checked: boolean) {
		onUpdate({
			companies: checked ? [...card.companies, companyId] : card.companies.filter((id) => id !== companyId),
		});
	}

	return (
		<div className="flex flex-col gap-2 rounded-lg border border-border p-3" data-testid={`invite-card-${cardNumber}`}>
			<div className="flex items-center justify-between">
				<span className="text-xs font-medium text-muted-foreground">Сотрудник {cardNumber}</span>
				{canRemove && (
					<button
						type="button"
						onClick={onRemove}
						aria-label="Удалить приглашение"
						className="flex size-6 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<Trash2 className="size-3.5" aria-hidden="true" />
					</button>
				)}
			</div>

			<div className="flex flex-col gap-2">
				<div className="flex flex-col gap-1">
					<label className="text-xs text-muted-foreground" htmlFor={`email-${card.key}`}>
						Электронная почта
					</label>
					<Input
						id={`email-${card.key}`}
						type="email"
						value={card.email}
						onChange={(e) => onUpdate({ email: e.target.value })}
						placeholder="email@example.com"
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

				{allCompanies.length > 0 && (
					<div className="flex flex-col gap-1.5">
						<span className="text-xs text-muted-foreground">Компании</span>
						{allCompanies.map((company) => (
							// biome-ignore lint/a11y/noLabelWithoutControl: Radix Checkbox renders a button internally
							<label key={company.id} className="flex cursor-pointer items-center gap-2 text-sm">
								<Checkbox
									checked={card.companies.includes(company.id)}
									onCheckedChange={(checked) => toggleCompany(company.id, Boolean(checked))}
								/>
								{company.name}
							</label>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
