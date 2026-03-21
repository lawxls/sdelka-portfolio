import { Plus, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UNITS } from "@/data/types";
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

export function AddPositionsDrawer({ open, onOpenChange, onSubmit }: AddPositionsDrawerProps) {
	const [positions, setPositions] = useState<PositionRow[]>(() => [createEmptyRow()]);
	const pendingFocusKey = useRef<string | null>(null);

	function resetForm() {
		setPositions([createEmptyRow()]);
	}

	function handleSubmit() {
		let hasError = false;
		const validated = positions.map((p) => {
			if (!p.name.trim()) {
				hasError = true;
				return { ...p, error: "Укажите название позиции" };
			}
			return { ...p, error: undefined };
		});

		if (hasError) {
			setPositions(validated);
			return;
		}

		const items: NewItemInput[] = positions.map((p) => ({
			name: p.name.trim(),
			description: p.description.trim() || undefined,
			unit: (p.unit || undefined) as NewItemInput["unit"],
			annualQuantity: p.quantity ? Number(p.quantity) : undefined,
			currentPrice: p.price ? Number(p.price) : undefined,
		}));

		onSubmit(items);
		resetForm();
		onOpenChange(false);
	}

	function handleCancel() {
		onOpenChange(false);
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) {
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
													ref={
														pos.key === pendingFocusKey.current
															? (el) => {
																	if (el) {
																		el.focus();
																		pendingFocusKey.current = null;
																	}
																}
															: undefined
													}
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
