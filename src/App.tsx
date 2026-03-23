import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { AddPositionsDrawer } from "@/components/add-positions-drawer";
import { FolderSidebar } from "@/components/folder-sidebar";
import { ProcurementTable } from "@/components/procurement-table";
import { SummaryPanel } from "@/components/summary-panel";
import { Toolbar } from "@/components/toolbar";
import type {
	DeviationFilter,
	FilterState,
	NewItemInput,
	ProcurementItem,
	SortField,
	SortState,
	StatusFilter,
} from "@/data/types";
import {
	nextUnusedColor,
	useCreateFolder,
	useDeleteFolder,
	useFolderStats,
	useFolders,
	useUpdateFolder,
} from "@/data/use-folders";
import { useAssignFolder, useCreateItems, useDeleteItem, useItems, useTotals, useUpdateItem } from "@/data/use-items";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { anchorDragOverlayToCursor } from "@/lib/drag-overlay";

const DRAG_OVERLAY_MODIFIERS = [anchorDragOverlayToCursor];

const SORT_FIELDS = new Set<string>([
	"annualCost",
	"currentPrice",
	"bestPrice",
	"averagePrice",
	"deviation",
	"overpayment",
]);

function parseSort(params: URLSearchParams): SortState | null {
	const field = params.get("sort");
	const dir = params.get("dir");
	if (!field || !SORT_FIELDS.has(field) || (dir !== "asc" && dir !== "desc")) return null;
	return { field: field as SortField, direction: dir };
}

function parseDeviation(params: URLSearchParams): DeviationFilter {
	const v = params.get("deviation");
	return v === "overpaying" || v === "saving" ? v : "all";
}

function parseStatus(params: URLSearchParams): StatusFilter {
	const v = params.get("status");
	return v === "searching" || v === "negotiating" || v === "completed" ? v : "all";
}

export function DragItemOverlay({ item }: { item: ProcurementItem }) {
	return (
		<div
			className="inline-flex items-center rounded-md bg-background px-3 py-2 text-sm font-medium shadow-lg ring-1 ring-border"
			data-testid="drag-overlay"
		>
			{item.name}
		</div>
	);
}

