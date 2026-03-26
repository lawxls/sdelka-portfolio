import { render, screen } from "@testing-library/react";
import { Building2, LayoutDashboard, ListTodo } from "lucide-react";
import { describe, expect, test } from "vitest";
import { PlaceholderPage } from "./placeholder-page";

describe("PlaceholderPage", () => {
	test("renders icon, title, and subtitle", () => {
		render(<PlaceholderPage icon={LayoutDashboard} title="Аналитика" subtitle="В разработке" />);
		expect(screen.getByRole("heading", { name: "Аналитика" })).toBeInTheDocument();
		expect(screen.getByText("В разработке")).toBeInTheDocument();
		expect(screen.getByTestId("placeholder-icon")).toBeInTheDocument();
	});

	test("renders correct icon for companies", () => {
		render(<PlaceholderPage icon={Building2} title="Компании" subtitle="В разработке" />);
		expect(screen.getByRole("heading", { name: "Компании" })).toBeInTheDocument();
		expect(screen.getByTestId("placeholder-icon")).toBeInTheDocument();
	});

	test("renders correct icon for tasks", () => {
		render(<PlaceholderPage icon={ListTodo} title="Задачи" subtitle="В разработке" />);
		expect(screen.getByRole("heading", { name: "Задачи" })).toBeInTheDocument();
		expect(screen.getByTestId("placeholder-icon")).toBeInTheDocument();
	});

	test("icon has muted styling", () => {
		render(<PlaceholderPage icon={LayoutDashboard} title="Аналитика" subtitle="В разработке" />);
		const icon = screen.getByTestId("placeholder-icon");
		expect(icon.getAttribute("class")).toContain("text-muted-foreground");
	});
});
