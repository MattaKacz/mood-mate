## Opis usługi

1. **Klient OpenRouter (`OpenRouterService`)**
   - Cel: Komunikacja z API OpenRouter w celu uzyskiwania odpowiedzi LLM oraz zarządzanie parametrami żądań.
   - Funkcjonalność: inicjuje połączenia HTTPS, serializuje zapytania, mapuje odpowiedzi na typy domenowe Astro/React, loguje metadane.
   - Wyzwania:
     1. Spójne zarządzanie kluczem API i limitami.
     2. Obsługa różnych modeli i formatów odpowiedzi w jednym interfejsie.
     3. Zapewnienie niskiego opóźnienia przy kolejkowaniu żądań.
   - Rozwiązania:
     1. Wstrzykiwanie konfiguracji poprzez `.env` + adapter Supabase Secrets, walidacja przy starcie.
     2. Abstrakcja `ModelProfile` definiująca nazwę, parametry i schemat; mapowanie w serwisie.
     3. Retry z jitterem + lokalny cache w `src/lib/openrouter/cache.ts` dla powtarzanych promptów.

2. **Konfiguracja i profil modelu (`OpenRouterConfig`, `ModelProfile`)**
   - Cel: Ujednolicenie sposobu deklarowania modeli, parametrów (`temperature`, `max_output_tokens`) i polityk limitów.
   - Funkcjonalność: typowane obiekty z walidacją Zod, które są ładowane w konstruktorze serwisu.
   - Wyzwania:
     1. Różne modele wymagają odmiennych pól parametrów.
     2. Utrzymanie aktualności listy modeli OpenRouter.
   - Rozwiązania:
     1. Zdefiniowanie union typów `BaseModelParams | ClaudeParams | GPTParams`, z których każdy ma opcjonalne rozszerzenia.
     2. Okresowa synchronizacja (`pnpm task sync:models`) pobierająca listing API i aktualizująca `ModelProfile`.

3. **Budowanie promptów (`PromptBuilder`)**
   - Cel: Standaryzacja przygotowania komunikatów systemowych, użytkownika i kontekstu.
   - Funkcjonalność: generuje tablice `ChatMessage[]`, aplikuje templating (np. Astro slots), waliduje response_format.
   - Wyzwania:
     1. Konieczność personalizacji promptów per użytkownik bez naruszania bezpieczeństwa.
     2. Synchronizacja schematów JSON z typami TypeScript.
   - Rozwiązania:
     1. Sanitizacja danych wejściowych oraz white-lista zmiennych, które można wstrzyknąć.
     2. Generowanie schematów JSON z definicji Zod (`zod-to-json-schema`) utrzymywanych w repo.

4. **Parser odpowiedzi (`ResponseMapper`)**
   - Cel: Transformacja surowych odpowiedzi OpenRouter na struktury domenowe i walidacja przeciwko schematowi.
   - Funkcjonalność: sprawdza `response_format`, fallback do treści tekstowej, agreguje usage metrics do Supabase.
   - Wyzwania:
     1. Niespójne odpowiedzi modeli przy wymuszonym schemacie.
     2. Obsługa strumieniowania przy komponentach React 19.
   - Rozwiązania:
     1. Dwustopniowa walidacja (najpierw JSON.parse, potem Zod).
     2. Implementacja `ReadableStream` z buforowaniem fragmentów i finalną walidacją po zakończeniu strumienia.

5. **Observability i limiter (`OpenRouterTelemetry`)**
   - Cel: Monitorowanie SLA, logowanie błędów, adaptacyjne ograniczanie ruchu.
   - Funkcjonalność: eksport metryk do Supabase/Posthog, alarmy na przekroczenia limitów, rejestrowanie `prompt_token` vs `completion_token`.
   - Wyzwania:
     1. Minimalizacja kosztów przy wzroście ruchu.
     2. Rozróżnienie błędów klienta vs serwera.
   - Rozwiązania:
     1. Dynamiczne obniżanie `max_output_tokens` dla żądań niskiego priorytetu.
     2. Kategoryzacja statusów HTTP i odpowiednie strategie retry/alertów.

## Opis konstruktora

`constructor OpenRouterService(config: OpenRouterConfig, transport?: HttpClient)`

- Wczytuje `OPENROUTER_API_KEY`, bazowy URL i profil domyślnego modelu.
- Waliduje konfigurację (Zod) oraz rejestruje opcjonalny niestandardowy transport (np. `fetch`, `undici`).
- Ustawia limity czasowe (domyślnie 12s) i kolejkę równoległości (np. `p-limit`).
- Integruje `PromptBuilder`, `ResponseMapper` i `OpenRouterTelemetry` poprzez kompozycję.
- Rejestruje hook bezpieczeństwa wymuszający HTTPS i nagłówek `HTTP-Referer`.

