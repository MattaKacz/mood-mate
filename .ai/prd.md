# Dokument wymagań produktu (PRD) - MoodMate

## 1. Przegląd produktu

MoodMate to prosta, przyjazna aplikacja webowa wspierająca dobrostan emocjonalny poprzez szybkie rejestrowanie nastroju, krótkich notatek i tagów oraz natychmiastową, empatyczną mikro-podpowiedź generowaną przez AI. Produkt w wersji PoC/MVP skupia się na minimalnym, ale kompletnym przepływie fast entry w jednym widoku, lekkim dashboardzie oraz bazowych funkcjach prywatności i bezpieczeństwa.

## 2. Problem użytkownika

Wysokie tempo życia i stres powodują trudności z:

- rozpoznawaniem i rozumieniem własnych emocji,
- monitorowaniem samopoczucia w czasie,
- znajdowaniem prostych, spersonalizowanych sposobów poprawy nastroju.

MoodMate rozwiązuje to przez:

- szybki zapis nastroju w mniej niż 30 sekund,
- natychmiastową, empatyczną mikro-podpowiedź opartą na AI,
- lekki dashboard ułatwiający wgląd w trend i podtrzymanie rytuału.

## 3. Wymagania funkcjonalne

1. Uwierzytelnianie i onboarding

- Logowanie i rejestracja przez e-mail i hasło (Supabase Auth).
- Ograniczenie 18+ przez checkbox self-attestation podczas rejestracji.
- Zgoda użytkownika na warunki i krótką politykę prywatności (PL jako język podstawowy, EN jako skrócone tłumaczenie).
- Skrócone FTUE: 3 ekrany maks., możliwość Skip.
- Ustawienie godziny rytuału: presety 21:30 lub 18:00; jedna z nich ustawiana jako domyślna.

2. Dziennik nastrojów (fast entry)

- Pojedynczy widok: skala 1–5 (emoji), krótka notatka (opcjonalna), do 2 tagów z listy 8–12.
- Lista tagów (PL, wstępna): praca, stres, sen, energia, rodzina, zdrowie, motywacja, odpoczynek, relacje, towarzyskie, nauka, dieta. Finalizacja listy i kolejności przed wdrożeniem PoC.
- Walidacje: maksymalna długość notatki (np. 280 znaków), maksymalnie 2 tagi, wybrany nastrój wymagany.
- Zapis bez przeładowania; potwierdzenie zapisu inline.

3. Analiza AI i fallback

- Jeden prompt do tworzenia 1–2 zdań empatycznej porady.
- Model: GPT-4o-mini; timeout 2,5 s.
- Fallback: lokalny phrasebook dobrany po score i topTag; używany przy timeout/błędzie/moderacji.
- AI nie blokuje zapisu; porada może doładować się po zapisie.

4. Moderacja i bezpieczeństwo treści

- Minimalny filtr słów kluczowych (wordlist/regex) na notatkę.
- Przy trafieniu: porada AI nie jest generowana, wyświetla się banner kryzysowy z polskimi numerami: 112 (numer alarmowy), 116 123 (telefon zaufania) oraz 800 70 222 (linia wsparcia kryzysowego). Treść nadal może zostać zapisana, jeśli spełnia politykę treści; alternatywnie możliwy soft-block z informacją i opcją edycji.
- Brak wysyłania wrażliwych treści do modelu przy trafieniu moderacji.

5. Dashboard i historia

- Lekki dashboard: streak, lista wpisów z 7 dni, CTA Dodaj nastrój.
- Delikatne przypomnienie o rytuale w UI (bez powiadomień push).
- Podsumowanie trendu tygodniowego (proste: poprawa/stabilnie/spadek).
- Historia w formie listy ostatnich wpisów; podstawowe filtrowanie po tagach (opcjonalne w PoC).

6. Dane i prywatność

- Tabele: users_profile, mood_entries.
- Struktura mood_entries: id, user_id, score (1–5), note (tekst, opcjonalna), tags (array), created_at (timestamp).
- Szyfrowanie w tranzycie; brak przechowywania treści w logach aplikacyjnych.
- Możliwość usunięcia konta i wszystkich danych jednym działaniem.
- Brak eksportu danych użytkownika w PoC.

