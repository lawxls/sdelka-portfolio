import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { DataTable, type DataTableColumn, type DataTableSort } from "./data-table";

interface Row {
	id: string;
	name: string;
	value: number;
}

const ROWS: Row[] = [
	{ id: "r1", name: "Alpha", value: 10 },
	{ id: "r2", name: "Beta", value: 20 },
	{ id: "r3", name: "Gamma", value: 30 },
];

const COLUMNS: DataTableColumn<Row>[] = [
	{ id: "name", header: "Name", cell: (r) => r.name, sortable: true },
	{ id: "value", header: "Value", cell: (r) => r.value, align: "right", sortable: true },
];

function ControlledHarness(props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) {
	const [selectedIds, setSelectedIds] = useState(new Set<string>());
	const [sort, setSort] = useState<DataTableSort | null>(null);

	function handleSelectionChange(idOrAll: string) {
		setSelectedIds((prev) => {
			if (idOrAll === "all") {
				return prev.size === ROWS.length ? new Set() : new Set(ROWS.map((r) => r.id));
			}
			const next = new Set(prev);
			if (next.has(idOrAll)) next.delete(idOrAll);
			else next.add(idOrAll);
			return next;
		});
	}

	function handleSort(field: string) {
		setSort((prev) => {
			if (prev?.field !== field) return { field, direction: "asc" };
			if (prev.direction === "asc") return { field, direction: "desc" };
			return null;
		});
	}

	return (
		<DataTable<Row>
			columns={COLUMNS}
			rows={ROWS}
			getRowId={(r) => r.id}
			selection={{ selectedIds, onChange: handleSelectionChange, getRowLabel: (id) => `Выбрать ${id}` }}
			sort={sort}
			onSort={handleSort}
			{...props}
		/>
	);
}

describe("DataTable", () => {
	test("renders header and rows from column defs", () => {
		render(<ControlledHarness />);
		expect(screen.getByRole("button", { name: /Name/i })).toBeInTheDocument();
		expect(screen.getByText("Alpha")).toBeInTheDocument();
		expect(screen.getByText("Beta")).toBeInTheDocument();
		expect(screen.getByText("Gamma")).toBeInTheDocument();
	});

	test("renders toolbar slot", () => {
		render(<ControlledHarness toolbar={<div data-testid="my-toolbar">Toolbar</div>} />);
		expect(screen.getByTestId("my-toolbar")).toBeInTheDocument();
	});

	test("loading state renders skeleton rows", () => {
		render(<DataTable<Row> columns={COLUMNS} rows={[]} getRowId={(r) => r.id} isLoading loadingRows={3} />);
		const skeletons = document.querySelectorAll("[data-slot='skeleton']");
		// 3 rows * 2 columns = 6 skeletons
		expect(skeletons.length).toBe(6);
	});

	test("empty state shows custom message", () => {
		render(<DataTable<Row> columns={COLUMNS} rows={[]} getRowId={(r) => r.id} emptyMessage="Пусто" />);
		expect(screen.getByText("Пусто")).toBeInTheDocument();
	});

	test("empty state shows filtered message when hasFilters", () => {
		render(
			<DataTable<Row>
				columns={COLUMNS}
				rows={[]}
				getRowId={(r) => r.id}
				emptyMessage="Пусто"
				emptyMessageWhenFiltered="Ничего по фильтру"
				hasFilters
			/>,
		);
		expect(screen.getByText("Ничего по фильтру")).toBeInTheDocument();
	});
});

