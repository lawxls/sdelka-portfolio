import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SupplierStatus } from "@/data/supplier-types";
import { SUPPLIER_STATUS_LABELS } from "@/data/supplier-types";
import { SupplierPipelineChart } from "./supplier-pipeline-chart";

const mockPipeline: Record<SupplierStatus, number> = {
	письмо_не_отправлено: 10,
	ждем_ответа: 5,
	переговоры: 3,
	получено_кп: 7,
	отказ: 2,
};

describe("SupplierPipelineChart", () => {
	it("renders the heading", () => {
		render(<SupplierPipelineChart supplierPipeline={mockPipeline} />);
		expect(screen.getByText("Статусы поставщиков")).toBeInTheDocument();
	});

	it("renders all supplier status labels in the legend", () => {
		render(<SupplierPipelineChart supplierPipeline={mockPipeline} />);
		const legend = screen.getByTestId("supplier-pipeline-legend");
		for (const label of Object.values(SUPPLIER_STATUS_LABELS)) {
			expect(within(legend).getByText(label)).toBeInTheDocument();
		}
	});

	it("renders supplier counts in the legend", () => {
		render(<SupplierPipelineChart supplierPipeline={mockPipeline} />);
		const legend = screen.getByTestId("supplier-pipeline-legend");
		expect(within(legend).getByText("10")).toBeInTheDocument();
		expect(within(legend).getByText("5")).toBeInTheDocument();
		expect(within(legend).getByText("3")).toBeInTheDocument();
		expect(within(legend).getByText("7")).toBeInTheDocument();
		expect(within(legend).getByText("2")).toBeInTheDocument();
	});
});
