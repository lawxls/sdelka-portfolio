import { useIntersectionObserver } from "@/hooks/use-intersection-observer";

export function LoadMoreSentinel({ loadMore }: { loadMore: () => void }) {
	const ref = useIntersectionObserver(loadMore);
	return <div ref={ref} className="h-px" />;
}
