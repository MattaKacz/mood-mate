import { describe, expect, it } from "vitest";

import { AppError, createErrorResponse, generateRequestId } from "@/lib/utils/error-handler";

describe("error-handler", () => {
  it("tworzy odpowiedź z AppError", async () => {
    const error = new AppError("AUTH_ERROR", "Brak autoryzacji", 401);
    const response = createErrorResponse(error, "req-1");

    expect(response.status).toBe(401);
    expect(response.headers.get("X-Request-Id")).toBe("req-1");
    await expect(response.json()).resolves.toEqual({ message: "Brak autoryzacji" });
  });

  it("tworzy odpowiedź 500 dla nieoczekiwanego błędu", async () => {
    const response = createErrorResponse(new Error("Boom"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ message: "Wystąpił nieoczekiwany błąd" });
  });

  it("generuje ID żądania z prefiksem", () => {
    const id = generateRequestId();

    expect(id.startsWith("req_")).toBe(true);
    expect(id.length).toBeGreaterThan(10);
  });
});
