import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAddMoodMutation } from "@/components/hooks/useAddMoodMutation";

const payload = {
  score: 3,
  note: "ok",
  tags: [],
  requestSuggestion: false,
};

describe("useAddMoodMutation", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", {
      href: "http://localhost/app",
      pathname: "/app/add-mood",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("zwraca wynik po sukcesie i czyści błąd", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          entry: {
            id: 1,
            score: 3,
            note: "ok",
            tags: [],
            createdAt: "2025-01-01T10:00:00Z",
            updatedAt: "2025-01-01T10:00:00Z",
          },
        }),
        { status: 200 }
      )
    );

    const { result } = renderHook(() => useAddMoodMutation());
    let response: unknown;

    await act(async () => {
      response = await result.current.mutate(payload);
    });

    expect((response as { entry: { id: number } }).entry.id).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("przekierowuje przy 401 i ustawia błąd auth", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: "AUTH_ERROR", message: "Expired" }), { status: 401 })
    );

    const { result } = renderHook(() => useAddMoodMutation());
    let thrown: unknown;

    await act(async () => {
      try {
        await result.current.mutate(payload);
      } catch (error) {
        thrown = error;
      }
    });

    expect(thrown).toMatchObject({
      code: "AUTH_ERROR",
      message: "Sesja wygasła. Przekierowuję do logowania...",
    });
    expect(globalThis.location.href).toBe("/login?redirectTo=%2Fapp%2Fadd-mood");
    await waitFor(() => expect(result.current.error?.code).toBe("AUTH_ERROR"));
  });

  it("mapuje błędy 4xx/5xx na ApiError", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: "VALIDATION_ERROR", message: "Bad" }), { status: 400 })
    );

    const { result } = renderHook(() => useAddMoodMutation());
    let thrown: unknown;

    await act(async () => {
      try {
        await result.current.mutate(payload);
      } catch (error) {
        thrown = error;
      }
    });

    expect(thrown).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Bad",
    });
    await waitFor(() => expect(result.current.error?.code).toBe("VALIDATION_ERROR"));
    act(() => result.current.reset());
    expect(result.current.error).toBeNull();
  });

  it("ustawia isLoading na czas trwania żądania", async () => {
    let resolveFetch: (value: Response) => void = () => undefined;
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      })
    );

    const { result } = renderHook(() => useAddMoodMutation());
    let mutationPromise: Promise<unknown>;

    act(() => {
      mutationPromise = result.current.mutate(payload);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    await act(async () => {
      resolveFetch(
        new Response(
          JSON.stringify({
            entry: {
              id: 2,
              score: 3,
              note: "ok",
              tags: [],
              createdAt: "2025-01-01T10:00:00Z",
              updatedAt: "2025-01-01T10:00:00Z",
            },
          }),
          { status: 200 }
        )
      );
      await mutationPromise;
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});
