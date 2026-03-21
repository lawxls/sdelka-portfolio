import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "./theme-toggle";

function getStoredTheme() {
	return window.localStorage.getItem("theme");
}

function htmlHasDark() {
	return document.documentElement.classList.contains("dark");
}

beforeEach(() => {
	window.localStorage.removeItem("theme");
	document.documentElement.classList.remove("dark");
});

afterEach(() => {
	window.localStorage.removeItem("theme");
	document.documentElement.classList.remove("dark");
});

describe("ThemeToggle", () => {
	test("renders toggle button", () => {
		render(
			<TooltipProvider>
				<ThemeToggle />
			</TooltipProvider>,
		);
		expect(screen.getByRole("button", { name: "Сменить тему" })).toBeInTheDocument();
	});

	test("toggles .dark class on <html> when clicked", async () => {
		const user = userEvent.setup();
		render(
			<TooltipProvider>
				<ThemeToggle />
			</TooltipProvider>,
		);

		expect(htmlHasDark()).toBe(false);

		await user.click(screen.getByRole("button", { name: "Сменить тему" }));
		expect(htmlHasDark()).toBe(true);

		await user.click(screen.getByRole("button", { name: "Сменить тему" }));
		expect(htmlHasDark()).toBe(false);
	});

	test("persists theme to localStorage on toggle", async () => {
		const user = userEvent.setup();
		render(
			<TooltipProvider>
				<ThemeToggle />
			</TooltipProvider>,
		);

		await user.click(screen.getByRole("button", { name: "Сменить тему" }));
		expect(getStoredTheme()).toBe("dark");

		await user.click(screen.getByRole("button", { name: "Сменить тему" }));
		expect(getStoredTheme()).toBe("light");
	});

	test("reads saved dark preference on mount (via inline script simulation)", async () => {
		// Simulate what the index.html inline script does
		window.localStorage.setItem("theme", "dark");
		document.documentElement.classList.add("dark");

		const user = userEvent.setup();
		render(
			<TooltipProvider>
				<ThemeToggle />
			</TooltipProvider>,
		);

		// Should be dark from the inline script
		expect(htmlHasDark()).toBe(true);

		// Toggle to light
		await user.click(screen.getByRole("button", { name: "Сменить тему" }));
		expect(htmlHasDark()).toBe(false);
		expect(getStoredTheme()).toBe("light");
	});

	test("falls back to system preference when no saved value (light)", () => {
		// matchMedia defaults to not matching in jsdom, so system = light
		// Inline script would NOT add .dark class
		render(
			<TooltipProvider>
				<ThemeToggle />
			</TooltipProvider>,
		);
		expect(htmlHasDark()).toBe(false);
	});

	test("falls back to system preference when no saved value (dark)", () => {
		// Simulate system dark preference + what inline script would do
		const mql = {
			matches: true,
			media: "(prefers-color-scheme: dark)",
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			onchange: null,
			dispatchEvent: vi.fn(),
		};
		window.matchMedia = vi.fn().mockReturnValue(mql);
		// Inline script would add .dark class
		document.documentElement.classList.add("dark");

		render(
			<TooltipProvider>
				<ThemeToggle />
			</TooltipProvider>,
		);
		expect(htmlHasDark()).toBe(true);

		vi.restoreAllMocks();
	});
});
