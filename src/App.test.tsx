import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import App from "./App";

test("renders page layout with header, main, and footer", () => {
	render(<App />);
	expect(screen.getByText("Портфель закупок")).toBeInTheDocument();
	expect(screen.getByRole("button", { name: "Toggle theme" })).toBeInTheDocument();
	expect(screen.getByRole("banner")).toBeInTheDocument();
	expect(screen.getByRole("main")).toBeInTheDocument();
	expect(screen.getByRole("contentinfo")).toBeInTheDocument();
});
