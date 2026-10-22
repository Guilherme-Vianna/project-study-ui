import { describe, expect, it } from "vitest";
import {
  EMPTY_PROFILE,
  fieldErrorsFromIssues,
  formatMobilePhone,
  formatPostalCode,
  profileToValues,
  splitDisplayName,
  toPayload,
  validateProfile,
} from "./fields";

const today = "2026-10-21";
const valid = { ...EMPTY_PROFILE, first_name: "Ana", last_name: "Souza" };

describe("masks", () => {
  it("formats CEP and mobile phone while typing", () => {
    expect(formatPostalCode("0131")).toBe("0131");
    expect(formatPostalCode("01310100999")).toBe("01310-100");
    expect(formatMobilePhone("1")).toBe("(1");
    expect(formatMobilePhone("11987")).toBe("(11) 987");
    expect(formatMobilePhone("11987654321")).toBe("(11) 98765-4321");
  });

  it("formats API values for display", () => {
    expect(profileToValues({ mobile_phone: "+5511987654321", postal_code: "01310100" })).toMatchObject({
      mobile_phone: "(11) 98765-4321",
      postal_code: "01310-100",
    });
  });
});

describe("validateProfile", () => {
  it("requires only first and last name", () => {
    expect(validateProfile(valid, { today })).toEqual({});
    expect(validateProfile(EMPTY_PROFILE, { today })).toEqual({
      first_name: "Digite seu nome.",
      last_name: "Digite seu sobrenome.",
    });
  });

  it("follows the API rules for optional fields", () => {
    const errors = validateProfile(
      { ...valid, birth_date: "2030-01-01", postal_code: "0131", mobile_phone: "(11) 3333-4444" },
      { today },
    );
    expect(Object.keys(errors).sort()).toEqual(["birth_date", "mobile_phone", "postal_code"]);
    expect(validateProfile({ ...valid, birth_date: "1899-12-31" }, { today }).birth_date).toMatch(/1900/);
  });

  it("does not let a saved field be cleared", () => {
    expect(validateProfile(valid, { today, locked: ["postal_code"] }).postal_code).toMatch(/não pode ficar em branco/);
  });
});

describe("toPayload", () => {
  it("sends only filled fields with digits for CEP and phone", () => {
    expect(
      toPayload({ ...valid, first_name: " Ana ", postal_code: "01310-100", mobile_phone: "(11) 98765-4321" }),
    ).toEqual({ first_name: "Ana", last_name: "Souza", postal_code: "01310100", mobile_phone: "11987654321" });
  });
});

describe("helpers", () => {
  it("maps FastAPI validation issues to fields", () => {
    expect(fieldErrorsFromIssues([{ loc: ["body", "postal_code"] }, { loc: ["body"] }])).toEqual({
      postal_code: "O CEP precisa ter 8 dígitos, como 01310-100.",
    });
  });

  it("splits a display name like the API does", () => {
    expect(splitDisplayName("Ana Maria Souza")).toEqual({ first_name: "Ana", last_name: "Maria Souza" });
    expect(splitDisplayName(null)).toEqual({ first_name: "", last_name: "" });
  });
});
