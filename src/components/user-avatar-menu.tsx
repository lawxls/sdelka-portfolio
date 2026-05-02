import { User } from "lucide-react";
import { Link } from "react-router";
import { useSettings } from "@/data/use-settings";
import { cn } from "@/lib/utils";

interface UserAvatarMenuProps {
	className?: string;
}

function formatTriggerName(firstName: string, lastName: string): string {
	const trimmedLast = lastName.trim();
	return trimmedLast ? `${firstName} ${trimmedLast}` : firstName;
}

export function UserAvatarMenu({ className }: UserAvatarMenuProps) {
	const { data: settings } = useSettings();

	const displayName = settings ? formatTriggerName(settings.first_name, settings.last_name) : null;

	return (
		<Link
			to="/settings/profile"
			aria-label="Меню пользователя"
			className={cn(
				"inline-flex shrink-0 items-center gap-2.5 rounded-md bg-muted px-3.5 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-muted/80 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				className,
			)}
		>
			<User className="size-4 shrink-0" aria-hidden="true" />
			{displayName && <span className="leading-none">{displayName}</span>}
		</Link>
	);
}
