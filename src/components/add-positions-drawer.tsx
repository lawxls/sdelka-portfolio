import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface AddPositionsDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (items: { name: string }[]) => void;
}

export function AddPositionsDrawer({ open, onOpenChange, onSubmit }: AddPositionsDrawerProps) {
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	function handleSubmit() {
		const trimmed = name.trim();
		if (!trimmed) {
			setError("Укажите название позиции");
			inputRef.current?.focus();
			return;
		}
		onSubmit([{ name: trimmed }]);
		setName("");
		setError(null);
		onOpenChange(false);
	}

	function handleCancel() {
		onOpenChange(false);
	}

	function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
		setName(e.target.value);
		if (error) setError(null);
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) {
			setName("");
			setError(null);
		}
		onOpenChange(nextOpen);
	}

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
			<SheetContent className="flex flex-col">
				<SheetHeader>
					<SheetTitle>Добавить позиции</SheetTitle>
					<SheetDescription className="sr-only">Создание новых позиций закупок</SheetDescription>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto px-4">
					<div className="flex flex-col gap-1.5">
						<Input
							ref={inputRef}
							placeholder="Название позиции"
							value={name}
							onChange={handleNameChange}
							autoFocus
							spellCheck={false}
							autoComplete="off"
							aria-invalid={error ? true : undefined}
							aria-describedby={error ? "position-name-error" : undefined}
						/>
						{error && (
							<p id="position-name-error" className="text-sm text-destructive">
								{error}
							</p>
						)}
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
	);
}
