export function TableEmptyState({ message }: { message: string }) {
	return (
		<div className="flex flex-1 items-center justify-center px-lg py-10 text-sm text-muted-foreground">{message}</div>
	);
}
