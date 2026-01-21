import { describe, expect, it } from "vitest";

import { registerSchema } from "@/lib/validation/auth/register.schema";

describe("registerSchema", () => {
  it("normalizuje email i ustawia domyślne wartości", () => {
    const parsed = registerSchema.parse({
      email: "  NewUser@Example.com ",
      password: "StrongPassword1!",
      acceptTerms: true,
      confirmAdult: true,
    });

    expect(parsed).toMatchInlineSnapshot(`
      {
        "acceptTerms": true,
        "confirmAdult": true,
        "email": "newuser@example.com",
        "password": "StrongPassword1!",
        "skipFtue": false,
      }
    `);
  });

  it("odrzuca brak akceptacji regulaminu", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "StrongPassword1!",
      acceptTerms: false,
      confirmAdult: true,
    });

    expect(result.success).toBe(false);
  });

  it("odrzuca brak potwierdzenia pełnoletności", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "StrongPassword1!",
      acceptTerms: true,
      confirmAdult: false,
    });

    expect(result.success).toBe(false);
  });

  it("odrzuca zbyt krótki email i zbyt długi email", () => {
    const tooLongEmail = `${"a".repeat(256)}@example.com`;

    const invalidEmail = registerSchema.safeParse({
      email: "invalid-email",
      password: "StrongPassword1!",
      acceptTerms: true,
      confirmAdult: true,
    });

    const longEmail = registerSchema.safeParse({
      email: tooLongEmail,
      password: "StrongPassword1!",
      acceptTerms: true,
      confirmAdult: true,
    });

    expect(invalidEmail.success).toBe(false);
    expect(longEmail.success).toBe(false);
  });

  it("odrzuca zbyt krótkie i zbyt długie hasło", () => {
    const shortPassword = registerSchema.safeParse({
      email: "user@example.com",
      password: "short",
      acceptTerms: true,
      confirmAdult: true,
    });

    const longPassword = registerSchema.safeParse({
      email: "user@example.com",
      password: "x".repeat(129),
      acceptTerms: true,
      confirmAdult: true,
    });

    expect(shortPassword.success).toBe(false);
    expect(longPassword.success).toBe(false);
  });
});
