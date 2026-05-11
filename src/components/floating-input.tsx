import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface FloatingInputProps {
	label: string;
	name: string;
	type?: string;
	value?: string;
	onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
	error?: string | null;
	autoComplete?: string;
	prefix?: string;
	inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
	maxLength?: number;
	required?: boolean;
	readOnly?: boolean;
}

export function FloatingInput({
	label,
	name,
	type = "text",
	value,
	onChange,
	error,
	autoComplete,
	prefix,
	inputMode,
	maxLength,
	required,
	readOnly,
}: FloatingInputProps) {
	const isPassword = type === "password";
	const [showPassword, setShowPassword] = useState(false);
	const inputType = isPassword && showPassword ? "text" : type;

	return (
		<div className="space-y-1.5">
			<div className="flex items-baseline gap-0.5">
				<label htmlFor={name} className="text-sm font-medium text-foreground">
					{label}
				</label>
				{required && (
					<span aria-hidden="true" className="text-sm font-medium text-destructive">
						*
					</span>
				)}
			</div>
			<div className="relative">
				{prefix && (
					<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
						{prefix}
					</span>
				)}
				<input
					id={name}
					name={name}
					type={inputType}
					value={value}
					onChange={onChange}
					autoComplete={autoComplete}
					inputMode={inputMode}
					maxLength={maxLength}
					required={required}
					readOnly={readOnly}
					spellCheck={false}
					aria-invalid={error ? true : undefined}
					className={cn(
						"h-10 w-full rounded-lg border bg-transparent text-sm outline-none transition-colors",
						"focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
						"aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
						"dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
						prefix ? "pl-9 pr-3" : "px-3",
						isPassword ? "pr-10" : "",
						readOnly ? "cursor-default bg-muted text-muted-foreground" : "",
						error ? "border-destructive" : "border-input",
					)}
				/>
				{isPassword && (
					<button
						type="button"
						onClick={() => setShowPassword((s) => !s)}
						aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
						className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
						tabIndex={-1}
					>
						<span className="relative size-4">
							<Eye
								aria-hidden="true"
								className={cn(
									"absolute inset-0 transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
									showPassword ? "scale-[0.25] opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-0",
								)}
							/>
							<EyeOff
								aria-hidden="true"
								className={cn(
									"absolute inset-0 transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
									showPassword ? "scale-100 opacity-100 blur-0" : "scale-[0.25] opacity-0 blur-[4px]",
								)}
							/>
						</span>
					</button>
				)}
			</div>
			{error && <p className="mt-1 text-xs text-destructive">{error}</p>}
		</div>
	);
}
