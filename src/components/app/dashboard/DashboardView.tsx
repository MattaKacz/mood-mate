import { useCallback, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import type { DashboardSummaryDTO } from "@/types";
import { Button } from "@/components/ui/button";
import { DashboardSummaryCard } from "./DashboardSummaryCard";
import { EntryListCard } from "./EntryListCard";
import { RitualReminderBanner } from "./RitualReminderBanner";

interface DashboardViewProps {
  summary: DashboardSummaryDTO;
  initialTimezone?: string | null;
  userEmail?: string | null;
}

export default function DashboardView({ summary, initialTimezone, userEmail }: DashboardViewProps) {
  const { data, refresh, isRefreshing, hasError } = useDashboardData(summary, initialTimezone);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Miło Cię widzieć {userEmail ? `· ${userEmail}` : ""}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Twój pulpit</h1>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing}>
          <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
          {isRefreshing ? "Odświeżanie…" : "Odśwież"}
        </Button>
      </header>

      {hasError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4" aria-hidden="true" />
          <span>Nie udało się pobrać danych. Spróbuj ponownie.</span>
        </div>
      )}

      {data.ritualReminder && <RitualReminderBanner reminder={data.ritualReminder} />}

      <DashboardSummaryCard
        streak={data.streak}
        trendDirection={data.trendDirection}
        trendDelta={data.trendDelta}
        isRefreshing={isRefreshing}
      />

      <EntryListCard entries={data.entries} />

      <p className="text-center text-sm text-muted-foreground">
        Potrzebujesz pilnej pomocy?{" "}
        <a className="text-primary underline underline-offset-4" href="/crisis-resources">
          Sprawdź zasoby kryzysowe
        </a>
      </p>
    </div>
  );
}

function useDashboardData(initialSummary: DashboardSummaryDTO, timezone?: string | null) {
  const [data, setData] = useState(initialSummary);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const query = timezone ? `?tz=${encodeURIComponent(timezone)}` : "";
      const response = await fetch(`/api/dashboard/summary${query}`, {
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Refresh failed");
      }
      const payload = (await response.json()) as DashboardSummaryDTO;
      setData(payload);
      setHasError(false);
    } catch (error) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error("[DashboardView] Failed to refresh summary", error);
      }
      setHasError(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [timezone]);

  return { data, refresh, isRefreshing, hasError };
}
