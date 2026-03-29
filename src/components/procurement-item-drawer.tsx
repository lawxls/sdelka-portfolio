import { useSearchParams } from "react-router";
import { SuppliersTable } from "@/components/suppliers-table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSuppliers } from "@/data/use-suppliers";
import { useIsMobile } from "@/hooks/use-is-mobile";

type ItemDrawerTab = "suppliers" | "analytics" | "details";

const TABS: { key: ItemDrawerTab; label: string }[] = [
	{ key: "suppliers", label: "Поставщики" },
	{ key: "analytics", label: "Аналитика" },
	{ key: "details", label: "Детальная информация" },
];

const VALID_TABS = new Set<string>(TABS.map((t) => t.key));

function parseItemDrawerTab(param: string | null): ItemDrawerTab {
	if (param && VALID_TABS.has(param)) return param as ItemDrawerTab;
	return "suppliers";
}

interface ProcurementItemDrawerProps {
	itemName?: string;
}

export function ProcurementItemDrawer({ itemName }: ProcurementItemDrawerProps) {
	const [searchParams, setSearchParams] = useSearchParams();
	const isMobile = useIsMobile();

	const itemId = searchParams.get("item");
	const activeTab = parseItemDrawerTab(searchParams.get("tab"));
	const open = itemId != null;

	function handleTabChange(tab: ItemDrawerTab) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				if (tab === "suppliers") {
					next.delete("tab");
				} else {
					next.set("tab", tab);
				}
				return next;
			},
			{ replace: true },
		);
	}

	function handleClose() {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.delete("item");
				next.delete("tab");
				next.delete("supplier");
				return next;
			},
			{ replace: false },
		);
	}

	return (
		<Sheet
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) handleClose();
			}}
		>
			<SheetContent side={isMobile ? "bottom" : "right"} className={isMobile ? "h-dvh" : "!w-2/3 !max-w-none"}>
				{itemId && (
					<ProcurementItemDrawerContent
						key={itemId}
						itemId={itemId}
						itemName={itemName}
						activeTab={activeTab}
						onTabChange={handleTabChange}
					/>
				)}
			</SheetContent>
		</Sheet>
	);
}

function SuppliersTabPanel({ itemId }: { itemId: string }) {
	const { data, isLoading } = useSuppliers(itemId);
	return (
		<div data-testid="tab-panel-suppliers">
			<SuppliersTable suppliers={data?.suppliers ?? []} isLoading={isLoading} />
		</div>
	);
}

function ProcurementItemDrawerContent({
	itemId,
	itemName,
	activeTab,
	onTabChange,
}: {
	itemId: string;
	itemName?: string;
	activeTab: ItemDrawerTab;
	onTabChange: (tab: ItemDrawerTab) => void;
}) {
	return (
		<div className="flex h-full flex-col overflow-hidden">
			<SheetHeader>
				<SheetTitle>{itemName ?? "Позиция"}</SheetTitle>
				<SheetDescription className="sr-only">Детали позиции закупки</SheetDescription>
			</SheetHeader>

			<div className="flex gap-0 border-b border-border px-4" role="tablist">
				{TABS.map((tab) => (
					<button
						key={tab.key}
						type="button"
						role="tab"
						aria-selected={activeTab === tab.key}
						className={`px-3 py-2 text-sm font-medium transition-colors ${
							activeTab === tab.key
								? "border-b-2 border-primary text-foreground"
								: "text-muted-foreground hover:text-foreground"
						}`}
						onClick={() => onTabChange(tab.key)}
					>
						{tab.label}
					</button>
				))}
			</div>

			<div className="flex-1 overflow-y-auto p-4">
				{activeTab === "suppliers" && <SuppliersTabPanel itemId={itemId} />}
				{activeTab === "analytics" && (
					<div data-testid="tab-panel-analytics" className="text-sm text-muted-foreground">
						Аналитика — скоро
					</div>
				)}
				{activeTab === "details" && (
					<div data-testid="tab-panel-details" className="text-sm text-muted-foreground">
						Детальная информация — скоро
					</div>
				)}
			</div>
		</div>
	);
}