function App() {
	const [searchParams, setSearchParams] = useSearchParams();

	const search = searchParams.get("q") ?? "";
	const filters: FilterState = {
		deviation: parseDeviation(searchParams),
		status: parseStatus(searchParams),
	};
	const sort = parseSort(searchParams);
	const folder = searchParams.get("folder") ?? undefined;

	// Server-backed item hooks
	const {
		items,
		hasNextPage,
		loadMore,
		isLoading: itemsLoading,
		isFetchingNextPage,
		error: itemsError,
		refetch: refetchItems,
	} = useItems({ search, filters, sort, folder });

	const { data: totals, isLoading: totalsLoading } = useTotals({ search, filters, folder });

	// Server-backed folder hooks
	const { data: folders = [], isLoading: foldersLoading } = useFolders();
	const { data: counts = { all: 0, none: 0 }, isLoading: statsLoading } = useFolderStats();
	const createFolderMutation = useCreateFolder();
	const updateFolderMutation = useUpdateFolder();
	const deleteFolderMutation = useDeleteFolder();

	// Item mutation hooks
	const updateItemMutation = useUpdateItem();
	const deleteItemMutation = useDeleteItem();
	const assignFolderMutation = useAssignFolder();
	const createItemsMutation = useCreateItems();

	const isMobile = useIsMobile();
	const [drawerOpen, setDrawerOpen] = useState(false);

	function handleSearchChange(query: string) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				if (query) next.set("q", query);
				else next.delete("q");
				return next;
			},
			{ replace: true },
		);
	}

	function handleFiltersChange(newFilters: FilterState) {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			if (newFilters.deviation !== "all") next.set("deviation", newFilters.deviation);
			else next.delete("deviation");
			if (newFilters.status !== "all") next.set("status", newFilters.status);
			else next.delete("status");
			return next;
		});
	}

	function handleSort(field: SortField) {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			const currentField = next.get("sort");
			const currentDir = next.get("dir");
			if (currentField === field) {
				if (currentDir === "asc") {
					next.set("dir", "desc");
				} else {
					next.delete("sort");
					next.delete("dir");
				}
			} else {
				next.set("sort", field);
				next.set("dir", "asc");
			}
			return next;
		});
	}

	// Drag-and-drop
	const [reducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
	const [activeItem, setActiveItem] = useState<ProcurementItem | null>(null);
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
	);

	function handleDragStart(event: DragStartEvent) {
		const item = items.find((i) => i.id === event.active.id);
		setActiveItem(item ?? null);
	}

	function handleDragEnd(event: DragEndEvent) {
		setActiveItem(null);
		if (!event.over) return;
		const itemId = String(event.active.id);
		const targetId = String(event.over.id);
		if (targetId === "none") {
			assignFolderMutation.mutate({ id: itemId, folderId: null });
		} else if (targetId.startsWith("folder-drop-")) {
			const folderId = targetId.replace("folder-drop-", "");
			assignFolderMutation.mutate({ id: itemId, folderId });
		}
	}

	function handleCreateItems(items: NewItemInput[]) {
		createItemsMutation.mutate(items, {
			onSuccess: (data) => {
				if (data.isAsync) {
					toast.info("Позиции обрабатываются");
				}
			},
		});
	}

	function handleFolderSelect(folderId: string | undefined) {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			if (folderId != null) next.set("folder", folderId);
			else next.delete("folder");
			return next;
		});
	}

	return (
		<DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
			<div className="flex h-svh flex-col bg-background text-foreground">
				<header className="z-30 flex shrink-0 items-center justify-between gap-md border-b border-border bg-background px-lg py-sm">
					<h1 className="hidden text-lg tracking-tight whitespace-nowrap md:block">Ваши закупки</h1>
					<Toolbar
						defaultSearch={search}
						onSearchChange={handleSearchChange}
						filters={filters}
						onFiltersChange={handleFiltersChange}
						sort={sort}
						onSort={handleSort}
						onAddPositions={() => setDrawerOpen(true)}
					/>
				</header>

				<div className="flex min-h-0 flex-1">
					<FolderSidebar
						folders={folders}
						counts={counts}
						activeFolder={folder}
						isLoading={foldersLoading || statsLoading}
						onFolderSelect={handleFolderSelect}
						onCreateFolder={(name) => createFolderMutation.mutate({ name, color: nextUnusedColor(folders) })}
						onRenameFolder={(id, name) => updateFolderMutation.mutate({ id, name })}
						onRecolorFolder={(id, color) => updateFolderMutation.mutate({ id, color })}
						onDeleteFolder={(id) => deleteFolderMutation.mutate(id)}
					/>
					<main className="flex min-h-0 flex-1 flex-col bg-muted/50">
						<ProcurementTable
							items={items}
							folders={folders}
							sort={sort}
							hasNextPage={hasNextPage}
							loadMore={loadMore}
							onSort={handleSort}
							onRenameItem={(id, name) => updateItemMutation.mutate({ id, name })}
							onDeleteItem={(id) => deleteItemMutation.mutate(id)}
							onAssignFolder={(itemId, folderId) => assignFolderMutation.mutate({ id: itemId, folderId })}
							draggable={!isMobile}
							activeItemId={activeItem?.id}
							isLoading={itemsLoading}
							isFetchingNextPage={isFetchingNextPage}
							error={itemsError}
							onRetry={() => refetchItems()}
							isMobile={isMobile}
						/>
					</main>
				</div>

				<footer className="z-30 shrink-0 border-t border-border bg-background px-lg py-md">
					<SummaryPanel totals={totals} isLoading={totalsLoading} />
				</footer>
			</div>

			<DragOverlay dropAnimation={reducedMotion ? null : undefined} modifiers={DRAG_OVERLAY_MODIFIERS}>
				{activeItem ? <DragItemOverlay item={activeItem} /> : null}
			</DragOverlay>
			<div data-testid="dnd-overlay-container" aria-hidden="true" />

			<AddPositionsDrawer open={drawerOpen} onOpenChange={setDrawerOpen} onSubmit={handleCreateItems} />
		</DndContext>
	);
}

export default App;
