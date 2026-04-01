export interface AnalyticsKpis {
	totalSpend: number;
	totalOverpayment: number;
	totalSavings: number;
	completedCount: number;
	totalCount: number;
	pendingAnalysisCount: number;
	openTasksCount: number;
}

export interface AnalyticsSummaryResponse {
	kpis: AnalyticsKpis;
}
