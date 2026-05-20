/**
 * Tariffs domain — the public catalog returned by `GET /tariffs/`. Backs the
 * `/settings/tariffs` page. Field shape mirrors `TariffSerializer` on the
 * Django side, projected to camelCase by `djangorestframework-camel-case` on
 * the wire. Prices arrive as decimal strings (`coerce_to_string=True`) and are
 * parsed once at the adapter boundary. `null` limit fields mean "unlimited"
 * (Enterprise).
 *
 * `inquiriesPerMonth` / `inquiriesPerYear` are marketing-card display values;
 * the yearly value can exceed `inquiriesPerMonth × 12` when the yearly plan
 * includes bonus inquiries. The actual quota enforced on usage lives on
 * `monthlyInquiryLimit`.
 */

export type TariffSlug = "start" | "business" | "enterprise" | (string & {});

export type TariffPriceType = "free" | "fixed" | "individual";

export interface TariffFeature {
	position: number;
	name: string;
}

export interface Tariff {
	id: string;
	slug: TariffSlug;
	name: string;
	shortDescription: string;
	fullDescription: string;
	priceType: TariffPriceType;
	/** Monthly price in RUB. `null` when the tariff is free or individual. */
	price: number | null;
	/** Hand-picked yearly total in RUB — not derived from monthly × 12 × discount.
	 * The page uses this directly when present; falls back to the discount-based
	 * computation otherwise. `null` when the tariff is free or individual. */
	yearlyPrice: number | null;
	/** Advertised yearly discount in percent (0–100). May be a rounded
	 * marketing figure when `yearlyPrice` doesn't divide cleanly. */
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
	features: TariffFeature[];
}
