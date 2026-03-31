import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test-msw";
import { createTestQueryClient, makeTask, mockHostname } from "@/test-utils";
import { TaskDrawer } from "./task-drawer";

vi.mock("sonner", () => ({
	toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

const unansweredTask = makeTask("task-1", {
	name: "Согласование цены на арматуру",
	item: { id: "i-1", name: "Арматура А500С", companyId: "c-1" },
	createdAt: "2026-03-01T10:00:00.000Z",
	description: "Поставщик прислал обновлённое КП. Необходимо проверить соответствие спецификации и подтвердить объёмы.",
	status: "assigned",
});

const completedTask = makeTask("task-51", {
	name: "Завершённая задача",
	status: "completed",
	completedResponse: "Согласовано. Условия поставки подтверждены, договор направлен на подпись.",
});

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = createTestQueryClient();
	mockHostname("acme.localhost");
	localStorage.setItem("auth-access-token", "test-token");
	localStorage.setItem("auth-refresh-token", "test-refresh");

	server.use(
		http.get("/api/v1/tasks/:id/", ({ params }) => {
			if (params.id === "task-1") return HttpResponse.json(unansweredTask);
			if (params.id === "task-51") return HttpResponse.json(completedTask);
			return HttpResponse.json({ detail: "Not found" }, { status: 404 });
		}),
		http.patch("/api/v1/tasks/:id/status/", () => {
			return HttpResponse.json({ ...unansweredTask, status: "completed", completedResponse: "Done" });
		}),
	);
});

afterEach(() => {
	localStorage.clear();
});

function renderDrawer(taskId: string | null, onClose = vi.fn()) {
	return {
		onClose,
		...render(
			<QueryClientProvider client={queryClient}>
				<TaskDrawer taskId={taskId} onClose={onClose} />
			</QueryClientProvider>,
		),
	};
}

const datetimeFmt = new Intl.DateTimeFormat("ru-RU", {
	day: "numeric",
	month: "long",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
});

describe("TaskDrawer", () => {
	it("displays task name, item name, created date, and description", async () => {
		renderDrawer("task-1");

		await waitFor(() => {
			expect(screen.getByText("Согласование цены на арматуру")).toBeInTheDocument();
		});
		expect(screen.getByText("Арматура А500С")).toBeInTheDocument();
		expect(screen.getByText(/Поставщик прислал обновлённое КП/)).toBeInTheDocument();

		const expectedDate = datetimeFmt.format(new Date("2026-03-01T10:00:00.000Z"));
		expect(screen.getByText(expectedDate)).toBeInTheDocument();
	});

	it("shows answer form with textarea and submit button for unanswered tasks", async () => {
		renderDrawer("task-1");

		await waitFor(() => {
			expect(screen.getByPlaceholderText("Введите ответ…")).toBeInTheDocument();
		});
		expect(screen.getByRole("button", { name: "Отправить" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Прикрепить файл" })).toBeInTheDocument();
	});

	it("disables submit button when textarea is empty", async () => {
		renderDrawer("task-1");

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Отправить" })).toBeDisabled();
		});
	});

	it("submitting answer calls mutation and closes drawer", async () => {
		const onClose = vi.fn();
		renderDrawer("task-1", onClose);
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByPlaceholderText("Введите ответ…")).toBeInTheDocument();
		});

		await user.type(screen.getByPlaceholderText("Введите ответ…"), "Принято в работу");
		await user.click(screen.getByRole("button", { name: "Отправить" }));

		await waitFor(() => {
			expect(onClose).toHaveBeenCalled();
		});
	});

	it("shows read-only answer for completed tasks", async () => {
		renderDrawer("task-51");

		await waitFor(() => {
			expect(screen.getByText(/Согласовано\. Условия поставки подтверждены/)).toBeInTheDocument();
		});
		expect(screen.getByText("Ответ")).toBeInTheDocument();
		expect(screen.queryByPlaceholderText("Введите ответ…")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Отправить" })).not.toBeInTheDocument();
	});

	it("shows status badge for completed tasks", async () => {
		renderDrawer("task-51");

		await waitFor(() => {
			expect(screen.getByText("Завершено")).toBeInTheDocument();
		});
	});

	it("shows status dropdown for unanswered tasks", async () => {
		renderDrawer("task-1");

		await waitFor(() => {
			expect(screen.getByRole("combobox", { name: "Статус задачи" })).toBeInTheDocument();
		});
	});

	it("shows selected files with remove buttons after upload", async () => {
		renderDrawer("task-1");
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByPlaceholderText("Введите ответ…")).toBeInTheDocument();
		});

		const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
		const file = new File(["content"], "document.pdf", { type: "application/pdf" });
		await user.upload(fileInput, file);

		expect(screen.getByText("document.pdf")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Удалить document.pdf" })).toBeInTheDocument();
	});

	it("removes file when remove button is clicked", async () => {
		renderDrawer("task-1");
		const user = userEvent.setup();

		await waitFor(() => {
			expect(screen.getByPlaceholderText("Введите ответ…")).toBeInTheDocument();
		});

		const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
		await user.upload(fileInput, new File(["data"], "report.xlsx", { type: "application/vnd.ms-excel" }));
		expect(screen.getByText("report.xlsx")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Удалить report.xlsx" }));
		expect(screen.queryByText("report.xlsx")).not.toBeInTheDocument();
	});

	it("does not render drawer content when taskId is null", () => {
		renderDrawer(null);
		expect(screen.queryByPlaceholderText("Введите ответ…")).not.toBeInTheDocument();
	});

	it("renders as bottom sheet when isMobile", async () => {
		render(
			<QueryClientProvider client={queryClient}>
				<TaskDrawer taskId="task-1" onClose={vi.fn()} isMobile />
			</QueryClientProvider>,
		);

		await waitFor(() => {
			const sheetContent = document.querySelector("[data-slot='sheet-content']");
			expect(sheetContent?.getAttribute("data-side")).toBe("bottom");
		});
	});
});
