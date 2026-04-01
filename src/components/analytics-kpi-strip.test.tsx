import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AnalyticsKpis } from "@/data/analytics-types";
import { AnalyticsKpiStrip } from "./analytics-kpi-strip";

const baseKpis: AnalyticsKpis = {
	totalSpend: 5_000_000,
	totalOverpayment: 300_000,
	totalSavings: 150_000,
	completedCount: 8,
	totalCount: 20,
	pendingAnalysisCount: 4,
	openTasksCount: 3,
};

describe("AnalyticsKpiStrip", () => {
	it("renders all 5 KPI labels", () => {
		render(<AnalyticsKpiStrip kpis={baseKpis} />);

		expect(screen.getByText("Годовые затраты")).toBeInTheDocument();
		expect(screen.getByText("Переплата")).toBeInTheDocument();
		expect(screen.getByText("Экономия")).toBeInTheDocument();
		expect(screen.getByText("Выполнено")).toBeInTheDocument();
		expect(screen.getByText("Открытые задачи")).toBeInTheDocument();
	});

	it("renders completed count, total count, and percentage", () => {
		render(<AnalyticsKpiStrip kpis={baseKpis} />);

		// 8 completed out of 20 = 40%
		expect(screen.getByText("8")).toBeInTheDocument();
		expect(screen.getByText(/из 20/)).toBeInTheDocument();
		expect(screen.getByText("40%")).toBeInTheDocument();
	});

	it("renders open tasks count", () => {
		render(<AnalyticsKpiStrip kpis={baseKpis} />);
		expect(screen.getByText("3")).toBeInTheDocument();
	});

	it("renders currency values", () => {
		render(<AnalyticsKpiStrip kpis={baseKpis} />);

		// Currency values contain ₽ symbol
		const roubleTexts = screen.getAllByText(/₽/);
		expect(roubleTexts.length).toBeGreaterThanOrEqual(3);
	});

	it("shows pending analysis footnote when pendingAnalysisCount > 0", () => {
		render(<AnalyticsKpiStrip kpis={baseKpis} />);
		expect(screen.getByText(/не проанализировано/)).toBeInTheDocument();
	});

	it("hides pending analysis footnote when pendingAnalysisCount is 0", () => {
		render(<AnalyticsKpiStrip kpis={{ ...baseKpis, pendingAnalysisCount: 0 }} />);
		expect(screen.queryByText(/не проанализировано/)).not.toBeInTheDocument();
	});

	it("shows 0% completed when totalCount is 0", () => {
		render(<AnalyticsKpiStrip kpis={{ ...baseKpis, completedCount: 0, totalCount: 0 }} />);
		expect(screen.getByText("0%")).toBeInTheDocument();
	});
});
