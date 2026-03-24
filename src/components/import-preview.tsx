import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { NewItemInput } from "@/data/types";
import { ImportItemCard } from "./import-item-card";

const PAGE_SIZE = 10;

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
	const [page, setPage] = useState(0);
	const totalPages = Math.ceil(items.length / PAGE_SIZE);
	const start = page * PAGE_SIZE;
	const end = Math.min(start + PAGE_SIZE, items.length);
	const pageItems = items.slice(start, end);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 overflow-y-auto max-h-[60vh]">
				{pageItems.map((item, i) => {
					const globalIndex = start + i;
					return <ImportItemCard key={`${globalIndex}-${item.name}`} item={item} index={globalIndex} />;
				})}
			</div>

			<div className="flex items-center justify-center gap-2">
				<Button
					variant="outline"
					size="icon"
					onClick={() => setPage((p) => p - 1)}
					disabled={page === 0}
					aria-label="Предыдущая страница"
				>
					<ChevronLeft className="size-4" aria-hidden="true" />
				</Button>
				<span className="text-sm text-muted-foreground tabular-nums">
					Позиция {start + 1}–{end} из {items.length}
				</span>
				<Button
					variant="outline"
					size="icon"
					onClick={() => setPage((p) => p + 1)}
					disabled={page >= totalPages - 1}
					aria-label="Следующая страница"
				>
					<ChevronRight className="size-4" aria-hidden="true" />
				</Button>
			</div>

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
