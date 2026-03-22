import { useRef } from "react";
import { cn } from "@/lib/utils";

const CODE_LENGTH = 5;
const CELL_KEYS = Array.from({ length: CODE_LENGTH }, (_, i) => `c${i}`);
const ALPHANUMERIC = /^[a-zA-Z0-9]$/;

interface AccessCodeInputProps {
	onComplete: (code: string) => void;
	error?: boolean;
}

export function AccessCodeInput({ onComplete, error = false }: AccessCodeInputProps) {
	const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
	const valuesRef = useRef<string[]>(Array(CODE_LENGTH).fill(""));

	function focusCell(index: number) {
		inputsRef.current[index]?.focus();
	}

	function checkComplete() {
		if (valuesRef.current.every((v) => v.length === 1)) {
			onComplete(valuesRef.current.join(""));
		}
	}

	function handleInput(index: number, e: React.FormEvent<HTMLInputElement>) {
		const value = e.currentTarget.value;

		if (value && !ALPHANUMERIC.test(value)) {
			e.currentTarget.value = valuesRef.current[index];
			return;
		}

		valuesRef.current[index] = value;

		if (value && index < CODE_LENGTH - 1) {
			focusCell(index + 1);
		}

		if (value) {
			checkComplete();
		}
	}

	function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Backspace" && !e.currentTarget.value && index > 0) {
			valuesRef.current[index - 1] = "";
			const prev = inputsRef.current[index - 1];
			if (prev) {
				prev.value = "";
				prev.focus();
			}
			e.preventDefault();
		}
	}

	function handlePaste(index: number, e: React.ClipboardEvent<HTMLInputElement>) {
		e.preventDefault();
		const pasted = e.clipboardData.getData("text/plain");
		const chars = pasted.split("").filter((ch) => ALPHANUMERIC.test(ch));

		for (let i = 0; i < chars.length && index + i < CODE_LENGTH; i++) {
			valuesRef.current[index + i] = chars[i];
			const input = inputsRef.current[index + i];
			if (input) {
				input.value = chars[i];
			}
		}

		const nextIndex = Math.min(index + chars.length, CODE_LENGTH - 1);
		focusCell(nextIndex);
		checkComplete();
	}

	return (
		<div className="flex gap-2" data-error={error || undefined}>
			{CELL_KEYS.map((cellKey, i) => (
				<input
					key={cellKey}
					ref={(el) => {
						inputsRef.current[i] = el;
					}}
					type="text"
					inputMode="text"
					maxLength={1}
					autoComplete="off"
					autoCapitalize="none"
					spellCheck={false}
					className={cn(
						"h-12 w-10 rounded-lg border bg-transparent text-center text-lg font-medium outline-none transition-colors",
						"focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
						error
							? "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"
							: "border-input",
					)}
					onInput={(e) => handleInput(i, e)}
					onKeyDown={(e) => handleKeyDown(i, e)}
					onPaste={(e) => handlePaste(i, e)}
				/>
			))}
		</div>
	);
}
