import type { Modifier } from "@dnd-kit/core";

const DRAG_OVERLAY_CURSOR_GAP = 12;

function getActivatorCoordinates(event: Event | null): { x: number; y: number } | null {
	if (!event) return null;

	if ("clientX" in event && "clientY" in event) {
		const pointerEvent = event as MouseEvent;
		return { x: pointerEvent.clientX, y: pointerEvent.clientY };
	}

	if ("touches" in event || "changedTouches" in event) {
		const touchEvent = event as TouchEvent;
		const touch = touchEvent.touches[0] ?? touchEvent.changedTouches[0];
		if (touch) return { x: touch.clientX, y: touch.clientY };
	}

	return null;
}

export function anchorDragOverlayToCursor({
	activatorEvent,
	activeNodeRect,
	overlayNodeRect,
	transform,
}: Pick<
	Parameters<Modifier>[0],
	"activatorEvent" | "activeNodeRect" | "overlayNodeRect" | "transform"
>): ReturnType<Modifier> {
	const coordinates = getActivatorCoordinates(activatorEvent);
	if (!coordinates || !activeNodeRect) return transform;

	return {
		...transform,
		x: transform.x + coordinates.x - activeNodeRect.left + DRAG_OVERLAY_CURSOR_GAP,
		y: transform.y + coordinates.y - activeNodeRect.top - (overlayNodeRect?.height ?? 0) / 2,
	};
}
