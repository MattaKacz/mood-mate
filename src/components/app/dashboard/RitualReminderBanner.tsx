import { BellRing } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { DashboardRitualReminderDTO } from "@/types";

interface RitualReminderBannerProps {
  reminder: DashboardRitualReminderDTO;
}

export function RitualReminderBanner({ reminder }: RitualReminderBannerProps) {
  const copy = reminder.isDue
    ? {
        title: "Czas na rytuał",
        description: "Poświęć chwilę na uważne sprawdzenie nastroju.",
      }
    : {
        title: "Rytuał zaplanowany na dziś",
        description: "Zapamiętaj ten moment i przygotuj spokojną przestrzeń.",
      };
  const timeLabel = `o ${reminder.time}`;

  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100">
      <BellRing className="size-5" aria-hidden="true" />
      <div>
        <AlertTitle>{copy.title}</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center gap-2">
          <span>{copy.description}</span>
          <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:bg-white/10 dark:text-amber-100">
            {timeLabel}
          </span>
        </AlertDescription>
      </div>
    </Alert>
  );
}
