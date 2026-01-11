import { z } from "zod";

import { MAX_TAGS_PER_ENTRY, MOOD_TAGS } from "@/lib/constants/tag-catalog";

const MoodTagEnum = z.enum(MOOD_TAGS);

export const createMoodEntrySchema = z.object({
  score: z.coerce
    .number({
      required_error: "Wybierz poziom nastroju",
      invalid_type_error: "Poziom nastroju musi być liczbą",
    })
    .int({ message: "Poziom nastroju musi być liczbą całkowitą" })
    .min(1, { message: "Minimalny poziom to 1" })
    .max(5, { message: "Maksymalny poziom to 5" }),
  note: z
    .string()
    .trim()
    .max(280, { message: "Notatka nie może mieć więcej niż 280 znaków" })
    .optional()
    .nullable()
    .transform((value) => (value ? value : undefined)),
  tags: z
    .array(MoodTagEnum, {
      invalid_type_error: "Tagi muszą być tablicą",
    })
    .max(MAX_TAGS_PER_ENTRY, {
      message: `Możesz wybrać maksymalnie ${MAX_TAGS_PER_ENTRY} tagi`,
    })
    .optional()
    .default([]),
  requestSuggestion: z.coerce.boolean().optional().default(false),
});

export type CreateMoodEntrySchema = z.infer<typeof createMoodEntrySchema>;
