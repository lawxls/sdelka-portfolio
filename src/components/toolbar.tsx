import { ArrowDown, ArrowUp, ArrowUpDown, Download, ListFilter, Plus, Search } from "lucide-react";
import { useRef, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DeviationFilter, FilterState, SortField, SortState, StatusFilter } from "@/data/types";
import { STATUS_LABELS } from "@/data/types";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { cn } from "@/lib/utils";

interface ToolbarProps {
	defaultSearch?: string;
	onSearchChange: (query: string) => void;
	filters: FilterState;
	onFiltersChange: (filters: FilterState) => void;
	sort: SortState | null;
	onSort: (field: SortField) => void;
	onAddPositions?: () => void;
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

const SORT_FIELD_PRESETS: { label: string; field: SortField }[] = [
	{ label: "Стоимость в год", field: "annualCost" },
	{ label: "Текущая цена", field: "currentPrice" },
	{ label: "Лучшая цена", field: "bestPrice" },
	{ label: "Средняя цена", field: "averagePrice" },
	{ label: "Отклонение (%)", field: "deviation" },
	{ label: "Переплата (₽)", field: "overpayment" },
];

function hasActiveFilter(filters: FilterState): boolean {
	return filters.deviation !== "all" || filters.status !== "all";
}

const FILTER_BTN =
	"rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const FILTER_BTN_ACTIVE = "font-medium text-highlight-foreground";

export function Toolbar({
	defaultSearch,
	onSearchChange,
	filters,
	onFiltersChange,
	sort,
	onSort,
	onAddPositions,
}: ToolbarProps) {
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const [searchExpanded, setSearchExpanded] = useState(false);
	useMountEffect(() => () => clearTimeout(debounceRef.current));

	function handleSearchInput(e: React.ChangeEvent<HTMLInputElement>) {
		const value = e.target.value;
		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => onSearchChange(value), 300);
	}

	function handleSearchExpand() {
		setSearchExpanded(true);
		requestAnimationFrame(() => searchInputRef.current?.focus());
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
		<div className="relative flex items-center gap-2">
			{/* Search icon — mobile only, hidden when expanded */}
			{!searchExpanded && (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label="Поиск"
					className="md:hidden"
					onClick={handleSearchExpand}
				>
					<Search aria-hidden="true" />
				</Button>
			)}

			{/* Search input — always on desktop, expandable overlay on mobile */}
			<div
				className={cn(
					"relative",
					searchExpanded
						? "absolute inset-0 z-10 flex items-center bg-background md:relative md:inset-auto md:z-auto md:bg-transparent"
						: "hidden md:block",
				)}
			>
				<Search
					className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
					aria-hidden="true"
				/>
				<Input
					ref={searchInputRef}
					type="search"
					placeholder="Поиск по названию…"
					defaultValue={defaultSearch}
					onChange={handleSearchInput}
					onBlur={() => setSearchExpanded(false)}
					className={cn("pl-8", searchExpanded ? "w-full" : "w-48 lg:w-64")}
					spellCheck={false}
					autoComplete="off"
				/>
			</div>

			{/* Sort popover — mobile only */}
			<Popover>
				<Tooltip>
					<TooltipTrigger asChild>
						<PopoverTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label="Сортировка"
								className="relative md:hidden"
							>
								<ArrowUpDown aria-hidden="true" />
								{sort && <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary" />}
							</Button>
						</PopoverTrigger>
					</TooltipTrigger>
					<TooltipContent>Сортировка</TooltipContent>
				</Tooltip>
				<PopoverContent align="end" className="w-56">
					<div className="flex flex-col gap-1">
						{SORT_FIELD_PRESETS.map((preset) => {
							const isActive = sort?.field === preset.field;
							return (
								<button
									key={preset.field}
									type="button"
									className={`${FILTER_BTN} ${isActive ? FILTER_BTN_ACTIVE : ""}`}
									onClick={() => onSort(preset.field)}
								>
									<span className="flex items-center justify-between">
										{preset.label}
										{isActive &&
											(sort.direction === "asc" ? (
												<ArrowUp className="size-3.5" aria-hidden="true" />
											) : (
												<ArrowDown className="size-3.5" aria-hidden="true" />
											))}
									</span>
								</button>
							);
						})}
					</div>
				</PopoverContent>
			</Popover>

			{/* Filter popover */}
			<Popover>
				<Tooltip>
					<TooltipTrigger asChild>
						<PopoverTrigger asChild>
							<Button type="button" variant="ghost" size="icon-sm" aria-label="Фильтры" className="relative">
								<ListFilter aria-hidden="true" />
								{hasActiveFilter(filters) && (
									<span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary" />
								)}
							</Button>
						</PopoverTrigger>
					</TooltipTrigger>
					<TooltipContent>Фильтры</TooltipContent>
				</Tooltip>
				<PopoverContent align="end" className="w-56">
					<div className="flex flex-col gap-1">
						<button
							type="button"
							className={`${FILTER_BTN} ${!hasActiveFilter(filters) ? FILTER_BTN_ACTIVE : ""}`}
							onClick={handleResetFilters}
						>
							Все
						</button>
						<div className="my-1 h-px bg-border" />
						{DEVIATION_PRESETS.map((preset) => (
							<button
								key={preset.value}
								type="button"
								className={`${FILTER_BTN} ${filters.deviation === preset.value ? FILTER_BTN_ACTIVE : ""}`}
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
								className={`${FILTER_BTN} ${filters.status === preset.value ? FILTER_BTN_ACTIVE : ""}`}
								onClick={() => handleStatusClick(preset.value)}
							>
								{preset.label}
							</button>
						))}
					</div>
				</PopoverContent>
			</Popover>

			{/* Download */}
			<Tooltip>
				<TooltipTrigger asChild>
					<Button type="button" variant="ghost" size="icon-sm" aria-label="Скачать таблицу" onClick={() => {}}>
						<Download aria-hidden="true" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Скачать таблицу</TooltipContent>
			</Tooltip>

			<ThemeToggle />

			{/* Add button — desktop (full text) */}
			<Button
				type="button"
				size="sm"
				onClick={onAddPositions}
				className="hidden bg-status-highlight hover:bg-status-highlight/80 md:inline-flex"
			>
				<Plus data-icon="inline-start" aria-hidden="true" />
				Добавить позиции
			</Button>

			{/* Add button — mobile (icon only) */}
			<Button
				type="button"
				size="icon-sm"
				aria-label="Добавить"
				onClick={onAddPositions}
				className="bg-status-highlight hover:bg-status-highlight/80 md:hidden"
			>
				<Plus aria-hidden="true" />
			</Button>
		</div>
	);
}
