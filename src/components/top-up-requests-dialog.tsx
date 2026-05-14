import { Loader2, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { getPricePerRequest, type TariffId } from "@/data/domains/subscription";
import { useTopUpRequests } from "@/data/use-subscription";
import { formatCurrency } from "@/lib/format";

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 999;

interface TopUpRequestsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	tariffId: TariffId;
	tariffName: string;
}

export function TopUpRequestsDialog({ open, onOpenChange, tariffId, tariffName }: TopUpRequestsDialogProps) {
	const topUp = useTopUpRequests();
	const [quantity, setQuantity] = useState(1);
	const pricePerRequest = getPricePerRequest(tariffId);
	const total = pricePerRequest * quantity;

	function clamp(next: number) {
		if (Number.isNaN(next)) return MIN_QUANTITY;
		return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.floor(next)));
	}

	function handleConfirm() {
		topUp.mutate(
			{ quantity },
			{
				onSuccess: (result) => {
					toast.success(`Добавлено ${result.requests_added} запросов`);
					onOpenChange(false);
				},
				onError: () => toast.error("Не удалось докупить запросы"),
			},
		);
	}

	function handleOpenChange(next: boolean) {
		if (!next) setQuantity(1);
		onOpenChange(next);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent data-testid="top-up-dialog" className="sm:max-w-[26rem]">
				<DialogHeader>
					<DialogTitle>Докупить запросы</DialogTitle>
					<DialogDescription>
						Стоимость зависит от вашего тарифа <span className="font-medium text-foreground">{tariffName}</span>:{" "}
						<span className="tabular-nums text-foreground">{formatCurrency(pricePerRequest)}</span> за запрос.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div>
						<label htmlFor="top-up-quantity" className="block text-xs font-medium text-muted-foreground">
							Количество запросов
						</label>
						<div className="mt-2 flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								size="icon-sm"
								onClick={() => setQuantity((q) => clamp(q - 1))}
								disabled={quantity <= MIN_QUANTITY || topUp.isPending}
								aria-label="Уменьшить"
								className="relative after:absolute after:inset-[-6px] after:content-['']"
							>
								<Minus aria-hidden="true" />
							</Button>
							<input
								id="top-up-quantity"
								data-testid="top-up-quantity"
								type="number"
								inputMode="numeric"
								min={MIN_QUANTITY}
								max={MAX_QUANTITY}
								value={quantity}
								onChange={(e) => setQuantity(clamp(Number(e.target.value)))}
								className="h-9 w-20 rounded-md border border-border bg-background px-2 text-center text-base tabular-nums focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
							/>
							<Button
								type="button"
								variant="outline"
								size="icon-sm"
								onClick={() => setQuantity((q) => clamp(q + 1))}
								disabled={quantity >= MAX_QUANTITY || topUp.isPending}
								aria-label="Увеличить"
								className="relative after:absolute after:inset-[-6px] after:content-['']"
							>
								<Plus aria-hidden="true" />
							</Button>
						</div>
					</div>

					<div className="flex items-baseline justify-between rounded-lg bg-muted/60 px-4 py-3">
						<span className="text-sm text-muted-foreground">Итого</span>
						<span
							data-testid="top-up-total"
							className="font-heading text-2xl font-semibold tracking-tight tabular-nums text-foreground"
						>
							{formatCurrency(total)}
						</span>
					</div>
				</div>

				<DialogFooter>
					<Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={topUp.isPending}>
						Отмена
					</Button>
					<Button type="button" onClick={handleConfirm} disabled={topUp.isPending}>
						{topUp.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
						Оплатить
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
