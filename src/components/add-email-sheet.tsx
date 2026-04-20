import { Loader2 } from "lucide-react";
import { useState } from "react";
import { FloatingInput } from "@/components/floating-input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AddEmailSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (email: string) => void;
	isPending?: boolean;
}

export function AddEmailSheet({ open, onOpenChange, onSubmit, isPending }: AddEmailSheetProps) {
	const [email, setEmail] = useState("");
	const [error, setError] = useState<string | null>(null);

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = email.trim();
		if (!trimmed) {
			setError("Укажите адрес почты");
			return;
		}
		if (!EMAIL_RE.test(trimmed)) {
			setError("Неверный формат адреса почты");
			return;
		}
		setError(null);
		onSubmit(trimmed);
	}

	function handleOpenChange(next: boolean) {
		if (!next) {
			setEmail("");
			setError(null);
		}
		onOpenChange(next);
	}

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
			<SheetContent className="flex flex-col">
				<SheetHeader>
					<SheetTitle>Добавить почту</SheetTitle>
					<SheetDescription>
						Письма, отправленные на этот адрес, будут автоматически привязаны к вашему рабочему пространству.
					</SheetDescription>
				</SheetHeader>

				<form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
					<div className="flex-1 space-y-4 px-4">
						<FloatingInput
							label="Адрес почты"
							name="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							error={error ?? undefined}
							autoComplete="email"
							inputMode="email"
						/>
					</div>

					<SheetFooter>
						<div className="flex justify-end gap-2">
							<Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
								Отмена
							</Button>
							<Button type="submit" disabled={isPending}>
								{isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
								Добавить
							</Button>
						</div>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	);
}
