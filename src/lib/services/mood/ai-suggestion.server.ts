import { createHash } from "node:crypto";

import type { SupabaseClient } from "@/db/supabase.client";
import type { MoodEntryDetailDTO, AiSuggestionDTO } from "@/types";
import { getOpenRouterService } from "@/lib/openrouter";
import { MoodSupportPlanSchema, type MoodSupportPlan } from "@/lib/openrouter/schemas/mood-suggestion";
import type { ChatResult } from "@/lib/openrouter.service";

interface SuggestionRequest {
  entry: MoodEntryDetailDTO;
  userId: string;
  locale?: string;
}

export interface SuggestionGenerationResult {
  suggestion: AiSuggestionDTO;
  rawPlan?: MoodSupportPlan;
  content: string;
  model: string;
  durationMs: number;
}

const now = () =>
  typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();

export async function requestMoodSuggestion({
  entry,
  userId,
  locale,
}: SuggestionRequest): Promise<SuggestionGenerationResult> {
  const service = getOpenRouterService();
  const started = now();

  const response = await service.invokeChat({
    developerMessage: buildDeveloperInstructions(locale),
    userMessage: buildUserPrompt(entry),
    context: buildContext(entry, locale),
    responseSchema: MoodSupportPlanSchema,
    parameters: {
      temperature: 0.2,
      max_output_tokens: 640,
      top_p: 0.9,
    },
    metadata: {
      entry_id: String(entry.id),
      user_id: userId,
      mood_score: String(entry.score),
      mood_tags: entry.tags?.join(",") ?? "none",
      source_hash: hashContent(entry.note ?? ""),
    },
  });

  const durationMs = Math.round(now() - started);
  const plan = extractPlan(response);
  const content = plan ? formatPlan(plan) : sanitizePlainText(response.content);

  const suggestion: AiSuggestionDTO = {
    status: plan ? "completed" : "fallback",
    text: content,
    source: response.model,
    generatedAt: new Date().toISOString(),
    responseTimeMs: durationMs,
  };

  if (!plan) {
    return {
      suggestion,
      content,
      model: response.model,
      durationMs,
    };
  }

  return {
    suggestion,
    rawPlan: plan,
    content,
    model: response.model,
    durationMs,
  };
}

export async function persistAiSuggestion(
  supabase: SupabaseClient,
  entryId: number,
  userId: string,
  suggestionText: string
): Promise<void> {
  const { error } = await supabase
    .from("mood_entries")
    .update({
      ai_response: suggestionText,
      ai_helpful: null,
    })
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

function buildDeveloperInstructions(locale?: string): string {
  return [
    "Jesteś wsparciem wellbeing dla aplikacji Mood Mate.",
    "Tworzysz krótkie, empatyczne plany działania bazujące na wpisach użytkownika.",
    "Używaj prostego języka w czasie teraźniejszym, unikaj diagnoz i specjalistycznego żargonu.",
    "Zawsze odpowiadaj w języku polskim.",
    locale ? `Preferuj wariant językowy: ${locale}.` : undefined,
    "Zwróć odpowiedź w formacie JSON zgodnym ze schematem mood_support_plan.",
    "Utrzymuj tonację kojącą, ale zdecydowaną, bez trywializowania emocji.",
    "Nigdy nie sugeruj kontaktu z terapeutą, chyba że użytkownik wspomina o kryzysie.",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildUserPrompt(entry: MoodEntryDetailDTO): string {
  const tags = entry.tags?.length ? entry.tags.join(", ") : "brak tagów";
  const scoreLabel = describeScore(entry.score);
  const note = entry.note?.trim();

  return [
    `Użytkownik ocenił nastrój na ${entry.score}/5 (${scoreLabel}).`,
    `Tagi nastroju: ${tags}.`,
    note ? `Notatka użytkownika: """${note}"""` : "Użytkownik nie zostawił notatki.",
    "Zaproponuj krótki plan wsparcia emocjonalnego oraz ćwiczenie oddechowe.",
    "Plan powinien zajmować maksymalnie 5 minut, być możliwy do wykonania w pomieszczeniu.",
  ].join(" ");
}

function buildContext(entry: MoodEntryDetailDTO, locale?: string) {
  const context = [
    { label: "Entry ID", value: String(entry.id) },
    { label: "Mood score", value: String(entry.score) },
    { label: "Score label", value: describeScore(entry.score) },
    { label: "Tags", value: entry.tags?.join(", ") || "none" },
  ];

  if (locale) {
    context.push({ label: "Locale", value: locale });
  }

  return context;
}

function describeScore(score: number): string {
  const labels: Record<number, string> = {
    1: "bardzo niski",
    2: "niski",
    3: "neutralny",
    4: "dobry",
    5: "bardzo dobry",
  };

  return labels[score] ?? "neutralny";
}

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function extractPlan(response: ChatResult): MoodSupportPlan | undefined {
  if (!response.content) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(response.content) as unknown;
    const result = MoodSupportPlanSchema.schema.safeParse(parsed);
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

function formatPlan(plan: MoodSupportPlan): string {
  const steps = plan.steps
    .map((step, index) => {
      const duration = step.duration ? ` (${step.duration})` : "";
      return `${index + 1}. ${step.title}${duration}\n${step.description}`;
    })
    .join("\n\n");

  const grounding = `Oddech: wdech ${plan.grounding.inhale}s, wydech ${plan.grounding.exhale}s${
    plan.grounding.hold ? `, pauza ${plan.grounding.hold}s` : ""
  }. ${plan.grounding.tip}`;

  return [
    plan.summary,
    "",
    `Afirmacja: ${plan.affirmation}`,
    "",
    "Kroki:",
    steps,
    "",
    grounding,
    "",
    `Pytanie do refleksji: ${plan.reflectionQuestion}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function sanitizePlainText(value?: string): string {
  if (!value) {
    return "Spróbuj wykonać krótkie ćwiczenie oddechowe lub opisz swój nastrój ponownie.";
  }

  return value.trim();
}
