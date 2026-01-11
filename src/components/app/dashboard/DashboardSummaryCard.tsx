import type { ReactElement } from "react";
import { Flame, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrendDirection } from "@/types";

interface DashboardSummaryCardProps {
  streak: number;
  trendDirection: TrendDirection;
  trendDelta: number;
  isRefreshing?: boolean;
}

const SUMMARY_COPY: {
  streakLabel: string;
  trendLabel: string;
  trendDescriptions: Record<TrendDirection, string>;
  encouragement: Record<TrendDirection, string>;
  refreshHint: string;
} = {
  streakLabel: "Obecna seria",
  trendLabel: "Trend nastroju (7 dni)",
  trendDescriptions: {
    up: "Nastrój lekko rośnie",
    steady: "Stabilny nastrój",
    down: "Nastrój nieco spadł",
  },
  encouragement: {
    up: "Kontynuuj krótki rytuał – działa.",
    steady: "Małe, powtarzalne kroki też robią różnicę.",
    down: "Daj sobie trochę łagodności dzisiaj.",
  },
  refreshHint: "Synchronizuję wpisy…",
};

const trendIconMap: Record<TrendDirection, ReactElement> = {
  up: <TrendingUp className="size-5 text-emerald-500" aria-hidden="true" />,
  down: <TrendingDown className="size-5 text-rose-500" aria-hidden="true" />,
  steady: <Minus className="size-5 text-muted-foreground" aria-hidden="true" />,
};

export function DashboardSummaryCard({ streak, trendDirection, trendDelta, isRefreshing }: DashboardSummaryCardProps) {
  const copy = SUMMARY_COPY;
  return (
    <Card className="h-full border-border/70 shadow-sm">
      <CardHeader className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{copy.streakLabel}</p>
            <CardTitle className="mt-1 flex items-center gap-2 text-4xl font-semibold">
              <Flame className="size-8 text-amber-500" aria-hidden="true" />
              {streak}
            </CardTitle>
          </div>
          {isRefreshing && (
            <p className="text-xs text-muted-foreground" role="status">
              {copy.refreshHint}
            </p>
          )}
        </div>

        <div>
          <p className="text-sm text-muted-foreground">{copy.trendLabel}</p>
          <div className="mt-2 flex items-center gap-3 rounded-xl border border-border/60 bg-background/70 px-4 py-3">
            {trendIconMap[trendDirection]}
            <div>
              <CardDescription className="text-xs uppercase tracking-wide text-muted-foreground">
                {trendDirection.toUpperCase()}
              </CardDescription>
              <p className="text-sm text-foreground">
                {copy.trendDescriptions[trendDirection]} (
                <span className="font-medium">
                  {trendDelta >= 0 ? "+" : ""}
                  {trendDelta.toFixed(1)}
                </span>
                )
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground">{copy.encouragement[trendDirection]}</p>
      </CardContent>
    </Card>
  );
}
