import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { PageToolbar } from "@/components/page-toolbar";
import { ProcurementStatusIcon, STATUS_CONFIG } from "@/components/procurement-card";
import { OffersTabPanel, SuppliersTabPanel } from "@/components/procurement-item-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { getTenderStatus } from "@/data/tenders/get-tender-status";
import type { Folder, ProcurementInquiry, ProcurementItem } from "@/data/types";
import { getAnnualCost } from "@/data/types";
import { useFolders } from "@/data/use-folders";
import { useAllItems } from "@/data/use-items";
import { useTender } from "@/data/use-tenders";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type TenderDetailTab = "suppliers" | "offers" | "tasks" | "details";

const TABS: { key: TenderDetailTab; label: string }[] = [
	{ key: "suppliers", label: "Поставщики" },
	{ key: "offers", label: "Предложения" },
	{ key: "tasks", label: "Задачи" },
	{ key: "details", label: "Информация" },
];

const DEFAULT_TAB: TenderDetailTab = "suppliers";
const VALID_TABS = new Set<string>(TABS.map((t) => t.key));

function parseTenderTab(param: string | null): TenderDetailTab {
	if (param && VALID_TABS.has(param)) return param as TenderDetailTab;
	return DEFAULT_TAB;
}

const dateFormatter = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

function formatDate(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return dateFormatter.format(d);
}

function FolderBadge({ folder }: { folder: Folder }) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium",
				`bg-folder-${folder.color}/15 text-folder-${folder.color}`,
			)}
		>
			{folder.name}
		</span>
	);
}

function totalTco(items: readonly ProcurementItem[]): number {
	return items.reduce((sum, i) => sum + getAnnualCost(i), 0);
}

export function TenderDetailPage() {
	const { slug = "" } = useParams<{ slug: string }>();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const activeTab = parseTenderTab(searchParams.get("tab"));

	const { data: tender, isLoading, isError } = useTender(slug);
	const { data: folders = [] } = useFolders();
	const { data: allItems = [] } = useAllItems();
	const items = useMemo(() => allItems.filter((i) => i.tenderId === slug), [allItems, slug]);

	function handleTabChange(tab: TenderDetailTab) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				if (tab === DEFAULT_TAB) {
					next.delete("tab");
				} else {
					next.set("tab", tab);
				}
				return next;
			},
			{ replace: true },
		);
	}

	if (isLoading) {
		return (
			<div className="flex h-full flex-1 flex-col overflow-hidden bg-background text-foreground">
				<PageToolbar
					left={
						<Link to="/tenders" aria-label="Назад к тендерам" className="text-muted-foreground hover:text-foreground">
							<ArrowLeft className="size-4" aria-hidden="true" />
						</Link>
					}
				/>
				<main className="flex flex-1 flex-col gap-4 p-6">
					<Skeleton className="h-6 w-64" data-testid="tender-detail-skeleton" />
					<Skeleton className="h-4 w-40" />
				</main>
			</div>
		);
	}

	if (isError || !tender) {
		return (
			<div className="flex h-full flex-1 flex-col overflow-hidden bg-background text-foreground">
				<PageToolbar
					left={
						<Link to="/tenders" aria-label="Назад к тендерам" className="text-muted-foreground hover:text-foreground">
							<ArrowLeft className="size-4" aria-hidden="true" />
						</Link>
					}
				/>
				<main
					className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
					data-testid="tender-not-found"
				>
					<p className="text-sm font-medium">Тендер не найден</p>
					<p className="text-sm text-muted-foreground">Возможно, ссылка устарела или тендер был удалён.</p>
				</main>
			</div>
		);
	}

	const folder = folders.find((f) => f.id === tender.folderId);
	const status = getTenderStatus(items);
	const statusCfg = STATUS_CONFIG[status];
	const isSingleItem = items.length === 1;
	const headlineLabel = isSingleItem ? "ТСО / ед." : "Итого ТСО";
	const headlineValue = isSingleItem ? formatCurrency(items[0].currentPrice) : formatCurrency(totalTco(items));

	return (
		<div className="flex h-full flex-1 flex-col overflow-hidden bg-background text-foreground">
			<PageToolbar
				left={
					<>
						<button
							type="button"
							aria-label="Назад к тендерам"
							className="inline-flex items-center text-muted-foreground hover:text-foreground"
							onClick={() => navigate("/tenders")}
						>
							<ArrowLeft className="size-4" aria-hidden="true" />
						</button>
						<span className="text-sm font-mono text-muted-foreground">{tender.id}</span>
						<span aria-hidden="true" className="text-sm leading-none text-border">
							/
						</span>
						<h1 className="text-sm font-semibold leading-none">{tender.name}</h1>
					</>
				}
			/>

			<header
				className="flex flex-col gap-2 border-b border-border bg-background px-lg py-4"
				data-testid="tender-detail-header"
			>
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
					<span className={cn("inline-flex items-center gap-1.5", statusCfg.className)}>
						<ProcurementStatusIcon status={status} iconClassName="size-3.5" />
						{statusCfg.label}
					</span>
					{folder && (
						<>
							<span className="select-none text-muted-foreground/50" aria-hidden="true">
								•
							</span>
							<FolderBadge folder={folder} />
						</>
					)}
					<span className="select-none text-muted-foreground/50" aria-hidden="true">
						•
					</span>
					<span className="text-muted-foreground tabular-nums">Дедлайн&nbsp;{formatDate(tender.deadline)}</span>
				</div>
				<div className="flex items-baseline gap-2" data-testid="tender-tco-headline">
					<span className="text-xs uppercase tracking-wide text-muted-foreground">{headlineLabel}</span>
					<span className="text-lg font-semibold tabular-nums">{headlineValue}</span>
				</div>
			</header>

			<div className="flex gap-0 overflow-x-auto border-b border-border px-lg" role="tablist">
				{TABS.map((tab) => {
					const isActive = activeTab === tab.key;
					return (
						<button
							key={tab.key}
							type="button"
							role="tab"
							aria-selected={isActive}
							aria-label={tab.label}
							className={cn(
								"inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors",
								"focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
								isActive ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground",
							)}
							onClick={() => handleTabChange(tab.key)}
						>
							{tab.label}
						</button>
					);
				})}
			</div>

			<main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-muted/50 p-4">
				{activeTab === "suppliers" && <TenderSuppliersTab items={items} />}
				{activeTab === "offers" && <TenderOffersTab items={items} />}
				{activeTab === "tasks" && <TenderTasksTab />}
				{activeTab === "details" && <TenderDetailsTab tender={tender} items={items} folder={folder} />}
			</main>
		</div>
	);
}

