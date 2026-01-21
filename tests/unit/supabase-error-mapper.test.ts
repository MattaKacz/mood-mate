import { describe, expect, it } from "vitest";

import { mapError, mapPostgresError, mapSupabaseAuthError } from "@/lib/utils/supabase-error-mapper";

describe("supabase-error-mapper", () => {
  it("mapuje znany błąd Supabase Auth", () => {
    const authError = Object.assign(new Error("Invalid"), { code: "invalid_credentials" });
    const mapped = mapSupabaseAuthError(authError);

    expect(mapped.httpStatus).toBe(401);
    expect(mapped.code).toBe("invalid_credentials");
    expect(mapped.message).toBe("Nieprawidłowy email lub hasło");
  });

  it("mapuje błąd Supabase na podstawie statusu", () => {
    const httpError = Object.assign(new Error("I'm a teapot"), { status: 418 });
    const mapped = mapSupabaseAuthError(httpError);

    expect(mapped.httpStatus).toBe(418);
    expect(mapped.message).toBe("I'm a teapot");
  });

  it("mapuje błąd Postgresa na kod HTTP", () => {
    const mapped = mapPostgresError({ code: "23505", message: "duplicate" });

    expect(mapped.httpStatus).toBe(409);
    expect(mapped.code).toBe("23505");
  });

  it("mapuje dowolny błąd przez mapError", () => {
    const mapped = mapError({ code: "23502", message: "missing" });

    expect(mapped.httpStatus).toBe(400);
    expect(mapped.code).toBe("23502");
  });
});
