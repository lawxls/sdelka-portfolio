import type { ReactNode } from "react";

interface PageToolbarProps {
	left?: ReactNode;
	middle?: ReactNode;
	right?: ReactNode;
}

export function PageToolbar({ left, middle, right }: PageToolbarProps) {
	return (
		<div
			className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-md border-b border-border bg-background px-lg"
			data-testid="page-toolbar"
		>
			{left !== undefined && (
				<div className="flex shrink-0 items-center gap-sm" data-testid="page-toolbar-left">
					{left}
				</div>
			)}
			<div className="flex min-w-0 flex-1 items-center" data-testid="page-toolbar-middle">
				{middle}
			</div>
			{right !== undefined && (
				<div className="flex shrink-0 items-center gap-sm" data-testid="page-toolbar-right">
					{right}
				</div>
			)}
		</div>
	);
}
