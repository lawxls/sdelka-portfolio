import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { makeItem } from "@/test-utils";
import { ProcurementCard } from "./procurement-card";

describe("ProcurementCard", () => {
	it("renders row number, name, and status label", () => {
		const item = makeItem("1", { name: "Болты М8", status: "searching" });
		render(<ProcurementCard item={item} index={0} />);

		expect(screen.getByText("1")).toBeInTheDocument();
		expect(screen.getByText("Болты М8")).toBeInTheDocument();
		expect(screen.getByText("Ищем поставщиков")).toBeInTheDocument();
	});

	it("renders folder badge when folder is assigned", () => {
		const item = makeItem("3", { folderId: "f1" });
		const folder = { id: "f1", name: "Металл", color: "blue" };
		render(<ProcurementCard item={item} index={0} folder={folder} />);

		expect(screen.getByText("Металл")).toBeInTheDocument();
	});

	it("does not render folder badge when no folder", () => {
		const item = makeItem("4", { folderId: null });
		render(<ProcurementCard item={item} index={0} />);

		expect(screen.queryByTestId(/folder-badge/)).not.toBeInTheDocument();
	});

	it("color-codes deviation and overpayment red when positive (overpaying)", () => {
		// currentPrice > bestPrice → positive deviation → red
		const item = makeItem("5", { currentPrice: 50, bestPrice: 40, annualQuantity: 100 });
		const { container } = render(<ProcurementCard item={item} index={0} />);

		const deviationEl = container.querySelector("[data-field='deviation']");
		const overpaymentEl = container.querySelector("[data-field='overpayment']");
		expect(deviationEl?.className).toContain("text-red-600");
		expect(overpaymentEl?.className).toContain("text-red-600");
	});

	it("color-codes deviation and overpayment green when negative (saving)", () => {
		// currentPrice < bestPrice → negative deviation → green
		const item = makeItem("6", { currentPrice: 30, bestPrice: 40, annualQuantity: 100 });
		const { container } = render(<ProcurementCard item={item} index={0} />);

		const deviationEl = container.querySelector("[data-field='deviation']");
		const overpaymentEl = container.querySelector("[data-field='overpayment']");
		expect(deviationEl?.className).toContain("text-green-600");
		expect(overpaymentEl?.className).toContain("text-green-600");
	});

	it("does not render average price", () => {
		const item = makeItem("x", { averagePrice: 45 });
		render(<ProcurementCard item={item} index={0} />);

		expect(screen.queryByText("45 ₽")).not.toBeInTheDocument();
		expect(screen.queryByText(/средняя/i)).not.toBeInTheDocument();
	});

	it("renders status icon and color for each status variant", () => {
		const searching = makeItem("s1", { status: "searching" });
		const negotiating = makeItem("s2", { status: "negotiating" });
		const completed = makeItem("s3", { status: "completed" });

		const { unmount: u1 } = render(<ProcurementCard item={searching} index={0} />);
		const searchStatus = screen.getByText("Ищем поставщиков");
		expect(searchStatus.className).toContain("text-orange-600");
		// spinner icon present (LoaderCircle renders as svg)
		expect(searchStatus.querySelector("svg")).toBeTruthy();
		u1();

		const { unmount: u2 } = render(<ProcurementCard item={negotiating} index={0} />);
		const negStatus = screen.getByText("Ведём переговоры");
		expect(negStatus.className).toContain("text-blue-600");
		u2();

		render(<ProcurementCard item={completed} index={0} />);
		const compStatus = screen.getByText("Переговоры завершены");
		expect(compStatus.className).toContain("text-[oklch(0.50_0.18_122)]");
		expect(compStatus.querySelector("svg")).toBeTruthy();
	});

	it("fires onRowClick when card is tapped", async () => {
		const item = makeItem("7");
		const onClick = vi.fn();
		render(<ProcurementCard item={item} index={0} onRowClick={onClick} />);

		await userEvent.click(screen.getByRole("button"));
		expect(onClick).toHaveBeenCalledWith(item);
	});

	it("renders annual cost, current price, best price, deviation, and overpayment", () => {
		// currentPrice=50, bestPrice=40, annualQuantity=100
		// annualCost = 100*50 = 5000, deviation = (50-40)/40*100 = 25%
		// overpayment = (50-40)*100 = 1000
		const item = makeItem("2");
		render(<ProcurementCard item={item} index={1} />);

		expect(screen.getByText("5 000 ₽")).toBeInTheDocument(); // annual cost
		expect(screen.getByText("50 ₽")).toBeInTheDocument(); // current price
		expect(screen.getByText("40 ₽")).toBeInTheDocument(); // best price
		expect(screen.getByText(/25,0/)).toBeInTheDocument(); // deviation %
		expect(screen.getByText("1 000 ₽")).toBeInTheDocument(); // overpayment
	});
});
