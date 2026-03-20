import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Toolbar() {
	return (
		<div className="flex items-center justify-between gap-3 pb-3">
			<div className="flex items-center gap-2">{/* Search and filters — #39 */}</div>
			<Button type="button" onClick={() => {}}>
				<Plus data-icon="inline-start" aria-hidden="true" />
				Создать закупки
			</Button>
		</div>
	);
}
