import { _archivedCount, _statsByFolder, _unassignItemsFromFolder } from "./items-mock-data";
import { delay, nextId } from "./mock-utils";
import type { Folder } from "./types";

// --- Seed data ---

const SEED_FOLDERS: Folder[] = [
	{ id: "folder-metal", name: "Металлопрокат", color: "blue" },
	{ id: "folder-build", name: "Стройматериалы", color: "green" },
	{ id: "folder-fasteners", name: "Крепёж", color: "orange" },
	{ id: "folder-plumbing", name: "Сантехника", color: "teal" },
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

export async function fetchFolderStatsMock(): Promise<{
	stats: Array<{ folderId: string | null; itemCount: number }>;
	archiveCount: number;
}> {
	await delay();
	const counts = _statsByFolder();
	const stats: Array<{ folderId: string | null; itemCount: number }> = [];
	const noneCount = counts.get(null);
	if (noneCount !== undefined) stats.push({ folderId: null, itemCount: noneCount });
	for (const folder of foldersStore) {
		const c = counts.get(folder.id);
		if (c !== undefined) stats.push({ folderId: folder.id, itemCount: c });
	}
	return { stats, archiveCount: _archivedCount() };
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
	if (existed) _unassignItemsFromFolder(id);
}
