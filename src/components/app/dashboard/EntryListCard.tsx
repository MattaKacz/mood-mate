import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MoodEntryListItemDTO } from "@/types";
import { cn } from "@/lib/utils";
import { getMoodTagLabel, isMoodTag } from "@/lib/constants/tag-catalog";

interface EntryListCardProps {
  entries: MoodEntryListItemDTO[];
}

const moodFaces: Record<number, string> = {
  1: "😞",
  2: "🙁",
  3: "😐",
  4: "🙂",
  5: "🤩",
};

const DATE_LOCALE: Intl.LocalesArgument = "pl-PL";
const ENTRY_COPY = {
  title: "Ostatnie 7 wpisów",
  subtitle: "Kliknij wpis, aby zobaczyć pełną notatkę i tagi.",
  emptyTitle: "Brak wpisów",
  emptyDescription: "Twoje ostatnie zapisane nastroje pojawią się tutaj.",
  addMoodCta: "Dodaj wpis",
  notePlaceholder: "Brak notatki dla tego wpisu.",
  noTags: "Brak tagów",
  viewEntry: "Otwórz",
};

export function EntryListCard({ entries }: EntryListCardProps) {
  const dateFormatter = new Intl.DateTimeFormat(DATE_LOCALE, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat(DATE_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>{ENTRY_COPY.title}</CardTitle>
        <CardDescription>{ENTRY_COPY.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-8 text-center">
            <p className="text-lg font-medium">{ENTRY_COPY.emptyTitle}</p>
            <p className="mt-2 text-sm text-muted-foreground">{ENTRY_COPY.emptyDescription}</p>
            <Button asChild variant="secondary" className="mt-4">
              <a href="/app/entry/new">{ENTRY_COPY.addMoodCta}</a>
            </Button>
          </div>
        ) : (
          <ul className="space-y-4">
            {entries.map((entry) => {
              const date = new Date(entry.createdAt);
              const moodIcon = moodFaces[entry.score] ?? "🙂";
              const tags = entry.tags ?? [];
              const preview = entry.note && entry.note.length > 140 ? `${entry.note.slice(0, 137)}…` : entry.note;

              return (
                <li key={entry.id} className="rounded-xl border border-border/60 bg-background/50 px-4 py-3 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" aria-hidden="true">
                        {moodIcon}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{dateFormatter.format(date)}</p>
                        <p className="text-xs text-muted-foreground">{timeFormatter.format(date)}</p>
                      </div>
                    </div>
                    <a
                      href={`/app/entries/${entry.id}`}
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {ENTRY_COPY.viewEntry}
                    </a>
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground">{preview || ENTRY_COPY.notePlaceholder}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.length === 0 ? (
                      <span className="text-xs text-muted-foreground">{ENTRY_COPY.noTags}</span>
                    ) : (
                      tags.map((tag) => {
                        const tagLabel = isMoodTag(tag) ? getMoodTagLabel(tag) : tag;
                        return (
                          <span
                            key={tag}
                            className={cn(
                              "rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground"
                            )}
                          >
                            {tagLabel}
                          </span>
                        );
                      })
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
