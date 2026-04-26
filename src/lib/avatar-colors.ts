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

const AVATAR_COLOR_KEYS = Object.keys(AVATAR_COLORS);

export function getAvatarColor(icon: string): string {
	return AVATAR_COLORS[icon] ?? "bg-folder-blue";
}

export function getAvatarColorForId(id: number): string {
	const key = AVATAR_COLOR_KEYS[Math.abs(id) % AVATAR_COLOR_KEYS.length];
	return getAvatarColor(key);
}
