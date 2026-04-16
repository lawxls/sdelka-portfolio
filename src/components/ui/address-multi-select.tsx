import { ChevronDown } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AddressSummary } from "@/data/types";
import { cn } from "@/lib/utils";

interface AddressMultiSelectProps {
	addresses: AddressSummary[];
	selectedIds: string[];
	onChange: (ids: string[]) => void;
	placeholder?: string;
	disabled?: boolean;
	triggerAriaLabel?: string;
}

export function AddressMultiSelect({
	addresses,
	selectedIds,
	onChange,
	placeholder = "Выберите адреса",
	disabled = false,
	triggerAriaLabel,
}: AddressMultiSelectProps) {
	const selectedCount = selectedIds.length;
	const allSelected = addresses.length > 0 && selectedCount === addresses.length;
	const triggerLabel = selectedCount === 0 ? placeholder : `Выбрано: ${selectedCount} из ${addresses.length}`;
	const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

	const toggleOne = (id: string, checked: boolean) => {
		onChange(checked ? [...selectedIds, id] : selectedIds.filter((x) => x !== id));
	};

	const toggleAll = () => {
		onChange(allSelected ? [] : addresses.map((a) => a.id));
	};

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					disabled={disabled || addresses.length === 0}
					aria-label={triggerAriaLabel ?? "Адреса доставки"}
					className={cn("w-full justify-between font-normal", selectedCount === 0 && "text-muted-foreground")}
				>
					<span className="truncate">{triggerLabel}</span>
					<ChevronDown aria-hidden="true" className="ml-2 size-4 opacity-60" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-(--radix-popover-trigger-width) max-h-80 overflow-auto">
				{addresses.length > 0 && (
					<button
						type="button"
						className="self-start text-xs text-primary hover:underline focus-visible:outline-hidden focus-visible:underline"
						onClick={toggleAll}
					>
						{allSelected ? "Снять все" : "Выбрать все"}
					</button>
				)}
				<div className="flex flex-col gap-1.5">
					{addresses.map((a) => (
						// biome-ignore lint/a11y/noLabelWithoutControl: Radix Checkbox renders a button internally
						<label key={a.id} className="flex cursor-pointer items-center gap-2">
							<Checkbox
								checked={selectedSet.has(a.id)}
								onCheckedChange={(checked) => toggleOne(a.id, checked === true)}
								aria-label={`${a.name} — ${a.address}`}
							/>
							<span className="min-w-0 flex-1 text-sm">
								{a.name} — {a.address}
							</span>
						</label>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
