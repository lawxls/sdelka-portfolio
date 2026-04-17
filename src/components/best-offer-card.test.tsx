import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import type { Supplier, SupplierStatus } from "@/data/supplier-types";
import type { CurrentSupplier } from "@/data/types";
import { BestOfferCard } from "./best-offer-card";

function makeSupplier(overrides: Partial<Supplier> = {}): Supplier {
	return {
		id: "s-1",
		itemId: "i-1",
		companyName: "ООО Тест",
		status: "получено_кп" satisfies SupplierStatus,
		archived: false,
		email: "",
		website: "",
		address: "",
		pricePerUnit: 1000,
		tco: 1100,
		rating: null,
		deliveryCost: 100,
		paymentType: "prepayment",
		deferralDays: 0,
		leadTimeDays: 14,
		aiDescription: "",
		aiRecommendations: "",
		documents: [],
		chatHistory: [],
		positionOffers: [],
		...overrides,
	};
}

const currentSupplier: CurrentSupplier = {
	companyName: "ООО Старый",
	deferralDays: 0,
	pricePerUnit: 1200,
};

const itemWithQty = { quantityPerDelivery: 10 };
const itemWithoutQty = { quantityPerDelivery: undefined };

describe("BestOfferCard", () => {
	test("shows empty state when no quotes received", () => {
		render(<BestOfferCard suppliers={[]} item={itemWithQty} currentSupplier={currentSupplier} />);
		expect(screen.getByText(/Ждём первое/)).toBeInTheDocument();
	});

	test("ignores suppliers that haven't sent a quote yet", () => {
		render(
			<BestOfferCard
				suppliers={[makeSupplier({ status: "ждем_ответа", tco: 100 })]}
				item={itemWithQty}
				currentSupplier={currentSupplier}
			/>,
		);
		expect(screen.getByText(/Ждём первое/)).toBeInTheDocument();
	});

	test("ignores archived suppliers", () => {
		render(
			<BestOfferCard
				suppliers={[makeSupplier({ archived: true, tco: 100 })]}
				item={itemWithQty}
				currentSupplier={currentSupplier}
			/>,
		);
		expect(screen.getByText(/Ждём первое/)).toBeInTheDocument();
	});

	test("picks supplier with lowest TCO", () => {
		render(
			<BestOfferCard
				suppliers={[
					makeSupplier({ id: "a", companyName: "Дороже", tco: 2000 }),
					makeSupplier({ id: "b", companyName: "Дешевле", tco: 1500 }),
					makeSupplier({ id: "c", companyName: "Средне", tco: 1700 }),
				]}
				item={itemWithQty}
				currentSupplier={currentSupplier}
			/>,
		);
		expect(screen.getByText("Дешевле")).toBeInTheDocument();
		expect(screen.queryByText("Дороже")).not.toBeInTheDocument();
	});

	test("renders all three metric labels: ТСО/ед., Стоимость, Экономия", () => {
		render(<BestOfferCard suppliers={[makeSupplier()]} item={itemWithQty} currentSupplier={currentSupplier} />);
		expect(screen.getByText("ТСО/ед.")).toBeInTheDocument();
		expect(screen.getByText("Стоимость")).toBeInTheDocument();
		expect(screen.getByText("Экономия")).toBeInTheDocument();
	});

	test("renders Стоимость as batch cost (pricePerUnit × quantityPerDelivery)", () => {
		render(
			<BestOfferCard
				suppliers={[makeSupplier({ pricePerUnit: 1000, tco: 1100 })]}
				item={{ quantityPerDelivery: 10 }}
				currentSupplier={currentSupplier}
			/>,
		);
		const cost = screen.getByText("Стоимость").parentElement?.textContent ?? "";
		expect(cost).toMatch(/10.*000/);
		expect(cost).toContain("₽");
	});

	test("Стоимость is em-dash when quantityPerDelivery missing", () => {
		render(
			<BestOfferCard
				suppliers={[makeSupplier({ pricePerUnit: 1000, tco: 1100 })]}
				item={itemWithoutQty}
				currentSupplier={currentSupplier}
			/>,
		);
		expect(screen.getByText("Стоимость").parentElement?.textContent).toContain("\u2014");
	});

	test("shows positive savings (green) when best is cheaper than current", () => {
		// best batch = 1000 × 10 = 10 000; current batch = 1200 × 10 = 12 000
		// savings% = (12 000 − 10 000) / 12 000 × 100 ≈ +16,7 %
		render(
			<BestOfferCard
				suppliers={[makeSupplier({ pricePerUnit: 1000, tco: 1100 })]}
				item={itemWithQty}
				currentSupplier={currentSupplier}
			/>,
		);
		const savings = screen.getByText(/16[,.]7/);
		expect(savings.textContent).toMatch(/^\+/);
		expect(savings.textContent).toContain("%");
		expect(savings.className).toMatch(/text-green/);
	});

	test("shows negative savings (red) when best is pricier than current", () => {
		// best batch = 1500 × 10 = 15 000; current batch = 1200 × 10 = 12 000
		// savings% = (12 000 − 15 000) / 12 000 × 100 = −25,0 %
		render(
			<BestOfferCard
				suppliers={[makeSupplier({ pricePerUnit: 1500, tco: 1600 })]}
				item={itemWithQty}
				currentSupplier={currentSupplier}
			/>,
		);
		const savings = screen.getByText(/25[,.]0/);
		expect(savings.textContent).toContain("%");
		expect(savings.className).toMatch(/text-red/);
	});

	test("shows em-dash for savings when no current supplier", () => {
		render(<BestOfferCard suppliers={[makeSupplier()]} item={itemWithQty} />);
		expect(screen.getByText("Экономия").parentElement?.textContent).toContain("\u2014");
	});

	test("shows em-dash for savings when quantityPerDelivery missing", () => {
		render(
			<BestOfferCard
				suppliers={[makeSupplier({ pricePerUnit: 1000, tco: 1100 })]}
				item={itemWithoutQty}
				currentSupplier={currentSupplier}
			/>,
		);
		expect(screen.getByText("Экономия").parentElement?.textContent).toContain("\u2014");
	});

	test("renders ТСО/ед. from supplier.tco", () => {
		render(
			<BestOfferCard
				suppliers={[makeSupplier({ pricePerUnit: 1000, tco: 1100 })]}
				item={itemWithQty}
				currentSupplier={currentSupplier}
			/>,
		);
		const tco = screen.getByText("ТСО/ед.").parentElement?.textContent ?? "";
		expect(tco).toMatch(/1.*100/);
		expect(tco).toContain("₽");
	});

	test("calls onSupplierClick when company name button is clicked", async () => {
		const onSupplierClick = vi.fn();
		render(
			<BestOfferCard
				suppliers={[makeSupplier({ id: "s-42", companyName: "ООО Кликни" })]}
				item={itemWithQty}
				currentSupplier={currentSupplier}
				onSupplierClick={onSupplierClick}
			/>,
		);
		await userEvent.click(screen.getByRole("button", { name: /ООО Кликни/ }));
		expect(onSupplierClick).toHaveBeenCalledWith("s-42");
	});

	test("renders company name as plain text when onSupplierClick not provided", () => {
		render(<BestOfferCard suppliers={[makeSupplier()]} item={itemWithQty} currentSupplier={currentSupplier} />);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		expect(screen.getByText("ООО Тест")).toBeInTheDocument();
	});
});
