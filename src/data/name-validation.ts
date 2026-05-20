// Mirrors the backend rule in `sdelka_django/users/validators.py`:
// only Cyrillic + Latin letters, no internal whitespace, hyphens, apostrophes,
// digits, or other punctuation. `*` not `+` so empty patronymic strings pass —
// callers enforce required-ness separately for first/last name. We trim
// leading/trailing whitespace before validating so a stray surrounding space
// isn't surfaced as a confusing "only letters" error.
const NAME_REGEX = /^[A-Za-zА-Яа-яЁё]*$/;

const NAME_ERROR = "Только буквы";

export function validateName(value: string): string | null {
	if (!NAME_REGEX.test(value.trim())) return NAME_ERROR;
	return null;
}

interface NameFields {
	firstName: string;
	lastName: string;
	patronymic: string;
}

interface NameKeyOverrides {
	firstName?: string;
	lastName?: string;
	patronymic?: string;
}

/** Returns field-keyed errors for a name triple, or null if all pass. The key
 * overrides let callers match either snake_case backend payloads
 * (`first_name`) or camelCase form state keys (`firstName`). */
export function validateNames(values: NameFields, keys: NameKeyOverrides = {}): Record<string, string> | null {
	const out: Record<string, string> = {};
	const firstNameError = validateName(values.firstName);
	if (firstNameError) out[keys.firstName ?? "first_name"] = firstNameError;
	const lastNameError = validateName(values.lastName);
	if (lastNameError) out[keys.lastName ?? "last_name"] = lastNameError;
	const patronymicError = validateName(values.patronymic);
	if (patronymicError) out[keys.patronymic ?? "patronymic"] = patronymicError;
	return Object.keys(out).length ? out : null;
}
