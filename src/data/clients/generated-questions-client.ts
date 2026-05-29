/**
 * Public seam for the procurement generated-questions domain. The wizard's
 * Step 2 fetches clarifying questions via this client. Today the backend
 * returns 3–5 mock questions; future versions will route through an LLM.
 * The wire surface stays the same regardless.
 */

import type { CurrentSupplier, UnloadingType } from "../types";

/** One question + its suggested answer chips as returned by the backend. */
export interface GeneratedQuestion {
	questionText: string;
	suggests: string[];
}

/** Wire-only supplier shape sent to the preview endpoints. Differs from the
 * canonical `CurrentSupplier` by carrying an explicit `deliveryIncluded`
 * boolean — the canonical type overloads `deliveryCost: null` to mean
 * "included", which is ambiguous on the wire vs "user left it blank". */
export interface GenerateQuestionsPreviewCurrentSupplierInput extends Omit<CurrentSupplier, "deliveryCost"> {
	deliveryIncluded: boolean;
	deliveryCost?: number | null;
}

/** Mirrors the «Позиции» card. Optional fields stay omitted when the user
 * leaves them blank so the LLM doesn't reason about zero values that
 * weren't really entered. */
export interface GenerateQuestionsPreviewPositionInput {
	name: string;
	description?: string;
	unit?: string;
	quantityPerDelivery?: number;
	annualQuantity?: number;
	currentSupplier?: GenerateQuestionsPreviewCurrentSupplierInput;
}

export interface GenerateQuestionsPreviewInput {
	positions: GenerateQuestionsPreviewPositionInput[];
	folderId?: string | null;
	additionalInfo?: string;
	/** «Логистика» — pass the address id; the BE resolves to text. */
	deliveryAddressId?: string | null;
	unloading?: UnloadingType | null;
	/** «Дополнительно» */
	analoguesNotAllowed?: boolean;
}

export interface GenerateQuestionsPreviewResponse {
	questions: GeneratedQuestion[];
}

export interface GeneratedQuestionsClient {
	preview(input: GenerateQuestionsPreviewInput): Promise<GenerateQuestionsPreviewResponse>;
}
