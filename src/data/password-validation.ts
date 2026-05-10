export function validatePassword(value: string): string | null {
	if (value.length < 10) return "Пароль должен содержать минимум 10 символов";
	if (/^\d+$/.test(value)) return "Пароль не может состоять только из цифр";
	return null;
}

interface FieldNames {
	password?: string;
	confirm?: string;
}

/** Field-error keys default to (`password`, `password_confirm`) — matching the
 * register API payload — but can be overridden so the reset-password flow can
 * key by (`new_password`, `new_password_confirm`) without a remap layer. */
export function validatePasswordWithConfirm(
	password: string,
	confirmPassword: string,
	fields: FieldNames = {},
): Record<string, string> | null {
	const passwordKey = fields.password ?? "password";
	const confirmKey = fields.confirm ?? "password_confirm";
	const error = validatePassword(password);
	if (error) return { [passwordKey]: error };
	if (password !== confirmPassword) return { [confirmKey]: "Пароли не совпадают" };
	return null;
}
