import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import App from "./App";

describe("App", () => {
	test("renders page layout with header, main, and footer", () => {
		render(<App />);
		expect(screen.getByText("Портфель закупок")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Toggle theme" })).toBeInTheDocument();
		expect(screen.getByRole("banner")).toBeInTheDocument();
		expect(screen.getByRole("main")).toBeInTheDocument();
		expect(screen.getByRole("contentinfo")).toBeInTheDocument();
	});

	test("renders procurement table with data", () => {
		render(<App />);
		expect(screen.getByRole("table")).toBeInTheDocument();
		expect(screen.getByText("Наименование")).toBeInTheDocument();
		expect(screen.getByText("Статус")).toBeInTheDocument();
	});

	test("renders toolbar with create button", () => {
		render(<App />);
		expect(screen.getByRole("button", { name: /Создать закупки/ })).toBeInTheDocument();
	});

	test("renders summary panel with metrics and export button", () => {
		render(<App />);
		expect(screen.getByText(/Позиций/)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Скачать таблицу/ })).toBeInTheDocument();
	});
});
