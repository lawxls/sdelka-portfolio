export function hash(s: string): number {
	let h = 0;
	for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
	return Math.abs(h);
}
