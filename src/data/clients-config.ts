import { createHttpCompaniesClient } from "./clients/companies-http";
import { createInMemoryCompaniesClient } from "./clients/companies-in-memory";
import { createHttpItemsClient } from "./clients/items-http";
import { createInMemoryItemsClient } from "./clients/items-in-memory";
import { createHttpSuppliersClient } from "./clients/suppliers-http";
import { createInMemorySuppliersClient } from "./clients/suppliers-in-memory";
import type { DataClients } from "./clients-context";

type AdapterMode = "memory" | "http";

interface AdapterConfig {
	companies: AdapterMode;
	items: AdapterMode;
	suppliers: AdapterMode;
}

/**
 * Per-entity adapter mode resolved at boot. Default is "memory" so local dev
 * continues to work while HTTP adapters are under construction. Each entity's
 * mode can be flipped via env vars without touching code in other entities.
 */
function resolveConfig(): AdapterConfig {
	const env = (typeof import.meta !== "undefined" ? import.meta.env : {}) as Record<string, unknown>;
	function read(key: string): AdapterMode {
		return env[key] === "http" ? "http" : "memory";
	}
	return {
		companies: read("VITE_DATA_COMPANIES"),
		items: read("VITE_DATA_ITEMS"),
		suppliers: read("VITE_DATA_SUPPLIERS"),
	};
}

/**
 * Build the production composition root: one client per migrated entity, picked
 * by adapter mode. Tests bypass this and pass their own `DataClients` map to
 * the provider.
 */
export function buildDataClients(): DataClients {
	const config = resolveConfig();
	return {
		companies: config.companies === "http" ? createHttpCompaniesClient() : createInMemoryCompaniesClient(),
		items: config.items === "http" ? createHttpItemsClient() : createInMemoryItemsClient(),
		suppliers: config.suppliers === "http" ? createHttpSuppliersClient() : createInMemorySuppliersClient(),
	};
}
