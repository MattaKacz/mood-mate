import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { getMoodTagOptions, getMoodTagLabel, isMoodTag, type MoodTagId } from "@/lib/constants/tag-catalog";
import type { MoodEntriesListDTO, MoodEntryListItemDTO } from "@/types";

const MOOD_FACES: Record<number, string> = {
  1: "😞",
  2: "😕",
  3: "😐",
  4: "🙂",
  5: "😄",
};

interface HistoryViewProps {
  initialPage?: number;
}

type SortOption = "created_at" | "score";
type OrderOption = "asc" | "desc";

export function HistoryView({ initialPage = 1 }: HistoryViewProps) {
  const [data, setData] = useState<MoodEntriesListDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [selectedTags, setSelectedTags] = useState<MoodTagId[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("created_at");
  const [sortOrder, setSortOrder] = useState<OrderOption>("desc");

  const tagOptions = getMoodTagOptions();

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: "20",
        sort: sortBy,
        order: sortOrder,
      });

      selectedTags.forEach((tag) => {
        params.append("tag", tag);
      });

      const response = await fetch(`/api/mood-entries?${params.toString()}`, {
        credentials: "same-origin",
      });

      if (response.status === 401) {
        window.location.href = `/login?redirectTo=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load entries");
      }

      const result = (await response.json()) as MoodEntriesListDTO;
      setData(result);
    } catch {
      setError("Nie udało się załadować historii. Spróbuj ponownie.");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, selectedTags, sortBy, sortOrder]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleSortChange = (newSort: SortOption) => {
    if (newSort === sortBy) {
      // Toggle order if clicking same sort
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(newSort);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const handleTagToggle = (tagId: MoodTagId) => {
    setSelectedTags((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((t) => t !== tagId);
      }
      return [...prev, tagId];
    });
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setSelectedTags([]);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Ładowanie historii...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-destructive/50 bg-destructive/10">
        <div className="flex items-start gap-3">
          <span className="text-xl" aria-hidden="true">
            ⚠️
          </span>
          <div className="flex-1 space-y-2">
            <p className="text-sm font-semibold text-destructive">Błąd</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={loadEntries}>
              Spróbuj ponownie
            </Button>
          </div>
        </div>
      </Alert>
    );
  }

  const entries = data?.entries || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Sorting */}
      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
        <span className="text-sm font-semibold text-foreground">Sortuj:</span>
        <button
          onClick={() => handleSortChange("created_at")}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
            sortBy === "created_at"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/60 bg-background text-foreground hover:bg-muted/50"
          }`}
        >
          Data {sortBy === "created_at" && (sortOrder === "desc" ? "↓" : "↑")}
        </button>
        <button
          onClick={() => handleSortChange("score")}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
            sortBy === "score"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/60 bg-background text-foreground hover:bg-muted/50"
          }`}
        >
          Nastrój {sortBy === "score" && (sortOrder === "desc" ? "↓" : "↑")}
        </button>
        <span className="ml-auto text-xs text-muted-foreground">
          {sortOrder === "desc" ? "Od najnowszych/najwyższych" : "Od najstarszych/najniższych"}
        </span>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Filtruj po tagach</h2>
          {selectedTags.length > 0 && (
            <button onClick={handleClearFilters} className="text-sm text-primary underline-offset-4 hover:underline">
              Wyczyść filtry
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {tagOptions.map((tag) => {
            const isSelected = selectedTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleTagToggle(tag.id)}
                aria-pressed={isSelected}
                className={`
                  rounded-full border px-4 py-2 text-sm font-medium transition-all
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                  ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border/60 bg-background text-foreground hover:border-primary/50 hover:bg-muted/50"
                  }
                `}
              >
                {tag.label}
              </button>
            );
          })}
        </div>

        {selectedTags.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Wybrano {selectedTags.length} {selectedTags.length === 1 ? "tag" : "tagi"}
          </p>
        )}
      </div>

      {/* Entries List */}
      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-12 text-center">
          <p className="text-lg font-semibold text-foreground">Brak wpisów</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {selectedTags.length > 0
              ? "Nie znaleziono wpisów dla wybranych filtrów"
              : "Rozpocznij zapisywanie swojego nastroju"}
          </p>
          <Button asChild className="mt-4">
            <a href="/app/entry/new">Dodaj pierwszy wpis</a>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total > pagination.pageSize && (
        <div className="flex items-center justify-between border-t border-border/50 pt-4">
          <p className="text-sm text-muted-foreground">
            Strona {pagination.page} • Wyświetlono {entries.length} z {pagination.total} wpisów
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
            >
              Poprzednia
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.hasNext || isLoading}
            >
              Następna
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface EntryCardProps {
  entry: MoodEntryListItemDTO;
}

function EntryCard({ entry }: EntryCardProps) {
  const moodEmoji = MOOD_FACES[entry.score] ?? "😐";
  const date = new Date(entry.createdAt);
  const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const preview = entry.note && entry.note.length > 200 ? `${entry.note.slice(0, 197)}...` : entry.note;

  return (
    <div className="rounded-xl border border-border/60 bg-background/50 p-4 shadow-sm transition-colors hover:bg-muted/20">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-3xl" aria-hidden="true">
            {moodEmoji}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{dateFormatter.format(date)}</p>
              <span className="text-sm text-muted-foreground">•</span>
              <p className="text-sm text-muted-foreground">{timeFormatter.format(date)}</p>
            </div>

            {preview && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{preview}</p>}

            {entry.tags && entry.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {entry.tags.map((tag) => {
                  const tagLabel = isMoodTag(tag) ? getMoodTagLabel(tag) : tag;
                  return (
                    <span
                      key={tag}
                      className="rounded-full border border-border/50 bg-muted/30 px-2 py-0.5 text-xs font-medium text-muted-foreground"
                    >
                      {tagLabel}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <a
          href={`/app/entries/${entry.id}`}
          className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Zobacz
        </a>
      </div>
    </div>
  );
}
