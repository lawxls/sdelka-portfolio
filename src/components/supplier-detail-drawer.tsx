import {
	AlertTriangle,
	ArrowUpRight,
	Bot,
	CheckCircle2,
	ClipboardList,
	Download,
	File,
	FileSpreadsheet,
	FileText,
	Globe,
	LoaderCircle,
	Mail,
	Mails,
	MapPin,
	Paperclip,
	Sparkles,
	User,
	XCircle,
} from "lucide-react";
import { useCallback } from "react";
import { ChatComposer } from "@/components/chat-composer";
import { DeliveryValue } from "@/components/supplier-value-displays";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type {
	MessageEvent,
	Supplier,
	SupplierChatMessage,
	SupplierDocument,
	SupplierQuote,
} from "@/data/supplier-types";
import { AGENT_EMAIL, COMPOSABLE_STATUSES, SUPPLIER_COMPANY_TYPE_LABELS } from "@/data/supplier-types";
import { formatQuotePaymentType } from "@/data/types";
import { useSendSupplierMessage, useSendSupplierRequest, useSupplierQuotes } from "@/data/use-suppliers";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
	formatCompactRuble,
	formatCurrency,
	formatDateTime,
	formatFileSize,
	formatLeadTime,
	formatPercent,
	formatShortDate,
	savingsClassName,
	stripProtocol,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export const SUPPLIER_DRAWER_TABS = ["info", "offers", "chat"] as const;
export type SupplierDrawerTab = (typeof SUPPLIER_DRAWER_TABS)[number];

interface SupplierDetailDrawerProps {
	supplier: Supplier | null;
	open: boolean;
	onClose: () => void;
	/** Active tab, url-driven. On desktop only `info`/`offers` take effect (chat is always visible). */
	activeTab?: SupplierDrawerTab;
	onTabChange?: (tab: SupplierDrawerTab) => void;
	/** Called when a quote card title is clicked — navigate to that item's drawer. */
	onNavigateToItem?: (itemId: string) => void;
}

function DocIcon({ type }: { type: string }) {
	switch (type) {
		case "pdf":
			return <FileText className="size-4 shrink-0 text-red-500" aria-hidden="true" />;
		case "xlsx":
		case "xls":
			return <FileSpreadsheet className="size-4 shrink-0 text-green-600" aria-hidden="true" />;
		default:
			return <File className="size-4 shrink-0 text-blue-500" aria-hidden="true" />;
	}
}

function ProfileSection({ supplier }: { supplier: Supplier }) {
	const rows: { label: string; value: React.ReactNode }[] = [
		{ label: "ИНН", value: <span className="tabular-nums">{supplier.inn}</span> },
		{ label: "Тип", value: SUPPLIER_COMPANY_TYPE_LABELS[supplier.companyType] },
		{ label: "Регион", value: supplier.region },
		{ label: "Выручка", value: <span className="tabular-nums">{formatCompactRuble(supplier.revenue)}</span> },
		{
			label: "Год основания компании",
			value: <span className="tabular-nums">{supplier.foundedYear}</span>,
		},
	];
	return (
		<section>
			<h3 className="mb-3 text-sm font-semibold">О компании</h3>
			<div className="overflow-hidden rounded-lg border bg-card">
				<dl className="divide-y">
					{rows.map(({ label, value }) => (
						<div key={label} className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-2.5 text-sm">
							<dt className="text-muted-foreground">{label}</dt>
							<dd className="text-right">{value}</dd>
						</div>
					))}
				</dl>
			</div>
		</section>
	);
}

