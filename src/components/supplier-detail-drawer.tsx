import { File, FileSpreadsheet, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Supplier, SupplierChatMessage, SupplierDocument } from "@/data/supplier-types";
import { SUPPLIER_STATUS_LABELS } from "@/data/supplier-types";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { formatCurrency, formatDateTime, formatFileSize, formatRating, pluralizeRu, stripProtocol } from "@/lib/format";

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

function CostSection({ supplier }: { supplier: Supplier }) {
	return (
		<section>
			<h3 className="mb-2 text-sm font-medium">Стоимость</h3>
			<div className="flex flex-col gap-1.5 text-sm">
				<div className="flex justify-between">
					<span className="text-muted-foreground">Цена за единицу</span>
					<span className="tabular-nums">{formatCurrency(supplier.pricePerUnit)}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground">Стоимость доставки</span>
					<span className="tabular-nums">{formatCurrency(supplier.deliveryCost)}</span>
				</div>
				<Separator />
				<div className="flex justify-between font-medium">
					<span>Итого TCO</span>
					<span className="tabular-nums">{formatCurrency(supplier.tco)}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground">Отсрочка</span>
					<span>{pluralizeRu(supplier.deferralDays, "день", "дня", "дней")}</span>
				</div>
			</div>
		</section>
	);
}

function RatingSection({ rating }: { rating: number | null }) {
	return (
		<section>
			<h3 className="mb-1 text-sm font-medium">Рейтинг</h3>
			<span className="text-2xl font-semibold tabular-nums">{formatRating(rating)}</span>
		</section>
	);
}

function AiCommentSection({ comment }: { comment: string }) {
	return (
		<section>
			<h3 className="mb-2 text-sm font-medium">AI-комментарий</h3>
			<div className="rounded-md bg-muted p-3 text-sm">{comment}</div>
		</section>
	);
}

function PositionOffersSection({ offers }: { offers: Supplier["positionOffers"] }) {
	if (offers.length === 0) return null;
	return (
		<section>
			<h3 className="mb-2 text-sm font-medium">Позиции предложения</h3>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Наименование</TableHead>
						<TableHead className="text-right">Кол-во</TableHead>
						<TableHead className="text-right">Цена/ед.</TableHead>
						<TableHead className="text-right">Сумма</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{offers.map((offer) => (
						<TableRow key={offer.name}>
							<TableCell>{offer.name}</TableCell>
							<TableCell className="text-right tabular-nums">{offer.quantity}</TableCell>
							<TableCell className="text-right tabular-nums">{formatCurrency(offer.pricePerUnit)}</TableCell>
							<TableCell className="text-right tabular-nums">{formatCurrency(offer.total)}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</section>
	);
}

function DocumentsSection({ documents }: { documents: SupplierDocument[] }) {
	if (documents.length === 0) return null;
	return (
		<section>
			<h3 className="mb-2 text-sm font-medium">Документы</h3>
			<div className="flex flex-col gap-2">
				{documents.map((doc) => (
					<div key={doc.name} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
						<DocIcon type={doc.type} />
						<span className="flex-1 truncate">{doc.name}</span>
						<span className="shrink-0 text-xs text-muted-foreground">{formatFileSize(doc.size)}</span>
					</div>
				))}
			</div>
		</section>
	);
}

function ChatSection({ messages }: { messages: SupplierChatMessage[] }) {
	if (messages.length === 0) return null;
	return (
		<section>
			<h3 className="mb-2 text-sm font-medium">Переписка</h3>
			<div className="flex flex-col gap-3">
				{messages.map((msg) => (
					<div
						key={`${msg.timestamp}-${msg.sender}`}
						data-chat-msg={msg.isOurs ? "ours" : "theirs"}
						className={`flex max-w-[85%] flex-col gap-1 rounded-lg p-3 text-sm ${
							msg.isOurs ? "ml-auto bg-primary/10" : "mr-auto bg-muted"
						}`}
					>
						<div className="flex items-baseline justify-between gap-2">
							<span className="text-xs font-medium">{msg.sender}</span>
							<span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(msg.timestamp)}</span>
						</div>
						<p>{msg.body}</p>
					</div>
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
						<SheetHeader>
							<SheetTitle>{supplier.companyName}</SheetTitle>
							<SheetDescription>{supplier.address}</SheetDescription>
							<div className="flex items-center gap-2">
								<Badge variant="outline">{SUPPLIER_STATUS_LABELS[supplier.status]}</Badge>
								<span className="text-sm text-muted-foreground">{stripProtocol(supplier.website)}</span>
							</div>
						</SheetHeader>

						<div className="flex-1 space-y-6 overflow-y-auto p-4">
							<CostSection supplier={supplier} />
							<RatingSection rating={supplier.rating} />
							<AiCommentSection comment={supplier.aiComment} />
							<PositionOffersSection offers={supplier.positionOffers} />
							<DocumentsSection documents={supplier.documents} />
							<ChatSection messages={supplier.chatHistory} />
						</div>
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}
