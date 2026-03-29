import { ArrowDown, ArrowUp, ArrowUpDown, ListFilter, Search } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TaskSortField } from "@/data/task-types";
import { useMountEffect } from "@/hooks/use-mount-effect";

interface TaskToolbarProps {
	defaultSearch?: string;
	onSearchChange: (query: string) => void;
	sort: { field: string; direction: "asc" | "desc" } | null;
	onSort: (field: TaskSortField) => void;
	activeItem?: string;
	onItemFilter: (item: string | undefined) => void;
	procurementItems: string[];
}

const SORT_PRESETS: { label: string; field: TaskSortField }[] = [
	{ label: "Дата создания", field: "createdAt" },
	{ label: "Дедлайн", field: "deadline" },
	{ label: "Кол-во вопросов", field: "questionCount" },
];

const FILTER_BTN =
	"rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const FILTER_BTN_ACTIVE = "font-medium text-highlight-foreground";

export function TaskToolbar({
	defaultSearch,
	onSearchChange,
	sort,
	onSort,
	activeItem,
	onItemFilter,
	procurementItems,
}: TaskToolbarProps) {
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	useMountEffect(() => () => clearTimeout(debounceRef.current));

	function handleSearchInput(e: React.ChangeEvent<HTMLInputElement>) {
		const value = e.target.value;
		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => onSearchChange(value), 300);
	}

	return (
		<div className="flex flex-1 items-center justify-end gap-2">
			<div className="relative">
				<Search
					className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
					aria-hidden="true"
				/>
				<Input
					type="search"
					placeholder="Поиск…"
					defaultValue={defaultSearch}
					onChange={handleSearchInput}
					className="w-40 pl-8 lg:w-56"
					spellCheck={false}
					autoComplete="off"
				/>
			</div>

			<Popover>
				<Tooltip>
					<TooltipTrigger asChild>
						<PopoverTrigger asChild>
							<Button type="button" variant="ghost" size="icon-sm" aria-label="Сортировка" className="relative">
								<ArrowUpDown aria-hidden="true" />
								{sort && <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary" data-indicator />}
							</Button>
						</PopoverTrigger>
					</TooltipTrigger>
					<TooltipContent>Сортировка</TooltipContent>
				</Tooltip>
				<PopoverContent align="end" className="w-52">
					<div className="flex flex-col gap-1">
						{SORT_PRESETS.map((preset) => {
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

			<Popover>
				<Tooltip>
					<TooltipTrigger asChild>
						<PopoverTrigger asChild>
							<Button type="button" variant="ghost" size="icon-sm" aria-label="Фильтр" className="relative">
								<ListFilter aria-hidden="true" />
								{activeItem && (
									<span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary" data-indicator />
								)}
							</Button>
						</PopoverTrigger>
					</TooltipTrigger>
					<TooltipContent>Фильтр по позиции</TooltipContent>
				</Tooltip>
				<PopoverContent align="end" className="max-h-72 w-56 overflow-y-auto">
					<div className="flex flex-col gap-1">
						<button
							type="button"
							className={`${FILTER_BTN} ${!activeItem ? FILTER_BTN_ACTIVE : ""}`}
							onClick={() => onItemFilter(undefined)}
						>
							Все
						</button>
						<div className="my-1 h-px bg-border" />
						{procurementItems.map((item) => (
							<button
								key={item}
								type="button"
								className={`${FILTER_BTN} ${activeItem === item ? FILTER_BTN_ACTIVE : ""}`}
								onClick={() => onItemFilter(activeItem === item ? undefined : item)}
							>
								{item}
							</button>
						))}
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