function ContactInfoSection({ supplier }: { supplier: Supplier }) {
	return (
		<section>
			<h3 className="mb-2 text-sm font-semibold">Контактная информация</h3>
			<div className="flex flex-col gap-1.5 text-sm">
				<div className="flex items-start gap-2">
					<MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					<address className="not-italic leading-snug">
						<div className="tabular-nums text-muted-foreground">{supplier.postalCode}, Россия</div>
						<div>{supplier.region}</div>
						<div>{supplier.address}</div>
					</address>
				</div>
				<div className="flex items-center gap-2">
					<Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					<a
						href={supplier.website}
						target="_blank"
						rel="noopener noreferrer"
						className="text-foreground underline decoration-muted-foreground/60 underline-offset-4 hover:decoration-foreground"
					>
						{stripProtocol(supplier.website)}
					</a>
				</div>
				<div className="flex items-center gap-2">
					<Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					<a
						href={`mailto:${supplier.email}`}
						className="text-foreground underline decoration-muted-foreground/60 underline-offset-4 hover:decoration-foreground"
					>
						{supplier.email}
					</a>
				</div>
			</div>
		</section>
	);
}

function AgentCommentSection({ comment }: { comment: string }) {
	if (!comment.trim()) return null;
	return (
		<section>
			<h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
				<Sparkles className="size-4 text-muted-foreground" aria-hidden="true" />
				Комментарий агента
			</h3>
			<div className="whitespace-pre-wrap text-pretty rounded-md bg-blue-50 p-3 text-sm dark:bg-blue-950/40">
				{comment}
			</div>
		</section>
	);
}

function DocumentsSection({ documents, title }: { documents: SupplierDocument[]; title: string }) {
	if (documents.length === 0) return null;
	return (
		<section>
			<h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
				<Paperclip className="size-4 text-muted-foreground" aria-hidden="true" />
				{title}
			</h3>
			<div className="flex flex-col gap-2">
				{documents.map((doc) => (
					<div key={doc.name} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
						<DocIcon type={doc.type} />
						<span className="flex-1 truncate">{doc.name}</span>
						<span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatFileSize(doc.size)}</span>
						<Download className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					</div>
				))}
			</div>
		</section>
	);
}

function InfoPanel({ supplier }: { supplier: Supplier }) {
	return (
		<div className="space-y-6 p-4">
			<ProfileSection supplier={supplier} />
			<ContactInfoSection supplier={supplier} />
			<AgentCommentSection comment={supplier.agentComment} />
			<DocumentsSection documents={supplier.documents} title="Документы из диалога" />
		</div>
	);
}

const MICRO_LABEL = "text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground";

function QuoteMetric({
	label,
	valueClassName,
	children,
}: {
	label: string;
	valueClassName?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<dt className={MICRO_LABEL}>{label}</dt>
			<dd className={cn("truncate text-sm text-foreground", valueClassName)}>{children}</dd>
		</div>
	);
}

