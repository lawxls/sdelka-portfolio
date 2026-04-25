import { useState } from "react";
import { Input } from "@/components/ui/input";
import { formatPhone, parsePhone } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
	value: string;
	onChange: (value: string) => void;
	"aria-label": string;
	id?: string;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	"aria-invalid"?: boolean;
}

const PREFIX = "+7 ";

export function PhoneInput({
	value,
	onChange,
	id,
	placeholder,
	className,
	disabled,
	"aria-label": ariaLabel,
	"aria-invalid": ariaInvalid,
}: PhoneInputProps) {
	const [focused, setFocused] = useState(false);
	const formatted = formatPhone(value);
	const display = focused ? formatted || PREFIX : formatted;

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		const next = e.target.value;
		const nextRaw = parsePhone(next);
		// When the user deletes only formatting chars (e.g. `)` or space), the digit count is unchanged and the display would re-render identical — drop one digit so backspace makes progress.
		const removedFormattingOnly = next.length < display.length && nextRaw === value;
		onChange(removedFormattingOnly ? parsePhone(nextRaw.slice(0, -1)) : nextRaw);
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		// Prevent caret from sliding into the `+7 ` prefix on Backspace.
		if ((e.key === "Backspace" || e.key === "Delete") && (e.currentTarget.selectionStart ?? 0) <= PREFIX.length) {
			const digits = parsePhone(e.currentTarget.value).replace(/^\+7/, "");
			if (digits.length === 0) {
				e.preventDefault();
			}
		}
	}

	return (
		<Input
			id={id}
			type="tel"
			inputMode="tel"
			autoComplete="tel"
			spellCheck={false}
			placeholder={placeholder}
			disabled={disabled}
			aria-label={ariaLabel}
			aria-invalid={ariaInvalid}
			className={cn("tabular-nums", className)}
			value={display}
			onFocus={() => setFocused(true)}
			onBlur={() => setFocused(false)}
			onChange={handleChange}
			onKeyDown={handleKeyDown}
		/>
	);
}
