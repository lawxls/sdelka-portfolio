import { User } from "lucide-react";
import { Link } from "react-router";
import { useMe } from "@/data/use-me";
import { cn } from "@/lib/utils";

interface UserAvatarMenuProps {
	className?: string;
}

function formatTriggerName(firstName: string, lastName: string): string {
	const trimmedLast = lastName.trim();
	return trimmedLast ? `${firstName} ${trimmedLast}` : firstName;
}

export function UserAvatarMenu({ className }: UserAvatarMenuProps) {
	const { data: me } = useMe();

	const displayName = me ? formatTriggerName(me.firstName, me.lastName) : null;

	return (
		<Link
			to="/settings/profile"
			aria-label="Меню пользователя"
			className={cn(
				"inline-flex shrink-0 items-center gap-2.5 rounded-md bg-foreground/[0.08] px-3.5 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-foreground/[0.12] hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-muted dark:hover:bg-muted/80",
				className,
			)}
		>
			<User className="size-4 shrink-0" aria-hidden="true" />
			{displayName && <span className="leading-none">{displayName}</span>}
		</Link>
	);
}
