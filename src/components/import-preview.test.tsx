import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { describe, expect, test, vi } from "vitest";
import type { NewItemInput } from "@/data/types";
import { installMockIntersectionObserver, type ObserverRecord } from "@/test-intersection-observer";
import { ImportPreview } from "./import-preview";

function makeItems(count: number): NewItemInput[] {
	return Array.from({ length: count }, (_, i) => ({ name: `Item ${i + 1}` }));
}

function renderPreview(
	overrides: Partial<{
		items: NewItemInput[];
		onBack: () => void;
		onImport: () => void;
	}> = {},
) {
	const props = {
		items: overrides.items ?? makeItems(50),
		onBack: overrides.onBack ?? vi.fn(),
		onImport: overrides.onImport ?? vi.fn(),
	};
	return { ...render(<ImportPreview {...props} />), ...props };
}

function triggerIntersection(observers: ObserverRecord[]) {
	const latest = observers[observers.length - 1];
	act(() => {
		latest.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
	});
}

describe("ImportPreview", () => {
	let observers: ObserverRecord[];

	test("renders first 20 items initially", () => {
		observers = installMockIntersectionObserver();
		renderPreview({ items: makeItems(50) });
		expect(screen.getByText("Item 1")).toBeInTheDocument();
		expect(screen.getByText("Item 20")).toBeInTheDocument();
		expect(screen.queryByText("Item 21")).not.toBeInTheDocument();
	});

	test("shows count info for large lists", () => {
		observers = installMockIntersectionObserver();
		renderPreview({ items: makeItems(50) });
		expect(screen.getByText("Показано 20 из 50")).toBeInTheDocument();
	});

	test("loads more items when sentinel intersects", () => {
		observers = installMockIntersectionObserver();
		renderPreview({ items: makeItems(50) });

		triggerIntersection(observers);

		expect(screen.getByText("Item 40")).toBeInTheDocument();
		expect(screen.getByText("Показано 40 из 50")).toBeInTheDocument();
	});

	test("loads all remaining items on last batch", () => {
		observers = installMockIntersectionObserver();
		renderPreview({ items: makeItems(50) });

		triggerIntersection(observers);
		triggerIntersection(observers);

		expect(screen.getByText("Item 50")).toBeInTheDocument();
		expect(screen.getByText("Показано 50 из 50")).toBeInTheDocument();
	});

	test("shows simple count when all items fit in one batch", () => {
		observers = installMockIntersectionObserver();
		renderPreview({ items: makeItems(5) });
		expect(screen.getByText("Item 1")).toBeInTheDocument();
		expect(screen.getByText("Item 5")).toBeInTheDocument();
		expect(screen.getByText("5 позиций")).toBeInTheDocument();
	});

	test("import button shows total item count", () => {
		observers = installMockIntersectionObserver();
		renderPreview({ items: makeItems(50) });
		expect(screen.getByRole("button", { name: /Импортировать 50 позиц/ })).toBeInTheDocument();
	});

	test("import button calls onImport", async () => {
		observers = installMockIntersectionObserver();
		const onImport = vi.fn();
		renderPreview({ items: makeItems(5), onImport });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /Импортировать/ }));

		expect(onImport).toHaveBeenCalledOnce();
	});

	test("back button calls onBack", async () => {
		observers = installMockIntersectionObserver();
		const onBack = vi.fn();
		renderPreview({ items: makeItems(5), onBack });
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "Назад" }));

		expect(onBack).toHaveBeenCalledOnce();
	});
});
