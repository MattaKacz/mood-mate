import { describe, expect, it } from "vitest";

import { loginSchema } from "@/lib/validation/auth/login.schema";

describe("loginSchema", () => {
  it("normalizuje email i akceptuje poprawne dane", () => {
    const result = loginSchema.parse({
      email: "  Test@Example.com ",
      password: "strong-password",
    });

    expect(result.email).toBe("test@example.com");
    expect(result.password).toBe("strong-password");
  });

  it("odrzuca niepoprawny email", () => {
    const result = loginSchema.safeParse({
      email: "bad-email",
      password: "strong-password",
    });

    expect(result.success).toBe(false);
  });

  it("odrzuca zbyt krótkie hasło", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "short",
    });

    expect(result.success).toBe(false);
  });
});
