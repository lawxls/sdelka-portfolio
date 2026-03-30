const AVATAR_COLORS: Record<string, string> = {
	red: "bg-folder-red",
	orange: "bg-folder-orange",
	yellow: "bg-folder-yellow",
	green: "bg-folder-green",
	blue: "bg-folder-blue",
	purple: "bg-folder-purple",
	pink: "bg-folder-pink",
	teal: "bg-folder-teal",
};

export function getAvatarColor(icon: string): string {
	return AVATAR_COLORS[icon] ?? "bg-folder-blue";
}
