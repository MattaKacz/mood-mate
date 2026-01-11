import type { MoodTag } from "@/types";

export const MAX_TAGS_PER_ENTRY = 2;

export const MOOD_TAGS = [
  "work",
  "stress",
  "sleep",
  "energy",
  "family",
  "health",
  "motivation",
  "rest",
  "relationships",
  "social",
  "study",
  "diet",
] as const satisfies readonly MoodTag[];

export type MoodTagId = (typeof MOOD_TAGS)[number];

type MoodTagLabelMap = Record<MoodTagId, string>;

const plLabels: MoodTagLabelMap = {
  work: "Praca",
  stress: "Stres",
  sleep: "Sen",
  energy: "Energia",
  family: "Rodzina",
  health: "Zdrowie",
  motivation: "Motywacja",
  rest: "Odpoczynek",
  relationships: "Relacje",
  social: "Kontakty",
  study: "Nauka",
  diet: "Dieta",
};

export function getMoodTagLabel(tag: MoodTagId): string {
  return plLabels[tag] ?? tag;
}

export interface MoodTagOption {
  id: MoodTagId;
  label: string;
}

export function getMoodTagOptions(): MoodTagOption[] {
  return MOOD_TAGS.map((tag) => ({
    id: tag,
    label: getMoodTagLabel(tag),
  }));
}

export function isMoodTag(value: unknown): value is MoodTagId {
  return typeof value === "string" && (MOOD_TAGS as readonly string[]).includes(value);
}