describe("DataTable selection", () => {
	test("clicking row checkbox toggles selection", async () => {
		const user = userEvent.setup();
		render(<ControlledHarness />);
		const checkboxes = screen.getAllByRole("checkbox");
		// header checkbox + 3 rows
		expect(checkboxes).toHaveLength(4);
		await user.click(checkboxes[1]);
		expect(checkboxes[1]).toHaveAttribute("data-state", "checked");
		await user.click(checkboxes[1]);
		expect(checkboxes[1]).not.toHaveAttribute("data-state", "checked");
	});

	test("header checkbox selects all rows", async () => {
		const user = userEvent.setup();
		render(<ControlledHarness />);
		const checkboxes = screen.getAllByRole("checkbox");
		await user.click(checkboxes[0]);
		expect(checkboxes[1]).toHaveAttribute("data-state", "checked");
		expect(checkboxes[2]).toHaveAttribute("data-state", "checked");
		expect(checkboxes[3]).toHaveAttribute("data-state", "checked");
		expect(checkboxes[0]).toHaveAttribute("data-state", "checked");
	});

	test("header checkbox toggles off when all selected", async () => {
		const user = userEvent.setup();
		render(<ControlledHarness />);
		const checkboxes = screen.getAllByRole("checkbox");
		await user.click(checkboxes[0]);
		await user.click(checkboxes[0]);
		expect(checkboxes[1]).not.toHaveAttribute("data-state", "checked");
	});

	test("uses getRowLabel for accessible aria-label", () => {
		render(<ControlledHarness />);
		expect(screen.getByRole("checkbox", { name: "Выбрать r1" })).toBeInTheDocument();
	});
});

describe("DataTable sort", () => {
	test("sort click cycles none → asc → desc → none", async () => {
		const user = userEvent.setup();
		render(<ControlledHarness />);
		const nameBtn = screen.getByRole("button", { name: /Name/i });

		await user.click(nameBtn);
		expect(within(nameBtn).getByTestId("sort-asc")).toBeInTheDocument();

		await user.click(nameBtn);
		expect(within(nameBtn).getByTestId("sort-desc")).toBeInTheDocument();

		await user.click(nameBtn);
		expect(within(nameBtn).queryByTestId("sort-asc")).not.toBeInTheDocument();
		expect(within(nameBtn).queryByTestId("sort-desc")).not.toBeInTheDocument();
	});

	test("non-sortable columns render header without button", () => {
		const cols: DataTableColumn<Row>[] = [{ id: "name", header: "Name", cell: (r) => r.name }];
		render(<DataTable<Row> columns={cols} rows={ROWS} getRowId={(r) => r.id} />);
		expect(screen.queryByRole("button", { name: /Name/i })).not.toBeInTheDocument();
		expect(screen.getByText("Name")).toBeInTheDocument();
	});
});

describe("DataTable context menu", () => {
	test("right-clicking a row reveals row actions and selecting invokes handler", () => {
		const archive = vi.fn();
		render(
			<DataTable<Row>
				columns={COLUMNS}
				rows={ROWS}
				getRowId={(r) => r.id}
				rowActions={(row) => [{ label: "Архивировать", onSelect: () => archive(row.id) }]}
			/>,
		);
		const rows = screen.getAllByRole("row");
		fireEvent.contextMenu(rows[1]);
		const menuItem = screen.getByText("Архивировать");
		fireEvent.click(menuItem);
		expect(archive).toHaveBeenCalledWith("r1");
	});
});

describe("DataTable row click", () => {
	test("clicking a row calls onRowClick with row id", async () => {
		const user = userEvent.setup();
		const onRowClick = vi.fn();
		render(<DataTable<Row> columns={COLUMNS} rows={ROWS} getRowId={(r) => r.id} onRowClick={onRowClick} />);
		const rows = screen.getAllByRole("row");
		await user.click(rows[1]);
		expect(onRowClick).toHaveBeenCalledWith("r1");
	});

	test("clicking checkbox does not bubble to onRowClick", async () => {
		const user = userEvent.setup();
		const onRowClick = vi.fn();
		render(
			<DataTable<Row>
				columns={COLUMNS}
				rows={ROWS}
				getRowId={(r) => r.id}
				selection={{ selectedIds: new Set(), onChange: vi.fn() }}
				onRowClick={onRowClick}
			/>,
		);
		const checkboxes = screen.getAllByRole("checkbox");
		await user.click(checkboxes[1]);
		expect(onRowClick).not.toHaveBeenCalled();
	});
});

