import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { NewItemInput } from "@/data/types";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { ImportItemCard } from "./import-item-card";

const BATCH_SIZE = 20;

interface ImportPreviewProps {
	items: NewItemInput[];
	onBack: () => void;
	onImport: () => void;
}

function pluralPositions(count: number): string {
	const mod10 = count % 10;
	const mod100 = count % 100;
	if (mod10 === 1 && mod100 !== 11) return `${count} позицию`;
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} позиции`;
	return `${count} позиций`;
}

export function ImportPreview({ items, onBack, onImport }: ImportPreviewProps) {
	const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
	const visibleItems = items.slice(0, visibleCount);
	const hasMore = visibleCount < items.length;

	const sentinelRef = useIntersectionObserver(() => {
		setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, items.length));
	});

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
					? `Показано ${visibleCount >= items.length ? items.length : visibleCount} из ${items.length}`
					: `${pluralPositions(items.length)}`}
			</span>

			<div className="flex items-center justify-between border-t border-border pt-3">
				<Button variant="outline" onClick={onBack}>
					<ArrowLeft className="size-4" aria-hidden="true" />
					Назад
				</Button>
				<Button onClick={onImport}>Импортировать {pluralPositions(items.length)}</Button>
			</div>
		</div>
	);
}