function ItemSectionHeader({ item }: { item: ProcurementItem }) {
	return (
		<div className="mb-2 mt-4 first:mt-0">
			<span className="text-xs uppercase tracking-wide text-muted-foreground">Позиция</span>{" "}
			<span className="text-sm font-medium">{item.name}</span>
		</div>
	);
}

function NoItemsHint({ tab }: { tab: "suppliers" | "offers" }) {
	const message =
		tab === "suppliers"
			? "В этом тендере пока нет позиций — поставщиков нет."
			: "В этом тендере пока нет позиций — предложений нет.";
	return <p className="py-8 text-center text-sm text-muted-foreground">{message}</p>;
}

function TenderSuppliersTab({ items }: { items: readonly ProcurementItem[] }) {
	if (items.length === 0) return <NoItemsHint tab="suppliers" />;
	return (
		<div data-testid="tender-tab-suppliers" className="flex flex-col gap-4">
			{items.map((item) => (
				<section key={item.id} className="flex flex-col">
					{items.length > 1 && <ItemSectionHeader item={item} />}
					<SuppliersTabPanel itemId={item.id} onSupplierClick={() => {}} />
				</section>
			))}
		</div>
	);
}

function TenderOffersTab({ items }: { items: readonly ProcurementItem[] }) {
	if (items.length === 0) return <NoItemsHint tab="offers" />;
	return (
		<div data-testid="tender-tab-offers" className="flex flex-col gap-4">
			{items.map((item) => (
				<section key={item.id} className="flex flex-col">
					{items.length > 1 && <ItemSectionHeader item={item} />}
					<OffersTabPanel itemId={item.id} onSupplierClick={() => {}} />
				</section>
			))}
		</div>
	);
}

function TenderTasksTab() {
	return (
		<div
			data-testid="tender-tab-tasks"
			className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center"
		>
			<p className="text-sm font-medium">Задачи появятся в следующем обновлении</p>
			<p className="text-sm text-muted-foreground">
				Сейчас задачи привязаны к позициям; миграция на тендер — в работе.
			</p>
		</div>
	);
}

function TenderDetailsTab({
	tender,
	items,
	folder,
}: {
	tender: ProcurementInquiry;
	items: readonly ProcurementItem[];
	folder?: Folder;
}) {
	return (
		<div data-testid="tender-tab-details" className="flex flex-col gap-6">
			<section className="rounded-lg border border-border bg-background p-4">
				<h2 className="mb-3 text-sm font-semibold">Основное</h2>
				<dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
					<div>
						<dt className="text-xs uppercase tracking-wide text-muted-foreground">Название</dt>
						<dd>{tender.name}</dd>
					</div>
					<div>
						<dt className="text-xs uppercase tracking-wide text-muted-foreground">Категория</dt>
						<dd>{folder?.name ?? "—"}</dd>
					</div>
					<div>
						<dt className="text-xs uppercase tracking-wide text-muted-foreground">Бюджет</dt>
						<dd className="tabular-nums">{formatCurrency(tender.budget)}</dd>
					</div>
					<div>
						<dt className="text-xs uppercase tracking-wide text-muted-foreground">Дедлайн</dt>
						<dd className="tabular-nums">{formatDate(tender.deadline)}</dd>
					</div>
					<div>
						<dt className="text-xs uppercase tracking-wide text-muted-foreground">Дата создания</dt>
						<dd className="tabular-nums">{formatDate(tender.createdAt)}</dd>
					</div>
				</dl>
			</section>

			<section className="rounded-lg border border-border bg-background p-4">
				<h2 className="mb-3 text-sm font-semibold">
					Позиции <span className="text-muted-foreground tabular-nums">({items.length})</span>
				</h2>
				{items.length === 0 ? (
					<p className="py-2 text-sm text-muted-foreground">Позиций пока нет.</p>
				) : (
					<ul className="flex flex-col divide-y divide-border" data-testid="tender-items-list">
						{items.map((item) => (
							<li
								key={item.id}
								data-testid={`tender-item-${item.id}`}
								className="flex items-center justify-between gap-3 py-2 text-sm"
							>
								<span>{item.name}</span>
								<span className="tabular-nums text-muted-foreground">{formatCurrency(getAnnualCost(item))}</span>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
