import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { installMockIntersectionObserver, type ObserverRecord } from "@/test-intersection-observer";
import { makeTask } from "@/test-utils";
import { TaskColumn } from "./task-column";

let observers: ObserverRecord[];

beforeEach(() => {
	observers = installMockIntersectionObserver();
});

const defaultProps = {
	status: "assigned" as const,
	label: "Назначено",
	tasks: [makeTask("t1"), makeTask("t2")],
	isLoading: false,
};

describe("TaskColumn infinite scroll", () => {
	it("renders sentinel when hasNextPage is true", () => {
		render(<TaskColumn {...defaultProps} hasNextPage loadMore={vi.fn()} />);
		expect(screen.getByTestId("column-sentinel-assigned")).toBeInTheDocument();
	});

	it("does not render sentinel when hasNextPage is false", () => {
		render(<TaskColumn {...defaultProps} hasNextPage={false} loadMore={vi.fn()} />);
		expect(screen.queryByTestId("column-sentinel-assigned")).not.toBeInTheDocument();
	});

	it("does not render sentinel when hasNextPage is undefined", () => {
		render(<TaskColumn {...defaultProps} />);
		expect(screen.queryByTestId("column-sentinel-assigned")).not.toBeInTheDocument();
	});

	it("calls loadMore when sentinel intersects", () => {
		const loadMore = vi.fn();
		render(<TaskColumn {...defaultProps} hasNextPage loadMore={loadMore} />);

		expect(observers).toHaveLength(1);
		observers[0].callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);

		expect(loadMore).toHaveBeenCalledOnce();
	});

	it("shows loading spinner when isFetchingNextPage is true", () => {
		render(<TaskColumn {...defaultProps} hasNextPage isFetchingNextPage loadMore={vi.fn()} />);
		expect(screen.getByTestId("column-loading-assigned")).toBeInTheDocument();
	});

	it("does not show loading spinner when isFetchingNextPage is false", () => {
		render(<TaskColumn {...defaultProps} hasNextPage loadMore={vi.fn()} />);
		expect(screen.queryByTestId("column-loading-assigned")).not.toBeInTheDocument();
	});
});