function QuoteCard({ quote, onNavigateToItem }: { quote: SupplierQuote; onNavigateToItem?: (itemId: string) => void }) {
	const canNavigate = !!onNavigateToItem;
	const paymentText = formatQuotePaymentType(quote.paymentType, quote.deferralDays, quote.prepaymentPercent);
	return (
		<article
			data-testid={`offer-card-${quote.itemId}`}
			className={cn(
				"group overflow-hidden rounded-xl border bg-card transition-[border-color,box-shadow] duration-200 ease-out",
				quote.isCurrentSupplier
					? "border-foreground/30 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]"
					: "border-border hover:border-foreground/20 hover:shadow-[0_1px_2px_rgba(0,0,0,0.03),0_4px_12px_-6px_rgba(0,0,0,0.05)]",
			)}
		>
			<div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
				<div className="min-w-0 flex-1">
					{canNavigate ? (
						<button
							type="button"
							data-testid={`offer-card-title-${quote.itemId}`}
							onClick={() => onNavigateToItem?.(quote.itemId)}
							className="group/title inline-flex max-w-full items-center gap-1.5 text-left focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						>
							<span className="truncate text-base font-semibold leading-snug text-foreground transition-colors group-hover/title:text-primary">
								{quote.itemName}
							</span>
							<ArrowUpRight
								aria-hidden="true"
								className="size-3.5 shrink-0 text-muted-foreground transition-[transform,color] duration-200 ease-out group-hover/title:-translate-y-0.5 group-hover/title:translate-x-0.5 group-hover/title:text-primary motion-reduce:transition-none motion-reduce:group-hover/title:translate-x-0 motion-reduce:group-hover/title:translate-y-0"
							/>
						</button>
					) : (
						<span className="block max-w-full truncate text-base font-semibold leading-snug">{quote.itemName}</span>
					)}
					{quote.quoteReceivedAt && (
						<p className="mt-1 text-xs text-muted-foreground tabular-nums">
							Получено <time dateTime={quote.quoteReceivedAt}>{formatShortDate(quote.quoteReceivedAt)}</time>
						</p>
					)}
				</div>
				{quote.isCurrentSupplier && (
					<span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-foreground/15 bg-background px-2 py-0.5 text-[11px] font-medium text-foreground">
						<span className="size-1.5 rounded-full bg-status-highlight" aria-hidden="true" />
						Текущий
					</span>
				)}
			</div>

			<div className="flex items-end justify-between gap-6 px-5 pb-4">
				<div className="min-w-0">
					<div className="truncate font-heading text-2xl font-semibold leading-none tracking-tight tabular-nums text-foreground">
						{formatCurrency(quote.tco)}
					</div>
					<div className={cn("mt-1.5", MICRO_LABEL)}>TCO / ед.</div>
				</div>
				<div className="min-w-0 text-right">
					<div className="truncate font-heading text-lg font-medium leading-none tracking-tight tabular-nums text-foreground">
						{formatCurrency(quote.pricePerUnit)}
					</div>
					<div className={cn("mt-1.5", MICRO_LABEL)}>Цена / ед.</div>
				</div>
			</div>

			<dl className="grid grid-cols-3 gap-x-4 gap-y-3 border-t border-border/70 bg-muted/10 px-5 py-3">
				<QuoteMetric label="Стоимость" valueClassName="tabular-nums">
					{formatCurrency(quote.batchCost)}
				</QuoteMetric>
				<QuoteMetric label="Экономия %" valueClassName={cn("tabular-nums", savingsClassName(quote.savingsPct))}>
					{formatPercent(quote.savingsPct)}
				</QuoteMetric>
				<QuoteMetric label="Экономия ₽" valueClassName={cn("tabular-nums", savingsClassName(quote.savingsRub))}>
					{formatCurrency(quote.savingsRub)}
				</QuoteMetric>
				<QuoteMetric label="Доставка">
					<DeliveryValue cost={quote.deliveryCost} />
				</QuoteMetric>
				<QuoteMetric label="Тип оплаты" valueClassName="whitespace-normal">
					<span>{paymentText}</span>
				</QuoteMetric>
				<QuoteMetric label="Срок доставки" valueClassName="tabular-nums">
					{formatLeadTime(quote.leadTimeDays)}
				</QuoteMetric>
			</dl>

			{quote.documents.length > 0 && (
				<div className="flex flex-wrap gap-1.5 border-t border-border/70 px-5 py-3">
					{quote.documents.map((doc) => (
						<span
							key={doc.name}
							className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background px-2 py-1 text-xs transition-colors hover:border-foreground/30"
						>
							<DocIcon type={doc.type} />
							<span className="max-w-40 truncate">{doc.name}</span>
							<span className="tabular-nums text-muted-foreground">{formatFileSize(doc.size)}</span>
						</span>
					))}
				</div>
			)}
		</article>
	);
}

function OffersPanel({
	supplier,
	onNavigateToItem,
}: {
	supplier: Supplier;
	onNavigateToItem?: (itemId: string) => void;
}) {
	const { data, isLoading } = useSupplierQuotes(supplier.inn, supplier.itemId);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-6" data-testid="offers-loading">
				<LoaderCircle className="size-5 animate-spin text-muted-foreground" aria-label="Загрузка" />
			</div>
		);
	}

	const quotes = data ?? [];
	if (quotes.length === 0) {
		return (
			<div className="p-6 text-center text-sm text-muted-foreground" data-testid="offers-empty">
				Пока нет коммерческих предложений
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3 p-4" data-testid="offers-list">
			{quotes.map((q) => (
				<QuoteCard key={q.itemId} quote={q} onNavigateToItem={onNavigateToItem} />
			))}
		</div>
	);
}

