import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import type { Folder } from "@/data/types";
import { FolderSelect } from "./folder-select";

const FOLDERS: Folder[] = [
	{ id: "folder-1", name: "Металлопрокат", color: "blue" },
	{ id: "folder-2", name: "Стройматериалы", color: "green" },
];

function renderSelect(overrides: Partial<Parameters<typeof FolderSelect>[0]> = {}) {
	const props: Parameters<typeof FolderSelect>[0] = {
		folders: FOLDERS,
		value: null,
		onChange: vi.fn(),
		onCreateFolder: vi.fn(),
		nextFolderColor: "red",
		...overrides,
	};
	return { ...render(<FolderSelect {...props} />), ...props };
}

describe("FolderSelect", () => {
	test("shows placeholder when no folder selected", () => {
		renderSelect();
		expect(screen.getByRole("button", { name: "Категория" })).toHaveTextContent("Без категории");
	});

	test("shows selected folder name when value is set", () => {
		renderSelect({ value: "folder-1" });
		expect(screen.getByRole("button", { name: "Категория" })).toHaveTextContent("Металлопрокат");
	});

	test("opens popover and lists all folders plus 'Без категории' option", async () => {
		renderSelect();
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Категория" }));

		expect(screen.getByRole("button", { name: /Металлопрокат/ })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Стройматериалы/ })).toBeInTheDocument();
	});

	test("clicking a folder option calls onChange with folder id", async () => {
		const onChange = vi.fn();
		renderSelect({ onChange });
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Категория" }));
		await user.click(screen.getByRole("button", { name: /Металлопрокат/ }));

		expect(onChange).toHaveBeenCalledWith("folder-1");
	});

	test("clicking 'Без категории' option calls onChange with null", async () => {
		const onChange = vi.fn();
		renderSelect({ value: "folder-1", onChange });
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Категория" }));

		const noneOptions = screen.getAllByRole("button", { name: /Без категории/ });
		await user.click(noneOptions[noneOptions.length - 1]);

		expect(onChange).toHaveBeenCalledWith(null);
	});

	test("clicking 'Создать раздел' reveals inline input", async () => {
		renderSelect();
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Категория" }));
		await user.click(screen.getByRole("button", { name: /Создать категорию/ }));

		expect(await screen.findByRole("textbox", { name: "Название категории" })).toBeInTheDocument();
	});

	test("inline input Enter calls onCreateFolder with trimmed value", async () => {
		const onCreateFolder = vi.fn();
		renderSelect({ onCreateFolder });
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Категория" }));
		await user.click(screen.getByRole("button", { name: /Создать категорию/ }));

		const input = await screen.findByRole("textbox", { name: "Название категории" });
		await user.type(input, "Новый{Enter}");

		expect(onCreateFolder).toHaveBeenCalledWith("Новый", "red");
	});

	test("color picker toggles open and changes the selected color before save", async () => {
		const onCreateFolder = vi.fn();
		renderSelect({ onCreateFolder, nextFolderColor: "red" });
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Категория" }));
		await user.click(screen.getByRole("button", { name: /Создать категорию/ }));

		const colorToggle = await screen.findByRole("button", { name: "Выбрать цвет категории" });
		expect(colorToggle).toHaveAttribute("aria-expanded", "false");
		await user.click(colorToggle);
		expect(colorToggle).toHaveAttribute("aria-expanded", "true");

		await user.click(screen.getByRole("button", { name: "Цвет: purple" }));

		const input = screen.getByRole("textbox", { name: "Название категории" });
		await user.type(input, "Разное{Enter}");

		expect(onCreateFolder).toHaveBeenCalledWith("Разное", "purple");
	});

	test("inline input Escape cancels without calling onCreateFolder", async () => {
		const onCreateFolder = vi.fn();
		renderSelect({ onCreateFolder });
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Категория" }));
		await user.click(screen.getByRole("button", { name: /Создать категорию/ }));

		const input = await screen.findByRole("textbox", { name: "Название категории" });
		await user.type(input, "Канцелярия{Escape}");

		expect(onCreateFolder).not.toHaveBeenCalled();
	});

	test("renders color dot for selected folder", () => {
		const { container } = renderSelect({ value: "folder-1" });
		const dot = container.querySelector("span[style*='--folder-blue']");
		expect(dot).toBeInTheDocument();
	});
});
