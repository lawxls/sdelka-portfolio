import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NewItemInput } from "@/data/types";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { pluralizeRu } from "@/lib/format";
import { ImportItemCard } from "./import-item-card";

const BATCH_SIZE = 20;

interface ImportPreviewProps {
	items: NewItemInput[];
	onBack: () => void;
	onImport: () => void;
}

export function ImportPreview({ items, onBack, onImport }: ImportPreviewProps) {
	const { visible: visibleItems, hasNextPage: hasMore, loadMore } = useClientPagination(items, BATCH_SIZE);
	const sentinelRef = useIntersectionObserver(loadMore);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 overflow-y-auto max-h-[60vh] pr-3 scrollbar-thin">
				{visibleItems.map((item, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: imported items have no unique ID; list is append-only
					<ImportItemCard key={`${i}-${item.name}`} item={item} index={i} />
				))}
				{hasMore && <div ref={sentinelRef} className="h-1 shrink-0" />}
			</div>

			<span className="text-center text-xs text-muted-foreground tabular-nums">
				{items.length > BATCH_SIZE
					? `Показано ${visibleItems.length} из ${items.length}`
					: `${pluralizeRu(items.length, "позицию", "позиции", "позиций")}`}
			</span>

			<div className="flex items-center justify-between border-t border-border pt-3">
				<Button variant="outline" onClick={onBack}>
					<ArrowLeft className="size-4" aria-hidden="true" />
					Назад
				</Button>
				<Button onClick={onImport}>Импортировать {pluralizeRu(items.length, "позицию", "позиции", "позиций")}</Button>
			</div>
		</div>
	);
}
