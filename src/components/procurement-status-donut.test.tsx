import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProcurementStatus } from "@/data/analytics-types";
import { ProcurementStatusDonut } from "./procurement-status-donut";

vi.mock("recharts", async () => {
	const actual = await vi.importActual<typeof import("recharts")>("recharts");
	return {
		...actual,
		ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
			<div data-testid="responsive-container" style={{ width: 320, height: 200 }}>
				{children}
			</div>
		),
	};
});

const mockStatusBreakdown: Record<ProcurementStatus, number> = {
	awaiting_analytics: 5,
	searching: 8,
	negotiating: 3,
	completed: 10,
};

describe("ProcurementStatusDonut", () => {
	it("renders all status labels in the legend", () => {
		render(<ProcurementStatusDonut statusBreakdown={mockStatusBreakdown} />);
		expect(screen.getByText("Ожидание аналитики")).toBeInTheDocument();
		expect(screen.getByText("Ищем поставщиков")).toBeInTheDocument();
		expect(screen.getByText("Ведём переговоры")).toBeInTheDocument();
		expect(screen.getByText("Переговоры завершены")).toBeInTheDocument();
	});

	it("renders item counts for each status in the legend", () => {
		render(<ProcurementStatusDonut statusBreakdown={mockStatusBreakdown} />);
		const legend = screen.getByTestId("status-donut-legend");
		expect(legend).toHaveTextContent("5");
		expect(legend).toHaveTextContent("8");
		expect(legend).toHaveTextContent("3");
		expect(legend).toHaveTextContent("10");
	});

	it("renders section heading", () => {
		render(<ProcurementStatusDonut statusBreakdown={mockStatusBreakdown} />);
		expect(screen.getByText("Статусы позиций")).toBeInTheDocument();
	});
});
