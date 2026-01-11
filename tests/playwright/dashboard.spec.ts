import { test, expect } from "@playwright/test";

test.describe("Dashboard summary endpoint", () => {
  test("returns 401 for unauthenticated calls", async ({ request }) => {
    const response = await request.get("/api/dashboard/summary");
    expect(response.status(), "should be unauthorized without session cookies").toBe(401);
    const payload = await response.json();
    expect(payload).toEqual(
      expect.objectContaining({
        message: expect.any(String),
      })
    );
  });
});
