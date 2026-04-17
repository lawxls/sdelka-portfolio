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

describe("BestOfferCard", () => {
	test("shows empty state when no quotes received", () => {
		render(<BestOfferCard suppliers={[]} currentSupplier={currentSupplier} />);
		expect(screen.getByText(/Ждём первое/)).toBeInTheDocument();
	});

	test("ignores suppliers that haven't sent a quote yet", () => {
		render(
			<BestOfferCard
				suppliers={[makeSupplier({ status: "ждем_ответа", tco: 100 })]}
				currentSupplier={currentSupplier}
			/>,
		);
		expect(screen.getByText(/Ждём первое/)).toBeInTheDocument();
	});

	test("ignores archived suppliers", () => {
		render(
			<BestOfferCard suppliers={[makeSupplier({ archived: true, tco: 100 })]} currentSupplier={currentSupplier} />,
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
				currentSupplier={currentSupplier}
			/>,
		);
		expect(screen.getByText("Дешевле")).toBeInTheDocument();
		expect(screen.queryByText("Дороже")).not.toBeInTheDocument();
	});

	test("shows positive savings (green) when best is cheaper than current", () => {
		render(
			<BestOfferCard suppliers={[makeSupplier({ pricePerUnit: 1000, tco: 1100 })]} currentSupplier={currentSupplier} />,
		);
		const savings = screen.getByText(/200/);
		expect(savings.textContent).toMatch(/^\u2212/);
		expect(savings.className).toMatch(/text-green/);
	});

	test("shows negative savings (red) when best is pricier than current", () => {
		render(
			<BestOfferCard suppliers={[makeSupplier({ pricePerUnit: 1500, tco: 1600 })]} currentSupplier={currentSupplier} />,
		);
		const savings = screen.getByText(/300/);
		expect(savings.textContent).toMatch(/^\+/);
		expect(savings.className).toMatch(/text-red/);
	});

	test("shows em-dash for savings when no current supplier", () => {
		render(<BestOfferCard suppliers={[makeSupplier()]} />);
		expect(screen.getByText("Экономия").parentElement?.textContent).toContain("\u2014");
	});

	test("calls onSupplierClick when company name button is clicked", async () => {
		const onSupplierClick = vi.fn();
		render(
			<BestOfferCard
				suppliers={[makeSupplier({ id: "s-42", companyName: "ООО Кликни" })]}
				currentSupplier={currentSupplier}
				onSupplierClick={onSupplierClick}
			/>,
		);
		await userEvent.click(screen.getByRole("button", { name: /ООО Кликни/ }));
		expect(onSupplierClick).toHaveBeenCalledWith("s-42");
	});

	test("renders company name as plain text when onSupplierClick not provided", () => {
		render(<BestOfferCard suppliers={[makeSupplier()]} currentSupplier={currentSupplier} />);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		expect(screen.getByText("ООО Тест")).toBeInTheDocument();
	});
});
