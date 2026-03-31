import {
	Archive,
	Bot,
	Calculator,
	Download,
	File,
	FileSpreadsheet,
	FileText,
	Mail,
	Paperclip,
	Sparkles,
	User,
} from "lucide-react";
import { SupplierStatusIndicator } from "@/components/supplier-status-indicator";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Supplier, SupplierChatMessage, SupplierDocument } from "@/data/supplier-types";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { formatCurrency, formatDateTime, formatFileSize, pluralizeRu, stripProtocol } from "@/lib/format";

interface SupplierDetailDrawerProps {
	supplier: Supplier | null;
	open: boolean;
	onClose: () => void;
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
					<span className="tabular-nums">{formatCurrency(supplier.deliveryCost)}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground">Отсрочка</span>
					<span>{pluralizeRu(supplier.deferralDays, "день", "дня", "дней")}</span>
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

function EmailThread({ messages }: { messages: SupplierChatMessage[] }) {
	if (messages.length === 0) return null;
	return (
		<section className="rounded-lg border bg-muted/30 p-4">
			<h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium">
				<Mail className="size-4 text-muted-foreground" aria-hidden="true" />
				История общения
			</h3>
			<div className="flex flex-col gap-3">
				{messages.map((msg) => (
					<article
						key={`${msg.timestamp}-${msg.sender}`}
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
					</article>
				))}
			</div>
		</section>
	);
}

export function SupplierDetailDrawer({ supplier, open, onClose }: SupplierDetailDrawerProps) {
	const isMobile = useIsMobile();

	return (
		<Sheet
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) onClose();
			}}
		>
			<SheetContent side={isMobile ? "bottom" : "right"} className={isMobile ? "h-dvh" : ""}>
				{supplier && (
					<div className="flex h-full flex-col overflow-hidden">
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
							<SheetDescription>{supplier.address}</SheetDescription>
							<span className="text-sm text-muted-foreground">{stripProtocol(supplier.website)}</span>
						</SheetHeader>

						<div className="flex-1 space-y-6 overflow-y-auto p-4">
							<TcoSection supplier={supplier} />
							<AgentCommentSection description={supplier.aiDescription} recommendations={supplier.aiRecommendations} />
							<DocumentsSection documents={supplier.documents} />
							<EmailThread messages={supplier.chatHistory} />
						</div>
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}
