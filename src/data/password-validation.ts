export function validatePassword(value: string): string | null {
	if (value.length < 8) return "Пароль должен содержать минимум 8 символов";
	if (/^\d+$/.test(value)) return "Пароль не может состоять только из цифр";
	return null;
}

/** Field-error keys match the API payload (`password`, `password_confirm`)
 * so the form can blend backend ValidationError responses with these
 * client-side checks without remapping. */
export function validatePasswordWithConfirm(password: string, confirmPassword: string): Record<string, string> | null {
	const error = validatePassword(password);
	if (error) return { password: error };
	if (password !== confirmPassword) return { password_confirm: "Пароли не совпадают" };
	return null;
}
