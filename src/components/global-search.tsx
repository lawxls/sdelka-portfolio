import { ArrowLeft, Building2, Inbox, ListTodo, Mail, Package, Search, User } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SUPPLIER_STATUS_LABELS, type SupplierStatus } from "@/data/supplier-types";
import { PRIVILEGED_ROLES } from "@/data/types";
import { useAllCompanies } from "@/data/use-companies";
import { useEmails } from "@/data/use-emails";
import { useAllItems } from "@/data/use-items";
import { useMe } from "@/data/use-me";
import { useAllSuppliers } from "@/data/use-suppliers";
import { useAllTasks } from "@/data/use-tasks";
import { useWorkspaceEmployees } from "@/data/use-workspace-employees";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";
import {
	type GlobalSearchGroup,
	GROUP_LABELS,
	type GroupResult,
	MIN_QUERY_LENGTH,
	matchGlobal,
	type SearchResult,
} from "./global-search-matcher";

const PER_GROUP_CAP = 5;
const DEBOUNCE_MS = 250;

const GROUP_ICON: Record<GlobalSearchGroup, typeof Package> = {
	items: Package,
	suppliers: Building2,
	tasks: ListTodo,
	employees: User,
	companies: Building2,
	inboxes: Inbox,
};

const SUPPLIER_SEARCH_STATUS_LABEL: Record<SupplierStatus, string> = {
	...SUPPLIER_STATUS_LABELS,
	new: "Кандидат",
};

