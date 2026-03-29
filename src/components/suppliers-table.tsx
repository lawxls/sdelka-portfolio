import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Supplier } from "@/data/supplier-types";
import { SUPPLIER_STATUS_LABELS } from "@/data/supplier-types";
import { formatCurrency } from "@/lib/format";

function formatRating(rating: number | null): string {
	if (rating == null) return "\u2014";
	return `${rating}%`;
}

function stripProtocol(url: string): string {
	return url.replace(/^https?:\/\//, "");
}

interface SuppliersTableProps {
	suppliers: Supplier[];
	isLoading: boolean;
}

export function SuppliersTable({ suppliers, isLoading }: SuppliersTableProps) {
	if (isLoading) {
		return (
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Компания</TableHead>
						<TableHead>Email</TableHead>
						<TableHead>Сайт</TableHead>
						<TableHead>Цена/ед.</TableHead>
						<TableHead>TCO</TableHead>
						<TableHead>Рейтинг</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{Array.from({ length: 5 }, (_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows never reorder
						<TableRow key={i}>
							{Array.from({ length: 6 }, (_, j) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton cells
								<TableCell key={j}>
									<Skeleton className="h-4 w-20" />
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		);
	}

	if (suppliers.length === 0) {
		return <p className="py-8 text-center text-sm text-muted-foreground">Нет поставщиков</p>;
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Компания</TableHead>
					<TableHead>Email</TableHead>
					<TableHead>Сайт</TableHead>
					<TableHead>Цена/ед.</TableHead>
					<TableHead>TCO</TableHead>
					<TableHead>Рейтинг</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{suppliers.map((supplier) => (
					<TableRow key={supplier.id}>
						<TableCell>
							<div className="flex flex-col gap-1">
								<span className="font-medium">{supplier.companyName}</span>
								<Badge variant="outline" className="w-fit text-xs">
									{SUPPLIER_STATUS_LABELS[supplier.status]}
								</Badge>
							</div>
						</TableCell>
						<TableCell>{supplier.email}</TableCell>
						<TableCell>{stripProtocol(supplier.website)}</TableCell>
						<TableCell className="tabular-nums">{formatCurrency(supplier.pricePerUnit)}</TableCell>
						<TableCell className="tabular-nums">{formatCurrency(supplier.tco)}</TableCell>
						<TableCell className="tabular-nums">{formatRating(supplier.rating)}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
