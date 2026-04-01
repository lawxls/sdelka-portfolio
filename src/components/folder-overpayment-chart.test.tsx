import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FolderBreakdown } from "@/data/analytics-types";
import { FolderOverpaymentChart } from "./folder-overpayment-chart";

// Mock ResponsiveContainer to avoid jsdom sizing issues
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

const mockFolderBreakdown: FolderBreakdown[] = [
	{ folderId: "f1", folderName: "Электроника", overpayment: 200_000, deviationPct: 18 },
	{ folderId: "f2", folderName: "Мебель", overpayment: 80_000, deviationPct: 10 },
	{ folderId: "f3", folderName: "Оргтехника", overpayment: 30_000, deviationPct: 5 },
];

describe("FolderOverpaymentChart", () => {
	it("renders folder names from breakdown data", () => {
		render(<FolderOverpaymentChart folderBreakdown={mockFolderBreakdown} />);
		expect(screen.getByText("Электроника")).toBeInTheDocument();
		expect(screen.getByText("Мебель")).toBeInTheDocument();
		expect(screen.getByText("Оргтехника")).toBeInTheDocument();
	});

	it("renders overpayment ₽ values for each folder", () => {
		render(<FolderOverpaymentChart folderBreakdown={mockFolderBreakdown} />);
		// formatCurrency renders values with ₽ symbol
		expect(screen.getByText(/200\s*000/)).toBeInTheDocument();
		expect(screen.getByText(/80\s*000/)).toBeInTheDocument();
		expect(screen.getByText(/30\s*000/)).toBeInTheDocument();
	});

	it("renders empty state when folderBreakdown is empty", () => {
		render(<FolderOverpaymentChart folderBreakdown={[]} />);
		expect(screen.getByTestId("folder-chart-empty")).toBeInTheDocument();
		expect(screen.queryByTestId("folder-chart-legend")).not.toBeInTheDocument();
	});

	it("renders section heading", () => {
		render(<FolderOverpaymentChart folderBreakdown={mockFolderBreakdown} />);
		expect(screen.getByText("Переплата по папкам")).toBeInTheDocument();
	});
});
