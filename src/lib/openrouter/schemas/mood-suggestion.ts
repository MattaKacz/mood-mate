import { z } from "zod";

import { registerSchema } from "./index";

const MoodSupportPlanZodSchema = z.object({
  summary: z.string().min(12).max(280).describe("Jedno lub dwa zdania empatycznego podsumowania sytuacji użytkownika."),
  affirmation: z.string().min(12).max(160).describe("Krótka afirmacja nastawiona na współczucie i motywację."),
  steps: z
    .array(
      z.object({
        title: z.string().min(3).max(60),
        description: z.string().min(15).max(320),
        duration: z.string().min(3).max(40).optional().describe("Orientacyjny czas w minutach np. '3 min'"),
      })
    )
    .min(2)
    .max(4)
    .describe("Praktyczne kroki do wykonania w domu, krótkie i realistyczne."),
  grounding: z.object({
    inhale: z.number().int().min(2).max(8).describe("Czas w sekundach dla wdechu"),
    exhale: z.number().int().min(2).max(10).describe("Czas w sekundach dla wydechu"),
    hold: z.number().int().min(0).max(8).optional().describe("Pauza między oddechami"),
    tip: z.string().min(8).max(140).describe("Mini wskazówka jak wykonać ćwiczenie oddechowe, maks 140 znaków."),
  }),
  reflectionQuestion: z
    .string()
    .min(12)
    .max(180)
    .describe("Pytanie do autorefleksji lub dziennika na zakończenie ćwiczenia."),
});

export const MoodSupportPlanSchema = registerSchema({
  name: "mood_support_plan",
  strict: true,
  schema: MoodSupportPlanZodSchema,
});

export type MoodSupportPlan = z.infer<typeof MoodSupportPlanZodSchema>;