describe("DataTable pinned rows", () => {
	const pinned: Row = { id: "p1", name: "Pinned", value: 99 };

	test("renders pinned row above data rows", () => {
		render(<ControlledHarness pinnedRows={[pinned]} />);
		const rows = screen.getAllByRole("row");
		// header + pinned + 3 data rows
		expect(rows).toHaveLength(5);
		expect(rows[1]).toHaveAttribute("data-testid", "data-table-pinned-row");
		expect(within(rows[1]).getByText("Pinned")).toBeInTheDocument();
	});

	test("pinned row does not render checkbox", () => {
		render(<ControlledHarness pinnedRows={[pinned]} />);
		// header (1) + 3 data rows = 4 checkboxes (pinned has none)
		const checkboxes = screen.getAllByRole("checkbox");
		expect(checkboxes).toHaveLength(4);
	});

	test("pinned row uses isPinned ctx in cell render", () => {
		const cols: DataTableColumn<Row>[] = [
			{ id: "name", header: "Name", cell: (r, ctx) => (ctx.isPinned ? `[PIN] ${r.name}` : r.name) },
		];
		render(<DataTable<Row> columns={cols} rows={ROWS} getRowId={(r) => r.id} pinnedRows={[pinned]} />);
		expect(screen.getByText("[PIN] Pinned")).toBeInTheDocument();
		expect(screen.getByText("Alpha")).toBeInTheDocument();
	});

	test("pinned row has no context menu actions", () => {
		const archive = vi.fn();
		render(
			<DataTable<Row>
				columns={COLUMNS}
				rows={ROWS}
				getRowId={(r) => r.id}
				pinnedRows={[pinned]}
				rowActions={(row) => [{ label: "Архивировать", onSelect: () => archive(row.id) }]}
			/>,
		);
		fireEvent.contextMenu(screen.getByTestId("data-table-pinned-row"));
		expect(screen.queryByText("Архивировать")).not.toBeInTheDocument();
	});
});

describe("DataTable mobile cards", () => {
	test("renders mobileCardRender output instead of table", () => {
		render(
			<DataTable<Row>
				columns={COLUMNS}
				rows={ROWS}
				getRowId={(r) => r.id}
				isMobile
				mobileCardRender={(r) => <div data-testid={`card-${r.id}`}>{r.name}</div>}
			/>,
		);
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
		expect(screen.getByTestId("card-r1")).toBeInTheDocument();
		expect(screen.getByTestId("card-r3")).toBeInTheDocument();
	});

	test("renders pinned card with isPinned ctx", () => {
		const pinned: Row = { id: "p1", name: "Pinned", value: 99 };
		render(
			<DataTable<Row>
				columns={COLUMNS}
				rows={ROWS}
				getRowId={(r) => r.id}
				pinnedRows={[pinned]}
				isMobile
				mobileCardRender={(r, ctx) => <div data-testid={ctx.isPinned ? "card-pinned" : `card-${r.id}`}>{r.name}</div>}
			/>,
		);
		expect(screen.getByTestId("card-pinned")).toBeInTheDocument();
		expect(screen.getByTestId("data-table-pinned-card")).toBeInTheDocument();
	});

	test("mobile loading state renders skeleton cards", () => {
		render(
			<DataTable<Row>
				columns={COLUMNS}
				rows={[]}
				getRowId={(r) => r.id}
				isMobile
				isLoading
				loadingRows={3}
				mobileCardRender={(r) => <div>{r.name}</div>}
			/>,
		);
		expect(screen.getAllByTestId("data-table-card-skeleton")).toHaveLength(3);
	});

	test("mobile empty state shows message", () => {
		render(
			<DataTable<Row>
				columns={COLUMNS}
				rows={[]}
				getRowId={(r) => r.id}
				isMobile
				emptyMessage="Пусто"
				mobileCardRender={(r) => <div>{r.name}</div>}
			/>,
		);
		expect(screen.getByText("Пусто")).toBeInTheDocument();
	});
});