interface EventBadgeSpec {
	label: string;
	className: string;
	Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

const EVENT_BADGE: Record<MessageEvent, EventBadgeSpec> = {
	task_created: {
		label: "Создана задача",
		className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
		Icon: ClipboardList,
	},
	quote_received: {
		label: "Получено КП",
		className: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
		Icon: CheckCircle2,
	},
	refusal: {
		label: "Отказ",
		className: "bg-destructive/10 text-destructive",
		Icon: XCircle,
	},
	delivery_failed: {
		label: "Ошибка доставки",
		className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
		Icon: AlertTriangle,
	},
};

function EventBadges({ events }: { events: MessageEvent[] }) {
	if (events.length === 0) return null;
	return (
		<div className="flex shrink-0 flex-wrap justify-end gap-1.5">
			{events.map((event) => {
				const { Icon, className, label } = EVENT_BADGE[event];
				return (
					<span
						key={event}
						className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", className)}
						data-testid={`msg-event-${event}`}
					>
						<Icon className="size-3" aria-hidden={true} />
						{label}
					</span>
				);
			})}
		</div>
	);
}

function resolveSenderEmail(msg: SupplierChatMessage, supplierEmail: string): string {
	if (msg.senderEmail) return msg.senderEmail;
	return msg.isOurs ? AGENT_EMAIL : supplierEmail;
}

function EmailThread({
	supplier,
	lastMessageRef,
}: {
	supplier: Supplier;
	lastMessageRef?: React.RefCallback<HTMLElement>;
}) {
	if (supplier.chatHistory.length === 0) return null;
	return (
		<div>
			{supplier.chatHistory.map((msg, i) => {
				const senderEmail = resolveSenderEmail(msg, supplier.email);
				const showBadges = !!(msg.events && msg.events.length > 0);
				return (
					<article
						key={`${msg.timestamp}-${msg.sender}`}
						ref={i === supplier.chatHistory.length - 1 ? lastMessageRef : undefined}
						data-email-msg={msg.isOurs ? "ours" : "theirs"}
						className="px-4 py-3 text-sm even:bg-muted/70"
					>
						<header className="mb-1.5 flex items-start justify-between gap-3 text-xs text-muted-foreground">
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-1.5">
									{msg.isOurs ? (
										<Bot className="size-3 shrink-0" aria-hidden="true" />
									) : (
										<User className="size-3 shrink-0" aria-hidden="true" />
									)}
									<span className="truncate font-medium text-foreground">{msg.sender}</span>
									<span className="truncate">{senderEmail}</span>
								</div>
								<time dateTime={msg.timestamp} className="mt-0.5 block tabular-nums">
									{formatDateTime(msg.timestamp)}
								</time>
							</div>
							{showBadges && msg.events && <EventBadges events={msg.events} />}
						</header>
						<div className="whitespace-pre-wrap text-pretty">{msg.body}</div>
						{msg.attachments && msg.attachments.length > 0 && (
							<div className="mt-2 flex flex-wrap gap-1.5">
								{msg.attachments.map((att) => (
									<div
										key={att.name}
										data-testid="msg-attachment"
										className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs"
									>
										<DocIcon type={att.type} />
										<span className="max-w-32 truncate">{att.name}</span>
										<span className="tabular-nums text-muted-foreground">{formatFileSize(att.size)}</span>
									</div>
								))}
							</div>
						)}
					</article>
				);
			})}
		</div>
	);
}

function CandidatePrompt({ onSendRequest, isPending }: { onSendRequest: () => void; isPending: boolean }) {
	return (
		<div
			data-testid="candidate-chat-prompt"
			className="flex w-full max-w-[22rem] flex-col items-center gap-3 rounded-lg border border-dashed bg-muted/30 p-6 text-center"
		>
			<p className="text-balance text-sm text-muted-foreground">Запросите КП, чтобы начать общение с поставщиком</p>
			<Button
				type="button"
				size="sm"
				variant="outline"
				onClick={onSendRequest}
				disabled={isPending}
				data-testid="candidate-send-request"
			>
				<Mails data-icon="inline-start" aria-hidden="true" />
				Отправить запрос
			</Button>
		</div>
	);
}

function ChatPanel({
	supplier,
	scrollToLatest,
}: {
	supplier: Supplier;
	scrollToLatest: React.RefCallback<HTMLElement>;
}) {
	const sendMutation = useSendSupplierMessage(supplier.itemId, supplier.id);
	const sendRequestMutation = useSendSupplierRequest();
	const isCandidate = supplier.status === "new";
	const isError = supplier.status === "ошибка";
	// Candidates and «ошибка» rows keep a disabled composer so the thread still
	// shows where messages will land once the request is (re)sent.
	const showComposer = COMPOSABLE_STATUSES.has(supplier.status) || isCandidate || isError;
	const composerError = isError
		? "Доставка невозможна. Проверьте email поставщика."
		: (sendMutation.error?.message ?? null);

	function handleSendRequest() {
		sendRequestMutation.mutate({ itemId: supplier.itemId, supplierIds: [supplier.id] });
	}

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<div
				className={cn(
					"scrollbar-hover flex-1 overflow-y-auto",
					isCandidate ? "flex items-center justify-center p-4" : "py-2",
				)}
			>
				{isCandidate ? (
					<CandidatePrompt onSendRequest={handleSendRequest} isPending={sendRequestMutation.isPending} />
				) : (
					<EmailThread supplier={supplier} lastMessageRef={scrollToLatest} />
				)}
			</div>
			{showComposer && (
				<div className="px-4 pb-4">
					<ChatComposer
						onSend={(body, files) => sendMutation.mutateAsync({ body, files })}
						isPending={sendMutation.isPending}
						disabled={isCandidate || isError}
						error={composerError}
					/>
				</div>
			)}
		</div>
	);
}

