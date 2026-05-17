import { _archivedCount, _statsByFolder } from "./items-mock-data";
import { delay, nextId } from "./mock-utils";
import type { Folder } from "./types";

/** Cascade hook: folders-in-memory invokes this when a folder is deleted so
 * tests that share an in-memory inquiries adapter can null-out matching
 * `folderId`s. Production inquiries hit HTTP and the backend handles the
 * cascade via `on_delete=SET_NULL`. */
type DeleteCascade = (folderId: string) => void;
let cascadeOnDelete: DeleteCascade | null = null;
export function _setFolderDeleteCascade(cb: DeleteCascade | null): void {
	cascadeOnDelete = cb;
}

// --- Seed data ---

const SEED_FOLDERS: Folder[] = [
	{ id: "folder-packaging", name: "Упаковка", color: "blue" },
	{ id: "folder-fillings", name: "Наполнители", color: "green" },
	{ id: "folder-fabrics", name: "Ткани и обивка", color: "pink" },
	{ id: "folder-panels", name: "Плиты и каркас", color: "teal" },
	{ id: "folder-springs", name: "Пружинные блоки", color: "orange" },
	{ id: "folder-chemistry", name: "Химия и клеи", color: "purple" },
];

// --- Mutable store ---

let foldersStore: Folder[] = [];

function seedStore() {
	foldersStore = SEED_FOLDERS.map((f) => ({ ...f }));
}

seedStore();

export function _resetFoldersStore(): void {
	seedStore();
}

export function _setFolders(folders: Folder[]): void {
	foldersStore = folders.map((f) => ({ ...f }));
}

export function _getFolders(): Folder[] {
	return foldersStore.map((f) => ({ ...f }));
}

// --- Mock API functions ---

export async function fetchFoldersMock(): Promise<{ folders: Folder[] }> {
	await delay();
	return { folders: foldersStore.map((f) => ({ ...f })) };
}

export async function fetchFolderStatsMock(params?: { company?: string }): Promise<{
	stats: Array<{ folderId: string | null; itemCount: number }>;
	archiveCount: number;
}> {
	await delay();
	const counts = _statsByFolder(params?.company);
	const stats: Array<{ folderId: string | null; itemCount: number }> = [];
	const noneCount = counts.get(null);
	if (noneCount !== undefined) stats.push({ folderId: null, itemCount: noneCount });
	for (const folder of foldersStore) {
		const c = counts.get(folder.id);
		if (c !== undefined) stats.push({ folderId: folder.id, itemCount: c });
	}
	return { stats, archiveCount: _archivedCount(params?.company) };
}

export async function createFolderMock(data: { name: string; color: string }): Promise<Folder> {
	await delay();
	const folder: Folder = { id: nextId("folder"), name: data.name, color: data.color };
	foldersStore.push(folder);
	return { ...folder };
}

export async function updateFolderMock(id: string, data: { name?: string; color?: string }): Promise<Folder> {
	await delay();
	const idx = foldersStore.findIndex((f) => f.id === id);
	if (idx === -1) throw new Error(`Folder ${id} not found`);
	foldersStore[idx] = { ...foldersStore[idx], ...data };
	return { ...foldersStore[idx] };
}

export async function deleteFolderMock(id: string): Promise<void> {
	await delay();
	const existed = foldersStore.some((f) => f.id === id);
	foldersStore = foldersStore.filter((f) => f.id !== id);
	if (!existed) return;
	cascadeOnDelete?.(id);
}
