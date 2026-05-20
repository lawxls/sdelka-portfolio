import { describe, expect, test } from "vitest";
import { validateName, validateNames } from "./name-validation";

describe("validateName", () => {
	test("accepts Cyrillic letters", () => {
		expect(validateName("Иван")).toBeNull();
		expect(validateName("Пётр")).toBeNull();
		expect(validateName("ЁЛКА")).toBeNull();
	});

	test("accepts Latin letters", () => {
		expect(validateName("John")).toBeNull();
	});

	test("accepts empty (lets allow_blank logic decide required-ness)", () => {
		expect(validateName("")).toBeNull();
	});

	test("tolerates surrounding whitespace but rejects internal whitespace", () => {
		expect(validateName(" Иван")).toBeNull();
		expect(validateName("Иван ")).toBeNull();
		expect(validateName("Иван Иванович")).toBe("Только буквы");
	});

	test("rejects punctuation", () => {
		expect(validateName("Иван-Петров")).toBe("Только буквы");
		expect(validateName("O'Brien")).toBe("Только буквы");
		expect(validateName("Иван.")).toBe("Только буквы");
	});

	test("rejects digits", () => {
		expect(validateName("Иван2")).toBe("Только буквы");
	});
});

describe("validateNames", () => {
	test("returns null when all three names are valid", () => {
		expect(validateNames({ firstName: "Иван", lastName: "Иванов", patronymic: "" })).toBeNull();
	});

	test("returns snake_case keys by default", () => {
		expect(validateNames({ firstName: "Иван!", lastName: "Иванов1", patronymic: "" })).toEqual({
			first_name: "Только буквы",
			last_name: "Только буквы",
		});
	});

	test("honors camelCase key overrides", () => {
		const result = validateNames(
			{ firstName: "Иван-", lastName: "Иванов", patronymic: "Иванович." },
			{ firstName: "firstName", lastName: "lastName", patronymic: "patronymic" },
		);
		expect(result).toEqual({ firstName: "Только буквы", patronymic: "Только буквы" });
	});
});
