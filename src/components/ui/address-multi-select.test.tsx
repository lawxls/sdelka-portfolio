import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import type { AddressSummary } from "@/data/types";
import { AddressMultiSelect } from "./address-multi-select";

const ADDRESSES: AddressSummary[] = [
	{
		id: "a1",
		name: "Главный офис",
		type: "office",
		address: "г. Москва, ул. Ленина, д. 15",
		isMain: true,
	},
	{
		id: "a2",
		name: "Склад",
		type: "warehouse",
		address: "г. Москва, ул. Складская, д. 1",
		isMain: false,
	},
];

function openPopover(user: ReturnType<typeof userEvent.setup>) {
	return user.click(screen.getByRole("button", { name: "Адреса доставки" }));
}

describe("AddressMultiSelect", () => {
	test("trigger shows placeholder when nothing is selected", () => {
		render(<AddressMultiSelect addresses={ADDRESSES} selectedIds={[]} onChange={vi.fn()} />);
		expect(screen.getByRole("button", { name: "Адреса доставки" })).toHaveTextContent("Выберите адреса");
	});

	test("trigger shows selected count when some are selected", () => {
		render(<AddressMultiSelect addresses={ADDRESSES} selectedIds={["a1"]} onChange={vi.fn()} />);
		expect(screen.getByRole("button", { name: "Адреса доставки" })).toHaveTextContent("Выбрано: 1 из 2");
	});

	test("clicking trigger opens popover with address checkboxes", async () => {
		render(<AddressMultiSelect addresses={ADDRESSES} selectedIds={[]} onChange={vi.fn()} />);
		const user = userEvent.setup();
		await openPopover(user);
		expect(screen.getByRole("checkbox", { name: "Главный офис — г. Москва, ул. Ленина, д. 15" })).toBeInTheDocument();
		expect(screen.getByRole("checkbox", { name: "Склад — г. Москва, ул. Складская, д. 1" })).toBeInTheDocument();
	});

	test("checking an address calls onChange with the added id", async () => {
		const onChange = vi.fn();
		render(<AddressMultiSelect addresses={ADDRESSES} selectedIds={[]} onChange={onChange} />);
		const user = userEvent.setup();
		await openPopover(user);
		await user.click(screen.getByRole("checkbox", { name: "Главный офис — г. Москва, ул. Ленина, д. 15" }));
		expect(onChange).toHaveBeenLastCalledWith(["a1"]);
	});

	test("unchecking an address calls onChange with the id removed", async () => {
		const onChange = vi.fn();
		render(<AddressMultiSelect addresses={ADDRESSES} selectedIds={["a1", "a2"]} onChange={onChange} />);
		const user = userEvent.setup();
		await openPopover(user);
		await user.click(screen.getByRole("checkbox", { name: "Склад — г. Москва, ул. Складская, д. 1" }));
		expect(onChange).toHaveBeenLastCalledWith(["a1"]);
	});

	test("«Выбрать все» selects everything when nothing selected", async () => {
		const onChange = vi.fn();
		render(<AddressMultiSelect addresses={ADDRESSES} selectedIds={[]} onChange={onChange} />);
		const user = userEvent.setup();
		await openPopover(user);
		await user.click(screen.getByRole("button", { name: "Выбрать все" }));
		expect(onChange).toHaveBeenLastCalledWith(["a1", "a2"]);
	});

	test("«Снять все» clears selection when everything selected", async () => {
		const onChange = vi.fn();
		render(<AddressMultiSelect addresses={ADDRESSES} selectedIds={["a1", "a2"]} onChange={onChange} />);
		const user = userEvent.setup();
		await openPopover(user);
		await user.click(screen.getByRole("button", { name: "Снять все" }));
		expect(onChange).toHaveBeenLastCalledWith([]);
	});

	test("toggle button label flips between «Выбрать все» and «Снять все»", async () => {
		const { rerender } = render(<AddressMultiSelect addresses={ADDRESSES} selectedIds={[]} onChange={vi.fn()} />);
		const user = userEvent.setup();
		await openPopover(user);
		expect(screen.getByRole("button", { name: "Выбрать все" })).toBeInTheDocument();

		rerender(<AddressMultiSelect addresses={ADDRESSES} selectedIds={["a1", "a2"]} onChange={vi.fn()} />);
		expect(screen.getByRole("button", { name: "Снять все" })).toBeInTheDocument();
	});

	test("trigger is disabled when disabled prop is set", () => {
		render(<AddressMultiSelect addresses={ADDRESSES} selectedIds={[]} onChange={vi.fn()} disabled />);
		expect(screen.getByRole("button", { name: "Адреса доставки" })).toBeDisabled();
	});

	test("trigger is disabled when no addresses are provided", () => {
		render(<AddressMultiSelect addresses={[]} selectedIds={[]} onChange={vi.fn()} />);
		expect(screen.getByRole("button", { name: "Адреса доставки" })).toBeDisabled();
	});

	test("custom placeholder renders when empty", () => {
		render(
			<AddressMultiSelect
				addresses={ADDRESSES}
				selectedIds={[]}
				onChange={vi.fn()}
				placeholder="Сначала выберите компанию"
			/>,
		);
		expect(screen.getByRole("button", { name: "Адреса доставки" })).toHaveTextContent("Сначала выберите компанию");
	});

	test("custom triggerAriaLabel overrides default", () => {
		render(
			<AddressMultiSelect
				addresses={ADDRESSES}
				selectedIds={[]}
				onChange={vi.fn()}
				triggerAriaLabel="Куда доставлять"
			/>,
		);
		expect(screen.getByRole("button", { name: "Куда доставлять" })).toBeInTheDocument();
	});
});