7. Analityka

- Zdarzenia: entry_saved, ai_shown, ai_helpful_yes/no.
- Prosty dashboard liczników; brak analityki treściowej.
- Minimalizacja danych; brak identyfikowalnych treści w eventach.

8. Wydajność i koszty

- Brak cache semantycznego/LSH; opcjonalny prosty cache w pamięci po (score, topTag).
- Brak batchingu/kolejek.
- Timeout AI do 2,5 s; degradacja do phrasebooku.

9. Dostępność i RWD

- Responsywność na urządzenia mobilne i desktop.
- Podstawowa dostępność: focus states, etykiety pól, nawigacja klawiaturą.

10. SLA/DR i obserwowalność

- Best-effort; brak formalnych SLO/DR.
- Ręczne monitorowanie logów i podstawowe alerty błędów.

11. Zakres językowy i region

- Interfejs PL (domyślnie) z opcjonalnym przełącznikiem EN; rynek docelowy Polska (PoC).
- Hosting Supabase: preferowany region EU (np. Warszawa) zgodnie z głównym rynkiem w Polsce.

## 4. Granice produktu

W zakresie PoC

- Uwierzytelnianie przez e-mail/hasło, 18+, zgoda i prywatność w PL (z EN jako materiał pomocniczy).
- Fast entry w jednym widoku; zapis bez przeładowania.
- AI micromessage z timeoutem i lokalnym fallbackiem.
- Moderacja słów kluczowych i banner z polskimi numerami kryzysowymi.
- Dashboard lekki: streak, 7 dni, CTA, subtelny przypominacz UI.
- Usunięcie konta i danych.
- Minimalna analityka (3 zdarzenia).

Poza zakresem PoC

- Zaawansowana personalizacja AI, długoterminowa analiza.
- Integracje z urządzeniami, Apple Health.
- Powiadomienia push/e-mail.
- Tryb offline i synchronizacja.
- Moduł społecznościowy, udostępnianie wpisów.
- Zaawansowane statystyki i korelacje.
- A/B testy, wersjonowanie promptów, cache semantyczny.
- Eksport danych użytkownika.
- Edycja/usuwanie pojedynczych wpisów przez użytkownika (w PoC brak).

Założenia i zależności

- Dostępność GPT-4o-mini; poprawne klucze API.
- Supabase jako główna platforma Auth i DB.
- Finalizacja listy tagów (8–12 w PL) i presetów godziny rytuału.
- Finalne copy polityki prywatności i disclaimerów (PL jako źródło prawdy, EN jako skrócone tłumaczenie).
- Rekrutacja 10–15 testerów PoC i lekka ankieta feedbackowa.

Ryzyka

- Dobór regionu Supabase (priorytet EU/Polska, inne regiony rozważane później).
- Jakość i trafność porad AI przy krótkim czasie odpowiedzi.
- Odpowiedzialna moderacja treści i reakcja na sygnały kryzysowe.

## 5. Historyjki użytkowników

US-001 Rejestracja 18+ z akceptacją polityki
Opis: Jako nowy użytkownik chcę założyć konto e-mail/hasło, potwierdzić, że mam 18+ i zaakceptować politykę prywatności, aby korzystać z aplikacji.
Kryteria akceptacji:

- Widoczny checkbox 18+ oraz link do polityki prywatności (PL, z opcją przełączenia na EN).
- Bez zaznaczenia i akceptacji przycisku rejestracji nie można kliknąć lub rejestracja kończy się walidacją.
- Po poprawnej rejestracji użytkownik jest zalogowany i przechodzi do FTUE.

US-002 Logowanie i wylogowanie
Opis: Jako użytkownik chcę zalogować się e-mail/hasło i móc się wylogować, aby bezpiecznie zarządzać dostępem.
Kryteria akceptacji:

- Poprawne dane logują i przenoszą do dashboardu.
- Błędne dane pokazują jasny komunikat błędu bez ujawniania szczegółów.
- Wylogowanie kończy sesję i przekierowuje do ekranu logowania.

