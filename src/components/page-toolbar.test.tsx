import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { PageToolbar } from "./page-toolbar";

describe("PageToolbar", () => {
	test("renders all three zones when provided", () => {
		render(<PageToolbar left={<span>L</span>} middle={<span>M</span>} right={<span>R</span>} />);
		expect(screen.getByTestId("page-toolbar-left")).toHaveTextContent("L");
		expect(screen.getByTestId("page-toolbar-middle")).toHaveTextContent("M");
		expect(screen.getByTestId("page-toolbar-right")).toHaveTextContent("R");
	});

	test("omits left zone when not provided", () => {
		render(<PageToolbar middle={<span>M</span>} right={<span>R</span>} />);
		expect(screen.queryByTestId("page-toolbar-left")).not.toBeInTheDocument();
		expect(screen.getByTestId("page-toolbar-middle")).toBeInTheDocument();
		expect(screen.getByTestId("page-toolbar-right")).toBeInTheDocument();
	});

	test("omits right zone when not provided", () => {
		render(<PageToolbar left={<span>L</span>} middle={<span>M</span>} />);
		expect(screen.getByTestId("page-toolbar-left")).toBeInTheDocument();
		expect(screen.getByTestId("page-toolbar-middle")).toBeInTheDocument();
		expect(screen.queryByTestId("page-toolbar-right")).not.toBeInTheDocument();
	});

	test("always renders middle zone even when middle is omitted", () => {
		render(<PageToolbar left={<span>L</span>} />);
		expect(screen.getByTestId("page-toolbar-middle")).toBeInTheDocument();
	});
});
