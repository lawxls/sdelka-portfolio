import type { Tariff, TariffFeature, TariffPriceType, TariffSlug } from "../domains/tariffs";
import { httpClient as defaultHttpClient, type HttpClient } from "../http-client";
import { parseDecimal } from "./items-wire";
import type { TariffsClient } from "./tariffs-client";

interface TariffFeatureWire {
	position: number;
	name: string;
}

interface TariffWire {
	id: string;
	slug: string;
	name: string;
	shortDescription: string;
	fullDescription: string;
	priceType: TariffPriceType;
	/** DRF sends decimal as string when `coerce_to_string=True`; null when unset. */
	price: string | null;
	yearlyPrice: string | null;
	yearlyPriceDiscount: number;
	monthlyInquiryLimit: number | null;
	dailyInquiryLimit: number | null;
	inquiriesPerMonth: number | null;
	inquiriesPerYear: number | null;
	maxEmployees: number | null;
	maxCompanies: number | null;
	dailyEmailLimit: number | null;
	isPopular: boolean;
	displayOrder: number;
	features: TariffFeatureWire[];
}

function toTariff(wire: TariffWire): Tariff {
	return {
		id: wire.id,
		slug: wire.slug as TariffSlug,
		name: wire.name,
		shortDescription: wire.shortDescription,
		fullDescription: wire.fullDescription,
		priceType: wire.priceType,
		price: parseDecimal(wire.price, null),
		yearlyPrice: parseDecimal(wire.yearlyPrice, null),
		yearlyPriceDiscount: wire.yearlyPriceDiscount,
		monthlyInquiryLimit: wire.monthlyInquiryLimit,
		dailyInquiryLimit: wire.dailyInquiryLimit,
		inquiriesPerMonth: wire.inquiriesPerMonth,
		inquiriesPerYear: wire.inquiriesPerYear,
		maxEmployees: wire.maxEmployees,
		maxCompanies: wire.maxCompanies,
		dailyEmailLimit: wire.dailyEmailLimit,
		isPopular: wire.isPopular,
		displayOrder: wire.displayOrder,
		features: wire.features.map((f): TariffFeature => ({ position: f.position, name: f.name })),
	};
}

export function createHttpTariffsClient(http: HttpClient = defaultHttpClient): TariffsClient {
	return {
		list: async () => {
			const wires = await http.get<TariffWire[]>(`/tariffs/`);
			return wires.map(toTariff);
		},
	};
}