const INFO_TAB = { key: "info", label: "Информация" } as const;
const OFFERS_TAB = { key: "offers", label: "Предложения" } as const;
const CHAT_TAB = { key: "chat", label: "Переписка" } as const;

// Column-header layout — shared between the left tab strip and the right «Переписка»
// heading so both columns line up exactly at the bottom border.
const COLUMN_HEADER_STRIP = "flex shrink-0 items-stretch border-b border-border px-4";
// Each "cell" inside the strip (tab button or static heading) carries a transparent
// 2px bottom border by default so that switching to the active primary color on a
// tab doesn't shift the baseline. The right column's heading keeps the transparent
// border to stay the exact same height.
const COLUMN_HEADER_CELL =
	"inline-flex items-center whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-sm";

function TabStrip({
	tabs,
	activeTab,
	onChange,
}: {
	tabs: readonly { key: SupplierDrawerTab; label: string }[];
	activeTab: SupplierDrawerTab;
	onChange: (tab: SupplierDrawerTab) => void;
}) {
	return (
		<div className={cn(COLUMN_HEADER_STRIP, "overflow-x-auto")} role="tablist">
			{tabs.map((tab) => (
				<button
					key={tab.key}
					type="button"
					role="tab"
					aria-selected={activeTab === tab.key}
					className={cn(
						COLUMN_HEADER_CELL,
						"font-medium transition-colors",
						"focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
						activeTab === tab.key ? "border-primary text-foreground" : "text-muted-foreground hover:text-foreground",
					)}
					onClick={() => onChange(tab.key)}
				>
					{tab.label}
				</button>
			))}
		</div>
	);
}

