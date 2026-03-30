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
	required,
	readOnly,
}: FloatingInputProps) {
	const isPassword = type === "password";
	const [showPassword, setShowPassword] = useState(false);
	const inputType = isPassword && showPassword ? "text" : type;

	return (
		<div className="space-y-1.5">
			<label htmlFor={name} className="text-sm font-medium text-foreground">
				{label}
			</label>
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
						className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						tabIndex={-1}
					>
						{showPassword ? (
							<EyeOff className="size-4" aria-hidden="true" />
						) : (
							<Eye className="size-4" aria-hidden="true" />
						)}
					</button>
				)}
			</div>
			{error && <p className="mt-1 text-xs text-destructive">{error}</p>}
		</div>
	);
}
