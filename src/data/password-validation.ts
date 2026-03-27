export function validatePassword(value: string): string | null {
	if (value.length < 8) return "Пароль должен содержать минимум 8 символов";
	if (/^\d+$/.test(value)) return "Пароль не может состоять только из цифр";
	return null;
}

export function validatePasswordWithConfirm(password: string, confirmPassword: string): Record<string, string> | null {
	const error = validatePassword(password);
	if (error) return { password: error };
	if (password !== confirmPassword) return { confirmPassword: "Пароли не совпадают" };
	return null;
}