## Publiczne metody i pola

1. `invokeChat(options: ChatInvocationOptions): Promise<ChatResult>`
   - Buduje komunikaty (system + user + history).
   - Wstrzykuje nazwę modelu (`options.model ?? config.defaultModel`).
   - Dodaje parametry (`temperature`, `top_p`, `max_output_tokens`).
   - Obsługuje `response_format`, przekazując schemat JSON w wymaganym formacie `{ type: 'json_schema', json_schema: { name, strict: true, schema } }`.

2. `streamChat(options: StreamInvocationOptions): AsyncGenerator<ChatStreamChunk>`
   - Dostosowany do React 19 Server Components; generuje strumień częściowych odpowiedzi.
   - Używa `ReadableStreamDefaultReader` i przekazuje go do komponentu klienckiego `useEffect`.

3. `registerModel(profile: ModelProfile): void`
   - Dodaje lub aktualizuje profil modelu w czasie działania (np. A/B test).
   - Osadza walidację parametrów i schematów.

4. `metrics` (pole)
   - Dostarcza bieżące wskaźniki (średnie opóźnienia, tokeny) bezpośrednio do UI dashboardu w Astro.

### Integracja komunikatów i parametrów (przykłady)

1. **Komunikat systemowy**

   ```ts
   const systemMessage = {
     role: "system",
     content: "Jesteś empatycznym asystentem Mood Mate.",
   };
   ```

   Wstrzyknięcie poprzez `PromptBuilder.addSystemMessage(systemMessage)`.

2. **Komunikat użytkownika**

   ```ts
   const userMessage = {
     role: "user",
     content: `Oceny nastroju: ${score}. Zaproponuj ćwiczenie oddechowe.`,
   };
   ```

   Dodawany metodą `PromptBuilder.addUserMessage(userMessage)`.

3. **response_format (schemat JSON)**

   ```ts
   const responseFormat = {
     type: "json_schema",
     json_schema: {
       name: "mood_plan",
       strict: true,
       schema: {
         type: "object",
         required: ["summary", "steps"],
         properties: {
           summary: { type: "string" },
           steps: {
             type: "array",
             items: { type: "string", minLength: 5 },
           },
         },
       },
     },
   };
   ```

   Przekazywany do `invokeChat({ responseFormat })`, a następnie walidowany przez `ResponseMapper`.

4. **Nazwa modelu**

   ```ts
   const model = "google/gemini-2.0-flash";
   ```

   Identyfikator z katalogu OpenRouter; przechowywany w `ModelProfile`.

5. **Parametry modelu**
   ```ts
   const params = {
     temperature: 0.2,
     top_p: 0.9,
     max_output_tokens: 512,
     presence_penalty: 0,
   };
   ```
   Łączone z profilem i przesyłane jako `model_params`.

## Prywatne metody i pola

1. `_buildHeaders(): Record<string, string>`
   - Dodaje `Authorization`, `HTTP-Referer`, `X-Title`.
   - Wymusza `Content-Type: application/json`.

2. `_executeRequest(body: OpenRouterPayload, abortSignal?: AbortSignal)`
   - Centralny punkt wykonywania `fetch`.
   - Zarządza retry (exponential backoff), time-outem i logowaniem metryk.

3. `_applyResponseFormat(format?: ResponseFormat)`
   - Waliduje strukturę JSON Schema i serializuje ją do API.
   - Pilnuje limitu 4 KB na schemat (dok. OpenRouter).

4. `_mapResponse(raw: OpenRouterResponse): ChatResult`
   - Używa `ResponseMapper` do walidacji i transformacji.
   - Dodaje metadane (`model`, `usage`).

5. Pola prywatne:
   - `_config: OpenRouterConfig`
   - `_http: HttpClient`
   - `_telemetry: OpenRouterTelemetry`
   - `_promptBuilder: PromptBuilder`
   - `_responseMapper: ResponseMapper`
   - `_limiter: ConcurrencyLimiter`

## Obsługa błędów

