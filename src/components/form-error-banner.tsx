import type { ReactNode } from "react";

interface FormErrorBannerProps {
	children: ReactNode;
}

export function FormErrorBanner({ children }: FormErrorBannerProps) {
	return (
		<div
			role="alert"
			className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
		>
			{children}
		</div>
	);
}
