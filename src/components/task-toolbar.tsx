import { ArrowDown, ArrowUp, ArrowUpDown, Building2, Columns3, List, ListFilter, Search, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TaskSortField } from "@/data/task-types";
import type { CompanySummary } from "@/data/types";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { cn } from "@/lib/utils";

interface TaskToolbarProps {
	defaultSearch?: string;
	onSearchChange: (query: string) => void;
	sort: { field: string; direction: "asc" | "desc" } | null;
	onSort: (field: TaskSortField) => void;
	activeItem?: string;
	onItemFilter: (item: string | undefined) => void;
	onItemSearch: (query: string) => void;
	itemSearchResults: Array<{ id: string; name: string }>;
	companies?: CompanySummary[];
	activeCompany?: string;
	onCompanySelect?: (companyId: string | undefined) => void;
	view: "board" | "table";
	onViewChange: (mode: "board" | "table") => void;
}

const SORT_PRESETS: { label: string; field: TaskSortField }[] = [
	{ label: "Дата создания", field: "created_at" },
	{ label: "Дедлайн", field: "deadline_at" },
	{ label: "Кол-во вопросов", field: "question_count" },
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
	onItemSearch,
	itemSearchResults,
	companies = [],
	activeCompany,
	onCompanySelect,
	view,
	onViewChange,
}: TaskToolbarProps) {
	const isMultiCompany = companies.length > 1;
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const latestQueryRef = useRef(defaultSearch ?? "");
	const [searchExpanded, setSearchExpanded] = useState(false);
	useMountEffect(() => () => clearTimeout(debounceRef.current));

	function handleSearchInput(e: React.ChangeEvent<HTMLInputElement>) {
		const value = e.target.value;
		latestQueryRef.current = value;
		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => onSearchChange(value), 300);
	}

	function handleSearchExpand() {
		setSearchExpanded(true);
		requestAnimationFrame(() => searchInputRef.current?.focus());
	}

	function handleSearchCollapse() {
		setSearchExpanded(false);
		clearTimeout(debounceRef.current);
		onSearchChange(latestQueryRef.current);
	}

	return (
		<div className="flex flex-1 items-center justify-end gap-2">
			{searchExpanded ? (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label="Закрыть поиск"
					className="md:hidden"
					onClick={handleSearchCollapse}
				>
					<X aria-hidden="true" />
				</Button>
			) : (
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

			<div className={cn("relative", searchExpanded ? "flex-1 md:flex-initial" : "hidden md:block")}>
				<Search
					className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
					aria-hidden="true"
				/>
				<Input
					ref={searchInputRef}
					type="search"
					placeholder="Поиск…"
					defaultValue={latestQueryRef.current}
					onChange={handleSearchInput}
					className={cn("pl-8", searchExpanded ? "w-full" : "w-40 lg:w-56")}
					spellCheck={false}
					autoComplete="off"
				/>
			</div>

			<div className={cn("contents", searchExpanded && "max-md:hidden")}>
				<Popover>
					<Tooltip>
						<TooltipTrigger asChild>
							<PopoverTrigger asChild>
								<Button type="button" variant="ghost" size="icon-sm" aria-label="Сортировка" className="relative">
									<ArrowUpDown aria-hidden="true" />
									{sort && (
										<span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary" data-indicator />
									)}
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
										className={cn(FILTER_BTN, isActive && FILTER_BTN_ACTIVE)}
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
					<PopoverContent align="end" className="w-56">
						<div className="flex flex-col gap-1">
							{activeItem && (
								<>
									<button type="button" className={FILTER_BTN} onClick={() => onItemFilter(undefined)}>
										Все
									</button>
									<div className="my-1 h-px bg-border" />
								</>
							)}
							<Input
								type="search"
								placeholder="Поиск позиции…"
								onChange={(e) => onItemSearch(e.target.value)}
								className="mb-1"
								spellCheck={false}
								autoComplete="off"
							/>
							<div className="max-h-48 overflow-y-auto">
								{itemSearchResults.map((item) => (
									<button
										key={item.id}
										type="button"
										className={cn(FILTER_BTN, activeItem === item.id && FILTER_BTN_ACTIVE)}
										onClick={() => onItemFilter(item.id)}
									>
										{item.name}
									</button>
								))}
							</div>
						</div>
					</PopoverContent>
				</Popover>

				{isMultiCompany && (
					<Popover>
						<Tooltip>
							<TooltipTrigger asChild>
								<PopoverTrigger asChild>
									<Button type="button" variant="ghost" size="icon-sm" aria-label="Компания" className="relative">
										<Building2 aria-hidden="true" />
										{activeCompany && (
											<span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary" data-indicator />
										)}
									</Button>
								</PopoverTrigger>
							</TooltipTrigger>
							<TooltipContent>Компания</TooltipContent>
						</Tooltip>
						<PopoverContent align="end" className="max-h-72 w-56 overflow-y-auto">
							<div className="flex flex-col gap-1">
								<button
									type="button"
									className={cn(FILTER_BTN, !activeCompany && FILTER_BTN_ACTIVE)}
									onClick={() => onCompanySelect?.(undefined)}
								>
									Все компании
								</button>
								<div className="my-1 h-px bg-border" />
								{companies.map((c) => (
									<button
										key={c.id}
										type="button"
										className={cn(FILTER_BTN, activeCompany === c.id && FILTER_BTN_ACTIVE)}
										onClick={() => onCompanySelect?.(c.id)}
									>
										{c.name}
									</button>
								))}
							</div>
						</PopoverContent>
					</Popover>
				)}

				<div className="flex items-center gap-1">
					<Button
						variant={view === "board" ? "secondary" : "ghost"}
						size="icon-sm"
						onClick={() => onViewChange("board")}
						aria-label="Kanban"
					>
						<Columns3 className="size-4" aria-hidden="true" />
					</Button>
					<Button
						variant={view === "table" ? "secondary" : "ghost"}
						size="icon-sm"
						onClick={() => onViewChange("table")}
						aria-label="Таблица"
					>
						<List className="size-4" aria-hidden="true" />
					</Button>
				</div>
			</div>
		</div>
	);
}
