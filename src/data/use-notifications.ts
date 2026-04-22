import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import {
	fetchNotificationsMock,
	markAllNotificationsAsReadMock,
	markNotificationAsReadMock,
	type NotificationsPage,
} from "./notifications-mock-data";

const QUERY_KEY = ["notifications"] as const;

export function useNotifications() {
	const query = useQuery({
		queryKey: QUERY_KEY,
		queryFn: fetchNotificationsMock,
	});

	const notifications = query.data?.notifications ?? [];
	const readIds = useMemo(() => new Set(query.data?.readIds ?? []), [query.data?.readIds]);

	const isRead = useCallback((id: string) => readIds.has(id), [readIds]);
	const unreadCount = notifications.reduce((acc, n) => (readIds.has(n.id) ? acc : acc + 1), 0);

	return {
		notifications,
		isRead,
		unreadCount,
		isLoading: query.isLoading,
	};
}

function optimisticallyAddReadIds(queryClient: ReturnType<typeof useQueryClient>, ids: string[]) {
	queryClient.setQueryData<NotificationsPage>(QUERY_KEY, (prev) => {
		if (!prev) return prev;
		const next = new Set(prev.readIds);
		for (const id of ids) next.add(id);
		return { ...prev, readIds: [...next] };
	});
}

export function useMarkNotificationAsRead() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => markNotificationAsReadMock(id),
		onMutate: (id) => {
			optimisticallyAddReadIds(queryClient, [id]);
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
	});
}

export function useMarkAllNotificationsAsRead() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => markAllNotificationsAsReadMock(),
		onMutate: () => {
			const current = queryClient.getQueryData<NotificationsPage>(QUERY_KEY);
			if (current)
				optimisticallyAddReadIds(
					queryClient,
					current.notifications.map((n) => n.id),
				);
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
	});
}
