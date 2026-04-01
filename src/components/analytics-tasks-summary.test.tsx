import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { AnalyticsTasksSummary } from "./analytics-tasks-summary";

describe("AnalyticsTasksSummary", () => {
	it("renders open and overdue counts", () => {
		render(
			<MemoryRouter>
				<AnalyticsTasksSummary tasksSummary={{ open: 7, overdue: 3 }} />
			</MemoryRouter>,
		);

		expect(screen.getByText("7")).toBeInTheDocument();
		expect(screen.getByText("3")).toBeInTheDocument();
	});

	it("renders the card heading", () => {
		render(
			<MemoryRouter>
				<AnalyticsTasksSummary tasksSummary={{ open: 0, overdue: 0 }} />
			</MemoryRouter>,
		);

		expect(screen.getByText("Задачи")).toBeInTheDocument();
	});

	it("contains a link to the tasks page", () => {
		render(
			<MemoryRouter>
				<AnalyticsTasksSummary tasksSummary={{ open: 5, overdue: 1 }} />
			</MemoryRouter>,
		);

		expect(screen.getByRole("link")).toHaveAttribute("href", "/tasks");
	});
});
