import type { ProcurementStatus } from "./types";

export type { ProcurementStatus };

export interface AnalyticsKpis {
	totalSpend: number;
	totalOverpayment: number;
	totalSavings: number;
	completedCount: number;
	totalCount: number;
	pendingAnalysisCount: number;
	openTasksCount: number;
}

export interface FolderBreakdown {
	folderId: string;
	folderName: string;
	overpayment: number;
	deviationPct: number;
}

export interface AnalyticsSummaryResponse {
	kpis: AnalyticsKpis;
	folderBreakdown?: FolderBreakdown[];
	statusBreakdown?: Record<ProcurementStatus, number>;
}