US-003 Reset hasła
Opis: Jako użytkownik chcę zresetować hasło mailem, gdy je zapomnę.
Kryteria akceptacji:

- Formularz resetu dostępny z ekranu logowania.
- Wysłanie linku resetu potwierdzane komunikatem.
- Po ustawieniu nowego hasła mogę się zalogować.

US-004 FTUE skrócony z opcją Skip
Opis: Jako nowy użytkownik chcę przejść 3 krótkie ekrany FTUE z możliwością pominięcia, aby szybko zacząć.
Kryteria akceptacji:

- Maksymalnie 3 ekrany: wartości produktu, ustawienie godziny rytuału, pierwszy wpis.
- Każdy ekran posiada przycisk Skip przenoszący do kolejnego kroku lub do głównego widoku.
- Cały FTUE możliwy do ukończenia w 90 sekund.

US-005 Ustawienie godziny rytuału
Opis: Jako użytkownik chcę ustawić godzinę rytuału z presetów 21:30 lub 18:00, aby wyrobić nawyk.
Kryteria akceptacji:

- Widoczne dwa presety; jeden jest domyślny.
- Zapis rytuału w profilu użytkownika.
- Dashboard przypomina delikatnie, jeśli dzisiaj brak wpisu po rytuale.

US-006 Fast entry podstawowy
Opis: Jako użytkownik chcę w jednym widoku wybrać nastrój 1–5, wpisać krótką notatkę i dodać do 2 tagów, aby zapisać mój stan w ≤30 s.
Kryteria akceptacji:

- Wymagany wybór nastroju; notatka i tagi opcjonalne.
- Maksymalnie 2 tagi z listy; przekroczenie liczby blokuje wybór z jasnym komunikatem.
- Zapis bez przeładowania i potwierdzenie powodzenia.

US-007 Fast entry bez notatki
Opis: Jako użytkownik chcę zapisać tylko nastrój bez notatki i tagów.
Kryteria akceptacji:

- Formularz umożliwia zapis z samym nastrojem.
- Po zapisie wpis widoczny na liście 7 dni.

US-008 Wybór tagów z listy i walidacje
Opis: Jako użytkownik chcę wybrać tagi z predefiniowanej listy 8–12 w języku polskim, maksymalnie 2.
Kryteria akceptacji:

- Lista tagów jest przewidywalna i widoczna w UI.
- Nie można dodać więcej niż 2 tagi; UI sygnalizuje limit.
- Tagów spoza listy nie można wprowadzić.

US-009 Walidacja notatki
Opis: Jako użytkownik chcę, by aplikacja informowała o przekroczeniu limitu znaków notatki.
Kryteria akceptacji:

- Limit znaków widoczny; po przekroczeniu przycisk zapisu jest zablokowany lub pokazuje błąd.
- Zachowanie nie powoduje utraty wprowadzonych danych.

US-010 Generowanie porady AI
Opis: Jako użytkownik chcę po zapisie otrzymać 1–2 zdania empatycznej porady.
Kryteria akceptacji:

- Wywołanie AI następuje po zapisie wpisu.
- Timeout po 2,5 s; jeśli przekroczony, pokazany fallback z phrasebooku.
- Pokazany tekst jest czytelny, krótki i neutralny emocjonalnie.

US-011 Fallback do phrasebooku
Opis: Jako użytkownik chcę zawsze otrzymać poradę, nawet gdy AI zawiedzie, dzięki lokalnemu phrasebookowi dobranemu po score i topTag.
Kryteria akceptacji:

- W przypadku błędu AI lub timeoutu wyświetlana jest porada z phrasebooku.
- Fallback nie opóźnia interakcji po zapisie.
- Teksty phrasebooku są poprawne językowo (PL jako domyślne, EN jako opcjonalny fallback) i empatyczne.

US-012 Oznaczenie porady jako pomocna/niepomocna
Opis: Jako użytkownik chcę ocenić poradę AI, by poprawić jakość przyszłych sugestii.
Kryteria akceptacji:

- Dwa przyciski: Helpful i Not helpful.
- Kliknięcie wysyła zdarzenie ai_helpful_yes/no bez treści notatki.
- Jeden wpis może zarejestrować maksymalnie jedną ocenę.

