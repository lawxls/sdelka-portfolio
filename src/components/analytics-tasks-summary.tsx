import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
	tasksSummary: { open: number; overdue: number };
}

export function AnalyticsTasksSummary({ tasksSummary }: Props) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Задачи</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<p className="text-sm text-muted-foreground">Открытые</p>
						<p className="text-2xl font-bold tabular-nums">{tasksSummary.open}</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Просроченные</p>
						<p className="text-destructive text-2xl font-bold tabular-nums">{tasksSummary.overdue}</p>
					</div>
				</div>
				<div className="mt-4">
					<Link
						to="/tasks"
						className="text-primary text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						Перейти к задачам →
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}
