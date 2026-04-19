import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebouncedSearchParam } from "@/hooks/use-debounced-search-param";

export function HeaderSearch() {
	const { current, setDebounced } = useDebouncedSearchParam("q", 300);

	return (
		<div className="group relative">
			<Search
				className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground"
				aria-hidden="true"
			/>
			<Input
				type="search"
				placeholder="Поиск позиций, поставщиков, задач…"
				defaultValue={current}
				onChange={(e) => setDebounced(e.target.value)}
				className="h-8 w-60 rounded-xl border-sidebar-border bg-background/60 pl-9 text-[0.8125rem] placeholder:text-muted-foreground/70 hover:bg-background hover:border-border focus-visible:bg-background md:w-96"
				spellCheck={false}
				autoComplete="off"
			/>
		</div>
	);
}
