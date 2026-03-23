import { useInlineEdit } from "@/hooks/use-inline-edit";

export function InlineRenameInput({
	defaultValue,
	onSave,
	onCancel,
}: {
	defaultValue: string;
	onSave: (name: string) => void;
	onCancel: () => void;
}) {
	const { inputRef, handleKeyDown, handleBlur } = useInlineEdit({
		onSave,
		onCancel,
		selectOnMount: true,
		deferFocus: true,
	});

	return (
		<input
			ref={inputRef}
			type="text"
			className="w-full bg-transparent text-sm font-medium outline-none"
			defaultValue={defaultValue}
			spellCheck={false}
			autoComplete="off"
			aria-label="Название закупки"
			onKeyDown={handleKeyDown}
			onBlur={handleBlur}
		/>
	);
}
