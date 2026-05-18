import { useState } from "react";
import { formatPhone, parsePhone } from "@/lib/format";
import { cn } from "@/lib/utils";

interface FloatingPhoneInputProps {
	label: string;
	name: string;
	value: string;
	onChange: (rawValue: string) => void;
	error?: string | null;
	required?: boolean;
}

const PREFIX = "+7 ";

export function FloatingPhoneInput({ label, name, value, onChange, error, required }: FloatingPhoneInputProps) {
	const [focused, setFocused] = useState(false);
	const formatted = formatPhone(value);
	const display = focused ? formatted || PREFIX : formatted;

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		const next = e.target.value;
		const nextRaw = parsePhone(next);
		// Same trick as PhoneInput: when only formatting chars were removed, drop one digit so backspace makes progress.
		const removedFormattingOnly = next.length < display.length && nextRaw === value;
		onChange(removedFormattingOnly ? parsePhone(nextRaw.slice(0, -1)) : nextRaw);
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if ((e.key === "Backspace" || e.key === "Delete") && (e.currentTarget.selectionStart ?? 0) <= PREFIX.length) {
			const digits = parsePhone(e.currentTarget.value).replace(/^\+7/, "");
			if (digits.length === 0) e.preventDefault();
		}
	}

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
			<input
				id={name}
				name={name}
				type="tel"
				inputMode="tel"
				autoComplete="tel"
				spellCheck={false}
				aria-invalid={error ? true : undefined}
				className={cn(
					"block h-10 w-full rounded-lg border bg-transparent px-3 text-sm tabular-nums outline-none transition-colors",
					"focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
					"aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
					"dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
					error ? "border-destructive" : "border-input",
				)}
				value={display}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
			/>
			{error && <p className="mt-1 text-xs text-destructive">{error}</p>}
		</div>
	);
}