function ColumnHeading({ children }: { children: React.ReactNode }) {
	// Same outer strip + vertical rhythm as the left-column TabStrip so the bottom
	// border lines up across columns, but without the `px-3` a tab button needs —
	// a static heading reads more anchored when it sits flush with the column's
	// outer padding instead of indented like an inactive tab.
	return (
		<div className={COLUMN_HEADER_STRIP}>
			<h2 className="inline-flex items-center whitespace-nowrap border-b-2 border-transparent py-2.5 text-sm font-semibold">
				{children}
			</h2>
		</div>
	);
}

function SupplierDrawerContent({
	supplier,
	isMobile,
	activeTab,
	onTabChange,
	onNavigateToItem,
}: {
	supplier: Supplier;
	isMobile: boolean;
	activeTab: SupplierDrawerTab;
	onTabChange: (tab: SupplierDrawerTab) => void;
	onNavigateToItem?: (itemId: string) => void;
}) {
	const scrollToLatest = useCallback((el: HTMLElement | null) => {
		el?.scrollIntoView({ block: "end" });
	}, []);

	// Desktop ignores the "chat" tab value (chat is always visible) — fall back to info.
	const desktopActiveTab: "info" | "offers" = activeTab === "offers" ? "offers" : "info";

	const desktopTabs = [INFO_TAB, OFFERS_TAB] as const;
	const mobileTabs = [INFO_TAB, OFFERS_TAB, CHAT_TAB] as const;

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<SheetHeader className="border-b pb-4">
				<SheetTitle className="text-balance">{supplier.companyName}</SheetTitle>
				<SheetDescription className="sr-only">Детали поставщика</SheetDescription>
			</SheetHeader>

			{isMobile ? (
				<>
					<TabStrip tabs={mobileTabs} activeTab={activeTab} onChange={onTabChange} />
					<div className="min-h-0 flex-1 overflow-y-auto">
						{activeTab === "info" && <InfoPanel supplier={supplier} />}
						{activeTab === "offers" && <OffersPanel supplier={supplier} onNavigateToItem={onNavigateToItem} />}
						{activeTab === "chat" && <ChatPanel supplier={supplier} scrollToLatest={scrollToLatest} />}
					</div>
				</>
			) : (
				<div data-testid="supplier-columns" className="grid min-h-0 flex-1 grid-cols-2">
					<div data-testid="supplier-info-column" className="flex min-h-0 flex-col overflow-hidden border-r">
						<TabStrip tabs={desktopTabs} activeTab={desktopActiveTab} onChange={onTabChange} />
						<div className="min-h-0 flex-1 overflow-y-auto">
							{desktopActiveTab === "info" ? (
								<InfoPanel supplier={supplier} />
							) : (
								<OffersPanel supplier={supplier} onNavigateToItem={onNavigateToItem} />
							)}
						</div>
					</div>
					<div data-testid="supplier-email-column" className="flex min-h-0 flex-col overflow-hidden">
						<ColumnHeading>Переписка</ColumnHeading>
						<div className="min-h-0 flex-1">
							<ChatPanel supplier={supplier} scrollToLatest={scrollToLatest} />
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export function SupplierDetailDrawer({
	supplier,
	open,
	onClose,
	activeTab = "info",
	onTabChange,
	onNavigateToItem,
}: SupplierDetailDrawerProps) {
	const isMobile = useIsMobile();
	const handleTabChange = onTabChange ?? (() => {});

	return (
		<Sheet
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) onClose();
			}}
		>
			<SheetContent side={isMobile ? "bottom" : "right"} size={isMobile ? "full" : "xl"}>
				{supplier && (
					<SupplierDrawerContent
						key={supplier.id}
						supplier={supplier}
						isMobile={isMobile}
						activeTab={activeTab}
						onTabChange={handleTabChange}
						onNavigateToItem={onNavigateToItem}
					/>
				)}
			</SheetContent>
		</Sheet>
	);
}
