import {
	Archive,
	Bot,
	Calculator,
	Download,
	File,
	FileSpreadsheet,
	FileText,
	Globe,
	Mail,
	MapPin,
	Paperclip,
	Sparkles,
	User,
	UserCheck,
} from "lucide-react";
import { useCallback, useState } from "react";
import { ChatComposer } from "@/components/chat-composer";
import { SupplierStatusIndicator } from "@/components/supplier-status-indicator";
import { DeferralValue, DeliveryValue } from "@/components/supplier-value-displays";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Supplier, SupplierChatMessage, SupplierDocument } from "@/data/supplier-types";
import { COMPOSABLE_STATUSES } from "@/data/supplier-types";
import { useSendSupplierMessage } from "@/data/use-suppliers";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { formatCurrency, formatDateTime, formatFileSize, stripProtocol } from "@/lib/format";

interface SupplierDetailDrawerProps {
	supplier: Supplier | null;
	open: boolean;
	onClose: () => void;
	onSelectSupplier?: (supplierId: string, companyName: string) => void;
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

function TcoSection({ supplier }: { supplier: Supplier }) {
	return (
		<section>
			<h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
				<Calculator className="size-4 text-muted-foreground" aria-hidden="true" />
				Расчёт TCO (Total Cost of Ownership)
			</h3>
			<div className="flex flex-col gap-1.5 text-sm">
				<div className="flex justify-between">
					<span className="text-muted-foreground">Цена за ед.</span>
					<span className="tabular-nums">{formatCurrency(supplier.pricePerUnit)}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground">Доставка</span>
					<DeliveryValue cost={supplier.deliveryCost} />
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground">Отсрочка</span>
					<DeferralValue days={supplier.deferralDays} />
				</div>
				<Separator />
				<div className="flex justify-between font-medium">
					<span>TCO (итого)</span>
					<span className="tabular-nums">{formatCurrency(supplier.tco)}</span>
				</div>
			</div>
		</section>
	);
}

function AgentCommentSection({ description, recommendations }: { description: string; recommendations: string }) {
	return (
		<section>
			<h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
				<Sparkles className="size-4 text-muted-foreground" aria-hidden="true" />
				Комментарии агента
			</h3>
			<div className="flex flex-col gap-3">
				<div>
					<p className="mb-1 text-xs font-medium text-muted-foreground">Описание</p>
					<div className="rounded-md bg-blue-50 p-3 text-sm dark:bg-blue-950/40">{description}</div>
				</div>
				<div>
					<p className="mb-1 text-xs font-medium text-muted-foreground">Рекомендации</p>
					<div className="rounded-md bg-amber-50 p-3 text-sm dark:bg-amber-950/40">{recommendations}</div>
				</div>
			</div>
		</section>
	);
}

function DocumentsSection({ documents }: { documents: SupplierDocument[] }) {
	if (documents.length === 0) return null;
	return (
		<section>
			<h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
				<Paperclip className="size-4 text-muted-foreground" aria-hidden="true" />
				Документы из диалога
			</h3>
			<div className="flex flex-col gap-2">
				{documents.map((doc) => (
					<div key={doc.name} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
						<DocIcon type={doc.type} />
						<span className="flex-1 truncate">{doc.name}</span>
						<span className="shrink-0 text-xs text-muted-foreground">{formatFileSize(doc.size)}</span>
						<Download className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					</div>
				))}
			</div>
		</section>
	);
}

function ContactInfoSection({ supplier }: { supplier: Supplier }) {
	return (
		<section>
			<h3 className="mb-2 text-sm font-medium">Контактная информация</h3>
			<div className="flex flex-col gap-1.5 text-sm">
				<div className="flex items-start gap-2">
					<MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					<span>{supplier.address}</span>
				</div>
				<div className="flex items-center gap-2">
					<Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					<span>{stripProtocol(supplier.website)}</span>
				</div>
				<div className="flex items-center gap-2">
					<Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					<span>{supplier.email}</span>
				</div>
			</div>
		</section>
	);
}

function EmailThread({
	messages,
	lastMessageRef,
}: {
	messages: SupplierChatMessage[];
	lastMessageRef?: React.RefCallback<HTMLElement>;
}) {
	if (messages.length === 0) return null;
	return (
		<div className="flex flex-col gap-3">
			{messages.map((msg, i) => (
				<article
					key={`${msg.timestamp}-${msg.sender}`}
					ref={i === messages.length - 1 ? lastMessageRef : undefined}
					data-email-msg={msg.isOurs ? "ours" : "theirs"}
					className="rounded-md border bg-background text-sm"
				>
					<div className="flex flex-col gap-1 border-b px-3 py-2 text-xs text-muted-foreground">
						<div className="flex items-center gap-1.5">
							{msg.isOurs ? (
								<Bot className="size-3 shrink-0" aria-hidden="true" />
							) : (
								<User className="size-3 shrink-0" aria-hidden="true" />
							)}
							<span className="font-medium text-foreground">{msg.sender}</span>
						</div>
						<span>{formatDateTime(msg.timestamp)}</span>
					</div>
					<div className="px-3 py-2.5">{msg.body}</div>
					{msg.attachments && msg.attachments.length > 0 && (
						<div className="flex flex-wrap gap-1.5 border-t px-3 py-2">
							{msg.attachments.map((att) => (
								<div
									key={att.name}
									data-testid="msg-attachment"
									className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs"
								>
									<DocIcon type={att.type} />
									<span className="max-w-32 truncate">{att.name}</span>
									<span className="text-muted-foreground">{formatFileSize(att.size)}</span>
								</div>
							))}
						</div>
					)}
				</article>
			))}
		</div>
	);
}

type MobileTab = "info" | "email";

function InfoContent({ supplier }: { supplier: Supplier }) {
	return (
		<div className="space-y-6 p-4">
			<ContactInfoSection supplier={supplier} />
			<TcoSection supplier={supplier} />
			<AgentCommentSection description={supplier.aiDescription} recommendations={supplier.aiRecommendations} />
			<DocumentsSection documents={supplier.documents} />
		</div>
	);
}

function EmailContent({
	supplier,
	showComposer,
	scrollToLatest,
	sendMutation,
}: {
	supplier: Supplier;
	showComposer: boolean;
	scrollToLatest: React.RefCallback<HTMLElement>;
	sendMutation: ReturnType<typeof useSendSupplierMessage>;
}) {
	return (
		<div className="flex h-full flex-col overflow-hidden">
			<div className="flex-1 overflow-y-auto p-4">
				<h2 className="mb-3 text-sm font-semibold">История общения</h2>
				<EmailThread messages={supplier.chatHistory} lastMessageRef={scrollToLatest} />
			</div>
			{showComposer && (
				<div className="px-4 pb-4">
					<ChatComposer
						onSend={(body, files) => sendMutation.mutateAsync({ body, files })}
						isPending={sendMutation.isPending}
						error={sendMutation.error?.message ?? null}
					/>
				</div>
			)}
		</div>
	);
}

function SupplierDrawerContent({
	supplier,
	isMobile,
	onSelectSupplier,
}: {
	supplier: Supplier;
	isMobile: boolean;
	onSelectSupplier?: (supplierId: string, companyName: string) => void;
}) {
	const [mobileTab, setMobileTab] = useState<MobileTab>("info");
	const sendMutation = useSendSupplierMessage(supplier.itemId, supplier.id);
	const scrollToLatest = useCallback((el: HTMLElement | null) => {
		el?.scrollIntoView({ block: "end" });
	}, []);

	const showComposer = COMPOSABLE_STATUSES.has(supplier.status);

	return (
		<div className="flex h-full flex-col overflow-hidden">
			{supplier.status === "получено_кп" && onSelectSupplier && (
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon-sm"
							className="absolute top-3 right-[5.25rem]"
							aria-label="Выбрать поставщика"
							onClick={() => onSelectSupplier?.(supplier.id, supplier.companyName)}
						>
							<UserCheck aria-hidden="true" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Выбрать поставщика</TooltipContent>
				</Tooltip>
			)}
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="ghost" size="icon-sm" className="absolute top-3 right-12" aria-label="Архивировать">
						<Archive aria-hidden="true" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Архивировать</TooltipContent>
			</Tooltip>
			<SheetHeader className="border-b pb-4">
				<SheetTitle className="flex items-center gap-2">
					{supplier.companyName}
					<span className="text-muted-foreground" aria-hidden="true">
						·
					</span>
					<SupplierStatusIndicator status={supplier.status} className="text-xs" />
				</SheetTitle>
				<SheetDescription className="sr-only">Детали поставщика</SheetDescription>
			</SheetHeader>

			{isMobile ? (
				<>
					<div className="flex gap-0 overflow-x-auto border-b border-border px-4" role="tablist">
						{(
							[
								{ key: "info", label: "Информация" },
								{ key: "email", label: "Переписка" },
							] as const
						).map((tab) => (
							<button
								key={tab.key}
								type="button"
								role="tab"
								aria-selected={mobileTab === tab.key}
								className={`shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors ${
									mobileTab === tab.key
										? "border-b-2 border-primary text-foreground"
										: "text-muted-foreground hover:text-foreground"
								}`}
								onClick={() => setMobileTab(tab.key)}
							>
								{tab.label}
							</button>
						))}
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto">
						{mobileTab === "info" && <InfoContent supplier={supplier} />}
						{mobileTab === "email" && (
							<EmailContent
								supplier={supplier}
								showComposer={showComposer}
								scrollToLatest={scrollToLatest}
								sendMutation={sendMutation}
							/>
						)}
					</div>
				</>
			) : (
				<div data-testid="supplier-columns" className="grid min-h-0 flex-1 grid-cols-2">
					<div data-testid="supplier-info-column" className="flex flex-col overflow-hidden border-r">
						<h2 className="shrink-0 border-b px-4 py-3 text-sm font-semibold">Информация о поставщике</h2>
						<div className="space-y-6 overflow-y-auto p-4">
							<ContactInfoSection supplier={supplier} />
							<TcoSection supplier={supplier} />
							<AgentCommentSection description={supplier.aiDescription} recommendations={supplier.aiRecommendations} />
							<DocumentsSection documents={supplier.documents} />
						</div>
					</div>
					<div data-testid="supplier-email-column" className="flex flex-col overflow-hidden">
						<h2 className="shrink-0 border-b px-4 py-3 text-sm font-semibold">История общения</h2>
						<div className="flex-1 overflow-y-auto p-4">
							<EmailThread messages={supplier.chatHistory} lastMessageRef={scrollToLatest} />
						</div>
						{showComposer && (
							<div className="px-4 pb-4">
								<ChatComposer
									onSend={(body, files) => sendMutation.mutateAsync({ body, files })}
									isPending={sendMutation.isPending}
									error={sendMutation.error?.message ?? null}
								/>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

export function SupplierDetailDrawer({ supplier, open, onClose, onSelectSupplier }: SupplierDetailDrawerProps) {
	const isMobile = useIsMobile();

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
						onSelectSupplier={onSelectSupplier}
					/>
				)}
			</SheetContent>
		</Sheet>
	);
}
