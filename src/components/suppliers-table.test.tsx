import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { _resetSupplierStore, _setSupplierMockDelay } from "@/data/supplier-mock-data";
import { makeSupplier } from "@/test-utils";

import { SuppliersTable } from "./suppliers-table";

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	_resetSupplierStore();
	_setSupplierMockDelay(0, 0);
});

afterEach(() => {
	_resetSupplierStore();
});

function renderTable(
	suppliers = [
		makeSupplier("s1", {
			companyName: "ООО «Альфа»",
			status: "получено_кп",
			pricePerUnit: 1200,
			tco: 2700,
			rating: 85,
			email: "alfa@test.ru",
			website: "https://alfa.ru",
		}),
		makeSupplier("s2", {
			companyName: "ООО «Бета»",
			status: "ждем_ответа",
			email: "beta@test.ru",
			website: "https://beta.ru",
		}),
		makeSupplier("s3", {
			companyName: "ООО «Гамма»",
			status: "переговоры",
			email: "gamma@test.ru",
			website: "https://gamma.ru",
		}),
	],
) {
	return render(
		<QueryClientProvider client={queryClient}>
			<SuppliersTable suppliers={suppliers} isLoading={false} />
		</QueryClientProvider>,
	);
}

describe("SuppliersTable", () => {
	test("renders all column headers", () => {
		renderTable();
		const headers = screen.getAllByRole("columnheader");
		const headerTexts = headers.map((h) => h.textContent?.trim());
		expect(headerTexts).toContain("Компания");
		expect(headerTexts).toContain("Email");
		expect(headerTexts).toContain("Сайт");
		expect(headerTexts).toContain("Цена/ед.");
		expect(headerTexts).toContain("TCO");
		expect(headerTexts).toContain("Рейтинг");
	});

	test("renders supplier rows with company name and status badge", () => {
		renderTable();
		expect(screen.getByText("ООО «Альфа»")).toBeInTheDocument();
		expect(screen.getByText("ООО «Бета»")).toBeInTheDocument();
		expect(screen.getByText("ООО «Гамма»")).toBeInTheDocument();

		// Status badges
		expect(screen.getByText("Получено КП")).toBeInTheDocument();
		expect(screen.getByText("Ждём ответа")).toBeInTheDocument();
		expect(screen.getByText("Переговоры")).toBeInTheDocument();
	});

	test("shows formatted values for КП suppliers", () => {
		renderTable();
		const rows = screen.getAllByRole("row");
		// rows[0] is header, rows[1] is s1 (КП)
		const kpRow = rows[1];
		const cells = within(kpRow).getAllByRole("cell");

		// Price, TCO should contain ₽ (currency formatted), rating should show %
		const priceCell = cells.find((c) => c.textContent?.includes("₽"));
		expect(priceCell).toBeTruthy();
		const ratingCell = cells.find((c) => c.textContent?.includes("85%"));
		expect(ratingCell).toBeTruthy();
		// None of the value cells should be em-dash
		const emDashCount = cells.filter((c) => c.textContent === "\u2014").length;
		expect(emDashCount).toBe(0);
	});

	test("shows em-dash for non-КП suppliers' price, tco, and rating", () => {
		renderTable();
		const rows = screen.getAllByRole("row");
		// rows[2] is s2 (ждем_ответа) — non-КП
		const nonKpRow = rows[2];
		const cells = within(nonKpRow).getAllByRole("cell");

		// Price, TCO, Rating columns (indices 3, 4, 5 after company, email, website)
		// Should contain em-dash
		const emDashCells = cells.filter((c) => c.textContent === "\u2014");
		expect(emDashCells.length).toBe(3);
	});

	test("renders email and website for each supplier", () => {
		renderTable();
		expect(screen.getByText("alfa@test.ru")).toBeInTheDocument();
		expect(screen.getByText("beta@test.ru")).toBeInTheDocument();
		expect(screen.getByText("alfa.ru")).toBeInTheDocument();
		expect(screen.getByText("beta.ru")).toBeInTheDocument();
	});

	test("shows loading skeleton when isLoading is true", () => {
		render(
			<QueryClientProvider client={queryClient}>
				<SuppliersTable suppliers={[]} isLoading={true} />
			</QueryClientProvider>,
		);
		const skeletons = document.querySelectorAll("[data-slot='skeleton']");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	test("shows empty state when no suppliers", () => {
		render(
			<QueryClientProvider client={queryClient}>
				<SuppliersTable suppliers={[]} isLoading={false} />
			</QueryClientProvider>,
		);
		expect(screen.getByText(/нет поставщиков/i)).toBeInTheDocument();
	});
});