US-013 Moderacja treści i banner kryzysowy
Opis: Jako użytkownik chcę, by treści potencjalnie kryzysowe były odpowiednio obsłużone i wyświetlały lokalne zasoby pomocy.
Kryteria akceptacji:

- Wordlist/regex identyfikuje potencjalnie niebezpieczne treści.
- W przypadku trafienia AI nie otrzymuje treści; zamiast tego wyświetlany jest banner z numerami 112, 116 123 oraz 800 70 222.
- Użytkownik może edytować treść lub zapisać wpis bez porady AI.

US-014 Dashboard: streak i lista 7 dni
Opis: Jako użytkownik chcę zobaczyć mój streak i listę ostatnich 7 wpisów.
Kryteria akceptacji:

- Streak liczony jako kolejne dni z co najmniej jednym wpisem.
- Lista pokazuje datę, emoji nastroju, tagi, skrót notatki.
- Brak wpisów pokazuje stan pusty z CTA Dodaj nastrój.

US-015 Dashboard: trend tygodniowy
Opis: Jako użytkownik chcę prostą informację o trendzie nastroju w ostatnim tygodniu.
Kryteria akceptacji:

- Trend obliczany jako porównanie średniej z ostatnich 3 dni vs wcześniejsze 4 dni.
- Komunikaty: poprawa, stabilnie, spadek.
- Obliczenia nie wymagają wykresów.

US-016 Delikatne przypomnienie o rytuale w UI
Opis: Jako użytkownik chcę łagodne przypomnienie na dashboardzie, jeśli nie dodałem wpisu w zaplanowanej porze.
Kryteria akceptacji:

- Przypomnienie widoczne tylko w dniu, gdy brak wpisu po ustawionej godzinie rytuału.
- Brak systemowych powiadomień push/e-mail.

US-017 Historia wpisów: filtrowanie po tagach (opcjonalne PoC)
Opis: Jako użytkownik chcę przefiltrować listę ostatnich wpisów po tagach.
Kryteria akceptacji:

- Zastosowanie filtra ogranicza listę do wybranych tagów.
- Brak filtrowania po wielu tagach jest akceptowalny w PoC.

US-018 Usunięcie konta i danych
Opis: Jako użytkownik chcę jednym działaniem usunąć konto i wszystkie moje wpisy.
Kryteria akceptacji:

- Potwierdzenie akcji w modalu z jasnym skutkiem nieodwracalnym.
- Po usunięciu konto i wpisy nie są dostępne; następuje wylogowanie.
- Brak pozostawiania treści w logach aplikacyjnych.

US-019 Utrzymanie sesji i ponowne logowanie
Opis: Jako użytkownik chcę pozostać zalogowany po ponownym uruchomieniu przeglądarki, o ile token jest ważny.
Kryteria akceptacji:

- Po odświeżeniu sesja utrzymana przy ważnym tokenie.
- Wygasła sesja powoduje przekierowanie do logowania.

US-020 Dostępność podstawowa i RWD
Opis: Jako użytkownik chcę, aby aplikacja była dostępna na mobile i desktop oraz z podstawową obsługą klawiatury.
Kryteria akceptacji:

- Layout responsywny dla szerokości mobile i desktop.
- Focus states i etykiety dla pól formularza; nawigacja klawiaturą po elementach interaktywnych.

US-021 Polityka prywatności i disclaimery
Opis: Jako użytkownik chcę przeczytać krótką politykę prywatności i zrozumieć, że porady nie są poradą medyczną.
Kryteria akceptacji:

- Link do polityki dostępny na ekranach rejestracji/logowania i w aplikacji.
- Widoczny krótki disclaimer not medical advice.

US-022 Zdarzenia analityczne
Opis: Jako właściciel produktu chcę rejestrować entry_saved, ai_shown i ai_helpful_yes/no.
Kryteria akceptacji:

- Zdarzenie entry_saved wysyłane po udanym zapisie wpisu.
- Zdarzenie ai_shown wysyłane po wyświetleniu porady (AI lub fallback).
- Zdarzenie ai_helpful_yes/no wysyłane po ocenie; bez treści notatki i identyfikowalnych danych.

