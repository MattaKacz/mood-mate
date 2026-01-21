import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardSummaryCard } from "@/components/app/dashboard/DashboardSummaryCard";
import type { TrendDirection } from "@/types";

const renderCard = ({
  streak = 4,
  trendDirection = "up",
  trendDelta = 1.2,
  isRefreshing = false,
}: {
  streak?: number;
  trendDirection?: TrendDirection;
  trendDelta?: number;
  isRefreshing?: boolean;
} = {}) =>
  render(
    <DashboardSummaryCard
      streak={streak}
      trendDirection={trendDirection}
      trendDelta={trendDelta}
      isRefreshing={isRefreshing}
    />
  );

const getDeltaSpan = (container: HTMLElement) => container.querySelector("span.font-medium");

describe("DashboardSummaryCard", () => {
  it.each([
    { trendDirection: "up" as const, expected: /Nastrój lekko rośnie/ },
    { trendDirection: "steady" as const, expected: /Stabilny nastrój/ },
    { trendDirection: "down" as const, expected: /Nastrój nieco spadł/ },
  ])("pokazuje opis trendu dla kierunku $trendDirection", ({ trendDirection, expected }) => {
    // Arrange
    renderCard({ trendDirection, trendDelta: 0.8 });

    // Assert
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it.each([
    { trendDirection: "up" as const, expected: "UP" },
    { trendDirection: "steady" as const, expected: "STEADY" },
    { trendDirection: "down" as const, expected: "DOWN" },
  ])("renderuje etykietę kierunku w uppercase: $trendDirection", ({ trendDirection, expected }) => {
    // Arrange
    renderCard({ trendDirection, trendDelta: 0.3 });

    // Assert
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it.each([
    { trendDelta: 1.27, expected: "+1.3" },
    { trendDelta: 0, expected: "+0.0" },
    { trendDelta: -1.24, expected: "-1.2" },
  ])("formatuje trendDelta w UI: $trendDelta", ({ trendDelta, expected }) => {
    // Arrange
    const { container } = renderCard({ trendDelta });

    // Act
    const deltaSpan = getDeltaSpan(container);

    // Assert
    expect(deltaSpan).not.toBeNull();
    expect(deltaSpan?.textContent).toBe(expected);
  });

  it("pokazuje i ukrywa status odświeżania", () => {
    // Arrange
    const { rerender } = renderCard({ isRefreshing: true });

    // Assert
    expect(screen.getByText("Synchronizuję wpisy…")).toBeInTheDocument();

    // Act
    rerender(<DashboardSummaryCard streak={4} trendDirection="up" trendDelta={0.4} isRefreshing={false} />);

    // Assert
    expect(screen.queryByText("Synchronizuję wpisy…")).not.toBeInTheDocument();
  });

  it.each([
    { trendDirection: "up" as const, className: "text-emerald-500" },
    { trendDirection: "down" as const, className: "text-rose-500" },
    { trendDirection: "steady" as const, className: "text-muted-foreground" },
  ])("dobiera ikonę zgodnie z kierunkiem $trendDirection", ({ trendDirection, className }) => {
    // Arrange
    const { container } = renderCard({ trendDirection });

    // Act
    const icon = container.querySelector(`svg.${className}`);

    // Assert
    expect(icon).toBeInTheDocument();
  });
});
