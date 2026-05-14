import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { SubscriptionClient } from "@/data/clients/subscription-client";
import { createInMemorySubscriptionClient } from "@/data/clients/subscription-in-memory";
import { _resetMockDelay, _setMockDelay } from "@/data/mock-utils";
import { TestClientsProvider } from "@/data/test-clients-provider";
import { createTestQueryClient } from "@/test-utils";
import { TopUpRequestsDialog } from "./top-up-requests-dialog";

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

function Harness({ subscription }: { subscription: SubscriptionClient }) {
	const [open, setOpen] = useState(true);
	return (
		<TestClientsProvider queryClient={createTestQueryClient()} clients={{ subscription }}>
			<TopUpRequestsDialog open={open} onOpenChange={setOpen} tariffId="business" tariffName="Бизнес" />
		</TestClientsProvider>
	);
}

beforeEach(() => {
	_setMockDelay(0, 0);
});

afterEach(() => {
	vi.restoreAllMocks();
	_resetMockDelay();
});

describe("TopUpRequestsDialog", () => {
	test("shows price per request for the current tariff", () => {
		render(<Harness subscription={createInMemorySubscriptionClient()} />);
		expect(screen.getByTestId("top-up-dialog")).toHaveTextContent("Бизнес");
		expect(screen.getByTestId("top-up-dialog")).toHaveTextContent(/2[\s ]?900 ₽/);
	});

	test("total updates when quantity changes via +", async () => {
		render(<Harness subscription={createInMemorySubscriptionClient()} />);
		const user = userEvent.setup();
		expect(screen.getByTestId("top-up-total")).toHaveTextContent(/2[\s ]?900 ₽/);

		await user.click(screen.getByRole("button", { name: /увеличить/i }));
		await user.click(screen.getByRole("button", { name: /увеличить/i }));

		expect(screen.getByTestId("top-up-total")).toHaveTextContent(/8[\s ]?700 ₽/);
	});

	test("Оплатить calls topUp with the chosen quantity and surfaces success toast", async () => {
		const subscription = createInMemorySubscriptionClient();
		const topUpSpy = vi.spyOn(subscription, "topUp");
		render(<Harness subscription={subscription} />);
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /увеличить/i }));
		await user.click(screen.getByRole("button", { name: "Оплатить" }));

		await waitFor(() => {
			expect(topUpSpy).toHaveBeenCalledWith({ quantity: 2 });
		});
		expect(toast.success).toHaveBeenCalledWith("Добавлено 2 запросов");
	});

	test("quantity cannot drop below 1", async () => {
		render(<Harness subscription={createInMemorySubscriptionClient()} />);
		expect(screen.getByRole("button", { name: /уменьшить/i })).toBeDisabled();
	});
});
