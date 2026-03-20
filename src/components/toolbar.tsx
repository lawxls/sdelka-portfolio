import { Filter, Plus, Search } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DeviationFilter, FilterState, StatusFilter } from "@/data/types";
import { STATUS_LABELS } from "@/data/types";
import { useMountEffect } from "@/hooks/use-mount-effect";

interface ToolbarProps {
	defaultSearch?: string;
	onSearchChange: (query: string) => void;
	filters: FilterState;
	onFiltersChange: (filters: FilterState) => void;
}

const DEVIATION_PRESETS: { label: string; value: DeviationFilter }[] = [
	{ label: "С переплатой", value: "overpaying" },
	{ label: "С экономией", value: "saving" },
];

const STATUS_PRESETS: { label: string; value: StatusFilter }[] = [
	{ label: STATUS_LABELS.searching, value: "searching" },
	{ label: STATUS_LABELS.negotiating, value: "negotiating" },
	{ label: STATUS_LABELS.completed, value: "completed" },
];

function hasActiveFilter(filters: FilterState): boolean {
	return filters.deviation !== "all" || filters.status !== "all";
}

const FILTER_BTN =
	"rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function Toolbar({ defaultSearch, onSearchChange, filters, onFiltersChange }: ToolbarProps) {
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	useMountEffect(() => () => clearTimeout(debounceRef.current));

	function handleSearchInput(e: React.ChangeEvent<HTMLInputElement>) {
		const value = e.target.value;
		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => onSearchChange(value), 300);
	}

	function handleDeviationClick(value: DeviationFilter) {
		onFiltersChange({
			...filters,
			deviation: filters.deviation === value ? "all" : value,
		});
	}

	function handleStatusClick(value: StatusFilter) {
		onFiltersChange({
			...filters,
			status: filters.status === value ? "all" : value,
		});
	}

	function handleResetFilters() {
		onFiltersChange({ deviation: "all", status: "all" });
	}

	return (
		<div className="flex items-center gap-2">
			<div className="relative">
				<Search
					className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
					aria-hidden="true"
				/>
				<Input
					type="search"
					placeholder="Поиск по названию…"
					defaultValue={defaultSearch}
					onChange={handleSearchInput}
					className="pl-8 w-48 lg:w-64"
					spellCheck={false}
					autoComplete="off"
				/>
			</div>
			<Popover>
				<PopoverTrigger asChild>
					<Button type="button" variant="outline" size="sm" aria-label="Фильтры" className="relative">
						<Filter data-icon="inline-start" aria-hidden="true" />
						Фильтры
						{hasActiveFilter(filters) && <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary" />}
					</Button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-56">
					<div className="flex flex-col gap-1">
						<button
							type="button"
							className={`${FILTER_BTN} ${!hasActiveFilter(filters) ? "font-medium text-primary" : ""}`}
							onClick={handleResetFilters}
						>
							Все
						</button>
						<div className="my-1 h-px bg-border" />
						{DEVIATION_PRESETS.map((preset) => (
							<button
								key={preset.value}
								type="button"
								className={`${FILTER_BTN} ${filters.deviation === preset.value ? "font-medium text-primary" : ""}`}
								onClick={() => handleDeviationClick(preset.value)}
							>
								{preset.label}
							</button>
						))}
						<div className="my-1 h-px bg-border" />
						{STATUS_PRESETS.map((preset) => (
							<button
								key={preset.value}
								type="button"
								className={`${FILTER_BTN} ${filters.status === preset.value ? "font-medium text-primary" : ""}`}
								onClick={() => handleStatusClick(preset.value)}
							>
								{preset.label}
							</button>
						))}
					</div>
				</PopoverContent>
			</Popover>
			<Button type="button" size="sm" onClick={() => {}} className="bg-status-highlight hover:bg-status-highlight/80">
				<Plus data-icon="inline-start" aria-hidden="true" />
				Добавить позиции
			</Button>
		</div>
	);
}
