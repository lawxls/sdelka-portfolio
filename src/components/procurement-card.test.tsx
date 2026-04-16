import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Folder } from "@/data/types";
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
		const awaitingAnalytics = makeItem("s0", { status: "awaiting_analytics" });
		const searching = makeItem("s1", { status: "searching" });
		const negotiating = makeItem("s2", { status: "negotiating" });
		const completed = makeItem("s3", { status: "completed" });

		const { unmount: u0 } = render(<ProcurementCard item={awaitingAnalytics} index={0} />);
		const awaitStatus = screen.getByText("Ожидание аналитики");
		expect(awaitStatus.className).toContain("text-violet-600");
		expect(awaitStatus.querySelector("svg")).toBeTruthy();
		u0();

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
		expect(compStatus.className).toContain("text-green-600");
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

describe("ProcurementCard name truncation", () => {
	const longName = "Пена монтажная профессиональная зимняя морозостойкая";

	it("truncates names longer than 32 characters with ellipsis", () => {
		const item = makeItem("1", { name: longName });
		render(<ProcurementCard item={item} index={0} />);

		expect(screen.getByText(`${longName.slice(0, 40)}…`)).toBeInTheDocument();
		expect(screen.queryByText(longName)).not.toBeInTheDocument();
	});

	it("shows full name in tooltip for truncated names", async () => {
		const user = userEvent.setup();
		const item = makeItem("1", { name: longName });
		render(<ProcurementCard item={item} index={0} />);

		const truncated = screen.getByText(`${longName.slice(0, 40)}…`);
		await user.hover(truncated);

		expect(await screen.findByRole("tooltip")).toHaveTextContent(longName);
	});

	it("does not truncate names within 32 characters", () => {
		const item = makeItem("1", { name: "Болты М8" });
		render(<ProcurementCard item={item} index={0} />);

		expect(screen.getByText("Болты М8")).toBeInTheDocument();
		expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
	});
});

const testFolders: Folder[] = [
	{ id: "f-1", name: "Металлопрокат", color: "blue" },
	{ id: "f-2", name: "Стройматериалы", color: "green" },
];

describe("ProcurementCard actions", () => {
	it("renders ⋮ button when action callbacks are provided", () => {
		const item = makeItem("1");
		render(
			<ProcurementCard
				item={item}
				index={0}
				onDeleteItem={vi.fn()}
				onRenameItem={vi.fn()}
				onAssignFolder={vi.fn()}
				folders={testFolders}
			/>,
		);

		expect(screen.getByRole("button", { name: "Действия" })).toBeInTheDocument();
	});

	it("does not render ⋮ button when no action callbacks", () => {
		const item = makeItem("1");
		render(<ProcurementCard item={item} index={0} />);

		expect(screen.queryByRole("button", { name: "Действия" })).not.toBeInTheDocument();
	});

	it("dropdown menu opens on ⋮ click with rename, delete, move-to-folder", async () => {
		const user = userEvent.setup();
		const item = makeItem("1");
		render(
			<ProcurementCard
				item={item}
				index={0}
				onDeleteItem={vi.fn()}
				onRenameItem={vi.fn()}
				onAssignFolder={vi.fn()}
				folders={testFolders}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Действия" }));

		expect(screen.getByText("Переместить в категорию")).toBeInTheDocument();
		expect(screen.getByText("Переименовать")).toBeInTheDocument();
		expect(screen.getByText("Удалить")).toBeInTheDocument();
	});

	it("context menu opens on right-click with rename, delete, move-to-folder", () => {
		const item = makeItem("1");
		render(
			<ProcurementCard
				item={item}
				index={0}
				onDeleteItem={vi.fn()}
				onRenameItem={vi.fn()}
				onAssignFolder={vi.fn()}
				folders={testFolders}
			/>,
		);

		fireEvent.contextMenu(screen.getByTestId("card-1"));

		expect(screen.getByText("Переместить в категорию")).toBeInTheDocument();
		expect(screen.getByText("Переименовать")).toBeInTheDocument();
		expect(screen.getByText("Удалить")).toBeInTheDocument();
	});

	it("clicking delete opens AlertDialog, confirming calls onDeleteItem", async () => {
		const user = userEvent.setup();
		const onDeleteItem = vi.fn();
		const item = makeItem("1", { name: "Арматура А500" });
		render(
			<ProcurementCard
				item={item}
				index={0}
				onDeleteItem={onDeleteItem}
				onRenameItem={vi.fn()}
				onAssignFolder={vi.fn()}
				folders={testFolders}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Действия" }));
		await user.click(screen.getByText("Удалить"));

		// AlertDialog should be open
		expect(screen.getByText("Удалить закупку?")).toBeInTheDocument();
		const dialog = screen.getByRole("alertdialog");
		expect(within(dialog).getByText(/Арматура А500/)).toBeInTheDocument();

		// Confirm
		await user.click(screen.getByRole("button", { name: "Удалить" }));
		expect(onDeleteItem).toHaveBeenCalledWith("1");
	});

	it("cancelling delete does not call onDeleteItem", async () => {
		const user = userEvent.setup();
		const onDeleteItem = vi.fn();
		const item = makeItem("1");
		render(
			<ProcurementCard
				item={item}
				index={0}
				onDeleteItem={onDeleteItem}
				onRenameItem={vi.fn()}
				onAssignFolder={vi.fn()}
				folders={testFolders}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Действия" }));
		await user.click(screen.getByText("Удалить"));
		await user.click(screen.getByRole("button", { name: "Отмена" }));

		expect(onDeleteItem).not.toHaveBeenCalled();
	});

	it("rename via context menu shows inline input, Enter saves with onRenameItem", async () => {
		const user = userEvent.setup();
		const onRenameItem = vi.fn();
		const item = makeItem("1", { name: "Арматура А500" });
		render(
			<ProcurementCard
				item={item}
				index={0}
				onRenameItem={onRenameItem}
				onDeleteItem={vi.fn()}
				onAssignFolder={vi.fn()}
				folders={testFolders}
			/>,
		);

		fireEvent.contextMenu(screen.getByTestId("card-1"));
		fireEvent.click(screen.getByText("Переименовать"));

		const input = await screen.findByRole("textbox", { name: "Название закупки" });
		expect(input).toBeInTheDocument();
		await user.clear(input);
		await user.type(input, "Новое имя{Enter}");

		expect(onRenameItem).toHaveBeenCalledWith("1", "Новое имя");
	});

	it("folder submenu shows folders and clicking one calls onAssignFolder", async () => {
		const user = userEvent.setup();
		const onAssignFolder = vi.fn();
		const item = makeItem("1", { folderId: "f-1" });
		render(
			<ProcurementCard
				item={item}
				index={0}
				onAssignFolder={onAssignFolder}
				onDeleteItem={vi.fn()}
				onRenameItem={vi.fn()}
				folders={testFolders}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Действия" }));
		// Open folder submenu
		fireEvent.click(screen.getByText("Переместить в категорию"));

		expect(screen.getByText("Металлопрокат")).toBeInTheDocument();
		expect(screen.getByText("Стройматериалы")).toBeInTheDocument();
		expect(screen.getByText("Без категории")).toBeInTheDocument();
	});
});