US-023 Obsługa błędów zapisu i AI
Opis: Jako użytkownik chcę zrozumiałe komunikaty błędów przy problemach z zapisem lub AI oraz możliwość ponowienia.
Kryteria akceptacji:

- Błąd zapisu pokazuje komunikat i przycisk Retry; brak utraty danych w formularzu.
- Błąd AI nie blokuje zapisu; fallback zapewnia poradę.
- Timeout AI następuje po 2,5 s.

US-024 Język interfejsu PL/EN
Opis: Jako użytkownik w Polsce chcę polskojęzyczny interfejs z możliwością przełączenia na angielski.
Kryteria akceptacji:

- Wszystkie stałe tekstowe w PL (domyślnie) oraz dostępny przełącznik na EN w publicznych widokach.
- Przełącznik języka dostępny przynajmniej w landing page i ekranach auth.

US-025 Minimalne bezpieczeństwo haseł
Opis: Jako użytkownik chcę, aby system wymagał minimalnej siły hasła.
Kryteria akceptacji:

- Walidacja przy rejestracji: minimalna długość (np. 8), podstawowa złożoność lub komunikat edukacyjny.
- Komunikat błędu bez ujawniania reguł wrażliwych.

US-026 Widok szczegółu wpisu (light)
Opis: Jako użytkownik chcę podejrzeć szczegóły pojedynczego wpisu w liście 7 dni.
Kryteria akceptacji:

- Widoczne: data/godzina, emoji nastroju, tagi, pełna notatka.
- Brak edycji w PoC.

US-027 Zgodność z moderacją a zapis treści
Opis: Jako użytkownik chcę móc zapisać treść mimo ostrzeżenia, o ile nie narusza polityk treści.
Kryteria akceptacji:

- Po moderacji użytkownik może wybrać Edytuj i Spróbuj ponownie lub Zapisz bez porady AI.
- Jeśli treść narusza politykę, zapis jest odrzucony z jasnym powodem.

US-028 Rytuał domyślny i zmiana ustawień
Opis: Jako użytkownik chcę zmienić godzinę rytuału po FTUE w ustawieniach profilu.
Kryteria akceptacji:

- Widok ustawień profilu z aktualną godziną.
- Zmiana zapisywana i używana przez dashboard.

US-029 Ograniczenia treści w logach
Opis: Jako właściciel produktu chcę, aby treści użytkowników nie były zapisywane w logach aplikacji.
Kryteria akceptacji:

- Brak treści notatek w logach aplikacyjnych i zdarzeniach analitycznych.
- W logach pojawiają się wyłącznie identyfikatory i kody błędów.

US-030 Link do zasobów kryzysowych
Opis: Jako użytkownik chcę stale dostępny link do zasobów kryzysowych.
Kryteria akceptacji:

- Stały link do zasobów kryzysowych w stopce lub menu.
- Kliknięcie otwiera informacje z numerami 112, 116 123 i 800 70 222.

## 6. Metryki sukcesu

1. Użyteczność i czas

- p50 Time-to-Log ≤ 30 s dla fast entry od wejścia na ekran do zapisu.
- ≥ 70% nowych użytkowników kończy pierwszy wpis w pierwszej sesji.

2. Wartość AI

- ≥ 60% porad oznaczonych jako helpful.

3. Retencja krótkoterminowa

- ≥ 30% użytkowników wraca co najmniej raz w ciągu 3 dni.

4. Stabilność i niezawodność

- Błędy zapisu ≤ 2% sesji.
- Timeouty AI ≤ 5% wywołań.

5. Zasięg PoC

- 10–15 aktywnych testerów w ciągu 7 dni PoC, zróżnicowanych na preset 18:00/21:30.

6. Prywatność i bezpieczeństwo

- 100% zdarzeń analitycznych bez treści wrażliwych.
- 100% usunięć konta skutkuje trwałym usunięciem danych.

7. Wskaźniki pomocnicze

- Streak medianowy dni w tygodniu testowym.
- Odsetek wpisów dokonanych w oknie ±1 h od rytuału.
