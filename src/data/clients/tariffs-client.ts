import type { Tariff } from "../domains/tariffs";

/**
 * Public seam for the tariffs catalog. `list` returns every active, public
 * tariff ordered by `display_order` then `slug` — the same order the Django
 * `TariffListView` serves.
 */
export interface TariffsClient {
	list(): Promise<Tariff[]>;
}