export function GlobalSearch() {
	const isMobile = useIsMobile();
	const [mobileExpanded, setMobileExpanded] = useState(false);
	const {
		value: rawQuery,
		debounced: debouncedQuery,
		set: setRawQuery,
		flush: flushQuery,
	} = useDebouncedValue("", DEBOUNCE_MS);
	const [everFocused, setEverFocused] = useState(false);
	const [expanded, setExpanded] = useState<Set<GlobalSearchGroup>>(new Set());
	const [activeIndex, setActiveIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const listboxId = useId();
	const navigate = useNavigate();

	function handleQueryChange(value: string) {
		setRawQuery(value);
		setActiveIndex(0);
	}

	function resetAll() {
		flushQuery("");
		setExpanded(new Set());
		setActiveIndex(0);
	}

	function collapseMobile() {
		resetAll();
		setMobileExpanded(false);
	}

	const { data: me } = useMe();
	const isPrivileged = me ? PRIVILEGED_ROLES.has(me.role) : false;

	const itemsQ = useAllItems({ enabled: everFocused });
	const items = itemsQ.data ?? [];

	const suppliersQ = useAllSuppliers({ enabled: everFocused });
	const tasksQ = useAllTasks({ enabled: everFocused });
	const companiesQ = useAllCompanies({ enabled: everFocused && isPrivileged });
	const { employees } = useWorkspaceEmployees({ enabled: everFocused && isPrivileged });
	const { emails } = useEmails({ enabled: everFocused && isPrivileged });

	const hasMinLength = rawQuery.trim().length >= MIN_QUERY_LENGTH;

	const groups: GroupResult[] = useMemo(
		() =>
			matchGlobal({
				query: debouncedQuery,
				items,
				suppliers: suppliersQ.data ?? [],
				tasks: tasksQ.data ?? [],
				employees,
				companies: companiesQ.data ?? [],
				inboxes: emails,
				isPrivileged,
			}),
		[debouncedQuery, items, suppliersQ.data, tasksQ.data, employees, companiesQ.data, emails, isPrivileged],
	);

	const totalMatches = groups.reduce((sum, g) => sum + g.results.length, 0);
	const visibleRows = useMemo(() => flattenVisible(groups, expanded), [groups, expanded]);
	const clampedActive = Math.min(activeIndex, Math.max(visibleRows.length - 1, 0));

	function handleSelect(result: SearchResult) {
		navigate(result.href);
		resetAll();
		inputRef.current?.blur();
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Escape") {
			e.preventDefault();
			if (isMobile) collapseMobile();
			else resetAll();
			inputRef.current?.blur();
			return;
		}
		if (!hasMinLength || visibleRows.length === 0) return;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActiveIndex(Math.min(clampedActive + 1, visibleRows.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActiveIndex(Math.max(clampedActive - 1, 0));
		} else if (e.key === "Enter") {
			e.preventDefault();
			const row = visibleRows[clampedActive];
			if (row) handleSelect(row);
		}
	}

	function toggleExpanded(group: GlobalSearchGroup) {
		setActiveIndex(0);
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(group)) next.delete(group);
			else next.add(group);
			return next;
		});
	}

	function handleOpenChange(next: boolean) {
		if (!next) resetAll();
	}

	const activeDescendant =
		hasMinLength && visibleRows[clampedActive] ? rowId(listboxId, visibleRows[clampedActive]) : undefined;

	if (isMobile && !mobileExpanded) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label="Поиск"
						onClick={() => {
							setMobileExpanded(true);
							setEverFocused(true);
						}}
						className="text-muted-foreground hover:text-foreground"
					>
						<Search className="size-5" aria-hidden="true" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Поиск</TooltipContent>
			</Tooltip>
		);
	}

	return (
		<Popover open={hasMinLength} onOpenChange={handleOpenChange}>
			<PopoverAnchor asChild>
				<div
					className={cn(
						"group relative",
						isMobile && "absolute inset-x-0 top-0 z-20 flex h-12 items-center gap-1 bg-sidebar px-3",
					)}
				>
					{isMobile && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							aria-label="Закрыть поиск"
							onClick={collapseMobile}
							className="relative text-muted-foreground hover:text-foreground after:absolute after:inset-[-4px] after:content-['']"
						>
							<ArrowLeft className="size-5" aria-hidden="true" />
						</Button>
					)}
					<div className={cn("relative", isMobile && "flex-1")}>
						<Search
							className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground"
							aria-hidden="true"
						/>
						<Input
							ref={inputRef}
							type="search"
							placeholder="Поиск позиций, поставщиков, задач…"
							value={rawQuery}
							onChange={(e) => handleQueryChange(e.target.value)}
							onFocus={() => setEverFocused(true)}
							onKeyDown={handleKeyDown}
							role="combobox"
							aria-expanded={hasMinLength}
							aria-controls={listboxId}
							aria-activedescendant={activeDescendant}
							autoFocus={isMobile && mobileExpanded}
							className={cn(
								"rounded-xl border-sidebar-border bg-background/60 pl-9 placeholder:text-muted-foreground/70 hover:bg-background hover:border-border focus-visible:bg-background",
								isMobile ? "h-9 w-full text-base md:text-[0.8125rem]" : "h-8 w-60 text-[0.8125rem] md:w-96",
							)}
							spellCheck={false}
							autoComplete="off"
							aria-label="Глобальный поиск"
						/>
					</div>
				</div>
			</PopoverAnchor>
			<PopoverContent
				align="start"
				sideOffset={6}
				onOpenAutoFocus={(e) => e.preventDefault()}
				onCloseAutoFocus={(e) => e.preventDefault()}
				className="w-(--radix-popover-trigger-width) max-w-[min(calc(100vw-1.5rem),36rem)] rounded-xl p-0"
			>
				<div
					id={listboxId}
					role="listbox"
					aria-label="Результаты поиска"
					className="max-h-[min(70vh,28rem)] overflow-y-auto p-1.5"
				>
					{hasMinLength && totalMatches === 0 ? (
						<div className="px-2.5 py-6 text-center text-sm text-muted-foreground">Ничего не найдено</div>
					) : (
						groups.map((group) => {
							const isExpanded = expanded.has(group.group);
							const visible = isExpanded ? group.results : group.results.slice(0, PER_GROUP_CAP);
							const overflow = group.results.length - visible.length;
							return (
								<div key={group.group} className="py-1 first:pt-0 last:pb-0">
									<div className="px-2.5 py-1 text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">
										{GROUP_LABELS[group.group]}
									</div>
									{visible.map((row) => {
										const activeRow = visibleRows[clampedActive];
										const active = activeRow?.id === row.id && activeRow?.group === row.group;
										return (
											<ResultRow
												key={`${row.group}-${row.id}`}
												id={rowId(listboxId, row)}
												row={row}
												query={debouncedQuery.trim()}
												active={active}
												onSelect={() => handleSelect(row)}
												onMouseEnter={() => {
													const idx = visibleRows.findIndex((r) => r.id === row.id && r.group === row.group);
													if (idx >= 0) setActiveIndex(idx);
												}}
											/>
										);
									})}
									{overflow > 0 && (
										<button
											type="button"
											onMouseDown={(e) => {
												e.preventDefault();
												toggleExpanded(group.group);
											}}
											className="ml-1 mt-0.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										>
											Показать всех (<span className="tabular-nums">{group.results.length}</span>)
										</button>
									)}
								</div>
							);
						})
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}

function rowId(listboxId: string, row: SearchResult): string {
	return `${listboxId}-${row.group}-${row.id}`;
}

function flattenVisible(groups: GroupResult[], expanded: Set<GlobalSearchGroup>): SearchResult[] {
	const out: SearchResult[] = [];
	for (const g of groups) {
		const visible = expanded.has(g.group) ? g.results : g.results.slice(0, PER_GROUP_CAP);
		out.push(...visible);
	}
	return out;
}

interface ResultRowProps {
	id: string;
	row: SearchResult;
	query: string;
	active: boolean;
	onSelect: () => void;
	onMouseEnter: () => void;
}

function ResultRow({ id, row, query, active, onSelect, onMouseEnter }: ResultRowProps) {
	const Icon = GROUP_ICON[row.group];
	const statusTag = row.group === "suppliers" ? SUPPLIER_SEARCH_STATUS_LABEL[row.status] : null;
	return (
		<button
			id={id}
			type="button"
			role="option"
			aria-selected={active}
			onMouseDown={(e) => {
				e.preventDefault();
				onSelect();
			}}
			onMouseEnter={onMouseEnter}
			className={cn(
				"flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
				active ? "bg-muted text-foreground" : "text-foreground hover:bg-muted/60",
			)}
		>
			<Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
			<span className="min-w-0 flex-1 truncate">{highlight(row.name, query)}</span>
			{row.meta && (
				<span className="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
					{row.group === "inboxes" && <Mail className="size-3 shrink-0" aria-hidden="true" />}
					<span className="truncate">{highlight(row.meta, query)}</span>
				</span>
			)}
			{statusTag && (
				<span className="shrink-0 rounded-sm bg-muted/60 px-1.5 py-0.5 text-[0.625rem] font-medium text-muted-foreground">
					{statusTag}
				</span>
			)}
		</button>
	);
}

function highlight(text: string, query: string): React.ReactNode {
	if (!query) return text;
	const lower = text.toLowerCase();
	const needle = query.toLowerCase();
	const idx = lower.indexOf(needle);
	if (idx < 0) return text;
	return (
		<>
			{text.slice(0, idx)}
			<mark className="bg-transparent font-semibold text-foreground">{text.slice(idx, idx + query.length)}</mark>
			{text.slice(idx + query.length)}
		</>
	);
}
