import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FloatingInput } from "@/components/floating-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/data/types";
import { useInviteEmployees } from "@/data/use-workspace";
import type { InvitePayload } from "@/data/workspace-types";

interface InviteCard {
	id: string;
	email: string;
	position: string;
	role: "admin" | "user";
}

function makeCard(): InviteCard {
	return { id: crypto.randomUUID(), email: "", position: "", role: "user" };
}

interface InviteEmployeesDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function InviteEmployeesDrawer({ open, onOpenChange }: InviteEmployeesDrawerProps) {
	const [cards, setCards] = useState<InviteCard[]>(() => [makeCard()]);
	const inviteMutation = useInviteEmployees();

	function addCard() {
		setCards((prev) => [...prev, makeCard()]);
	}

	function removeCard(id: string) {
		setCards((prev) => prev.filter((c) => c.id !== id));
	}

	function updateCard(id: string, field: keyof Omit<InviteCard, "id">, value: string) {
		setCards((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
	}

	function handleClose() {
		setCards([makeCard()]);
		onOpenChange(false);
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const invites: InvitePayload[] = cards
			.filter((c) => c.email.trim())
			.map((c) => ({ email: c.email.trim(), position: c.position, role: c.role, companies: [] }));

		if (invites.length === 0) return;

		inviteMutation.mutate(invites, {
			onSuccess: () => {
				toast.success("Приглашения отправлены");
				handleClose();
			},
			onError: () => {
				toast.error("Не удалось отправить приглашения");
			},
		});
	}

	return (
		<Sheet
			open={open}
			onOpenChange={(next) => {
				if (!next) handleClose();
			}}
		>
			<SheetContent className="flex flex-col max-md:!w-full max-md:!max-w-full max-md:!inset-0 max-md:!rounded-none">
				<SheetHeader>
					<SheetTitle>Отправить приглашения</SheetTitle>
					<SheetDescription className="sr-only">Добавить новых сотрудников</SheetDescription>
				</SheetHeader>

				<form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
					<div className="flex-1 overflow-y-auto px-1 py-2 space-y-3">
						{cards.map((card, index) => (
							<div key={card.id} className="rounded-lg border border-border p-3 space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium text-muted-foreground">Сотрудник {index + 1}</span>
									{cards.length > 1 && (
										<button
											type="button"
											onClick={() => removeCard(card.id)}
											aria-label="Удалить карточку"
											className="text-muted-foreground hover:text-destructive transition-colors"
										>
											<Trash2 className="size-4" aria-hidden="true" />
										</button>
									)}
								</div>
								<FloatingInput
									label="Электронная почта"
									name={`email-${card.id}`}
									type="email"
									value={card.email}
									onChange={(e) => updateCard(card.id, "email", e.target.value)}
									autoComplete="off"
									aria-label="Электронная почта"
								/>
								<FloatingInput
									label="Должность"
									name={`position-${card.id}`}
									value={card.position}
									onChange={(e) => updateCard(card.id, "position", e.target.value)}
									autoComplete="off"
									aria-label="Должность"
								/>
								<div>
									<label htmlFor={`role-${card.id}`} className="mb-1 block text-xs text-muted-foreground">
										Роль
									</label>
									<Select value={card.role} onValueChange={(v) => updateCard(card.id, "role", v)}>
										<SelectTrigger id={`role-${card.id}`} className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{ASSIGNABLE_ROLES.map((role) => (
												<SelectItem key={role} value={role}>
													{ROLE_LABELS[role]}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
						))}

						<Button type="button" variant="outline" size="sm" className="w-full" onClick={addCard}>
							+ Добавить
						</Button>
					</div>

					<div className="shrink-0 border-t border-border px-1 pt-3 pb-1 flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={handleClose}>
							Отмена
						</Button>
						<Button type="submit" disabled={inviteMutation.isPending || cards.every((c) => !c.email.trim())}>
							{inviteMutation.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
							Отправить
						</Button>
					</div>
				</form>
			</SheetContent>
		</Sheet>
	);
}
