import { Search } from "lucide-react";
import { useRef } from "react";
import { useSearchParams } from "react-router";
import { Input } from "@/components/ui/input";
import { useMountEffect } from "@/hooks/use-mount-effect";

export function HeaderSearch() {
	const [params, setParams] = useSearchParams();
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	useMountEffect(() => () => clearTimeout(debounceRef.current));

	function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
		const value = e.target.value;
		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			setParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					if (value) next.set("q", value);
					else next.delete("q");
					return next;
				},
				{ replace: true },
			);
		}, 300);
	}

	return (
		<div className="group relative">
			<Search
				className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground"
				aria-hidden="true"
			/>
			<Input
				type="search"
				placeholder="Поиск…"
				defaultValue={params.get("q") ?? ""}
				onChange={handleInput}
				className="h-8 w-52 rounded-xl border-sidebar-border bg-background/60 pl-9 text-[0.8125rem] placeholder:text-muted-foreground/70 hover:bg-background hover:border-border focus-visible:bg-background md:w-80"
				spellCheck={false}
				autoComplete="off"
			/>
		</div>
	);
}