1. **Brak lub błędny klucz API** – walidacja podczas inicjalizacji, czytelny komunikat i blokada wywołań.
2. **Błąd sieci / timeout** – retry (max 3), przełączenie modelu zapasowego, log ostrzegawczy.
3. **429 Rate Limit** – dynamiczne wydłużenie odstępów, nadanie statusu „queued” w UI.
4. **400 Validation Error** – raportowanie, które pole requestu jest nieprawidłowe; fallback do trybu tekstowego bez `response_format`.
5. **500+ Serwer OpenRouter** – natychmiastowe zgłoszenie do telemetry, fallback na lokalny cache odpowiedzi heuristic.
6. **JSON Schema mismatch** – log detaliczny, re-procesowanie odpowiedzi jako plain text, aktualizacja schematu.
7. **Błędy strumieniowania** – automatyczne domknięcie strumienia i restart połączenia (z checkpointem).
8. **Błędy parsowania tokenów** – zwracanie statusu `partial`, umożliwiającego UI na ponowne żądanie.

## Kwestie bezpieczeństwa

- Przechowywanie klucza w `Astro.env.server`, nigdy w bundlu klienta.
- Ograniczenie domen referera i ustawienie `X-Title` zgodnie z wymaganiami OpenRouter.
- Sanitizacja wszystkich danych użytkownika w promptach (escape, trimming).
- Limitowanie długości promptów i odpowiedzi, aby zapobiegać DoS kosztowym.
- Monitorowanie anomalii (nagły wzrost temperatury lub tokenów).
- Audyt logów – brak danych wrażliwych w telemetry.
- Wymuszenie HTTPS/TLS 1.2+.
- Regularne rotowanie kluczy i testy regresyjne integracji.

## Plan wdrożenia krok po kroku

1. **Przygotowanie konfiguracji**
   - Dodać `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, `OPENROUTER_DEFAULT_MODEL` do `.env`.
   - Utworzyć `src/lib/openrouter/config.ts` z typami `OpenRouterConfig`, `ModelProfile`, walidacją Zod.
   - Skonfigurować `pnpm` task do walidacji zmiennych środowiskowych.

2. **Implementacja serwisu**
   - Stworzyć `src/lib/openrouter/service.ts` zawierający konstruktor i publiczne metody opisane wyżej.
   - Wstrzyknąć zależności (`PromptBuilder`, `ResponseMapper`, `OpenRouterTelemetry`).
   - Dodać testy jednostkowe dla walidacji konfiguracji i nagłówków.

3. **Budowanie promptów**
   - Dodać `src/lib/openrouter/prompt-builder.ts` z metodami `addSystemMessage`, `addUserMessage`, `addContext`, `build`.
   - Upewnić się, że metody wymuszają kolejność (system → developer → user → history).
   - Udokumentować przykłady w Storybook/MDX.

4. **Obsługa response_format**
   - Utworzyć katalog `src/lib/openrouter/schemas` z definicjami Zod → JSON Schema.
   - Zaimplementować `_applyResponseFormat` i testy regresyjne dla niepoprawnych schematów.
   - Zapewnić fallback do tekstu przy błędach walidacji.

5. **Integracja w UI Astro/React**
   - Dodać akcję serverową (np. `src/pages/api/chat.ts`) wywołującą `OpenRouterService.invokeChat`.
   - Dla strumieni wykorzystać `Astro.serverResponse.body` + `ReadableStream`.
   - Komponent React 19 (`DashboardView`) subskrybuje strumień i aktualizuje UI.

6. **Telemetry i limity**
   - Utworzyć `src/lib/openrouter/telemetry.ts` (Supabase/Logflare).
   - Zaimplementować `OpenRouterTelemetry.record(event)` w punktach sukcesu i błędów.
   - Dodać adapter `Limiter` (np. `p-limit`) dla równoległych żądań.

7. **Testy i QA**
   - Testy jednostkowe: mock fetch, walidacja schematów, konwersje błędów.
   - Testy integracyjne: e2e z OpenRouter sandbox, sprawdzenie `response_format`.
   - Kontrola bezpieczeństwa: sprawdzenie, że klucz nie trafia do bundla, a logi są anonimizowane.

8. **Monitoring produkcyjny**
   - Konfiguracja alertów (Supabase Edge Functions / Posthog).
   - Dashboard w Astro korzystający z `service.metrics`.
   - Procedura roll-back: feature flag w Supabase konfigurowana w czasie rzeczywistym.

9. **Dokumentacja operacyjna**
   - Dodać README sekcji „OpenRouter Service”.
   - Opisać proces rotacji kluczy i testów regresyjnych.
   - Utrzymywać changelog modeli w `src/lib/openrouter/models.md`.
   - Czy należy uwzględnić dodatkowe scenariusze multi-tenant lub offline cache, aby dopasować usługę do Waszych specyficznych ograniczeń?
