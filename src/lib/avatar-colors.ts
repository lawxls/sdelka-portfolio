import { hash } from "./hash";

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

export function getAvatarColorForId(id: string | number): string {
	const n = typeof id === "number" ? Math.abs(id) : hash(id);
	const key = AVATAR_COLOR_KEYS[n % AVATAR_COLOR_KEYS.length];
	return getAvatarColor(key);
}
