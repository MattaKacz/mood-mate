---
title: Auth Flow Checklist
---

## 1. Register (happy path)

- [ ] Wejdź na `/register` jako niezalogowany użytkownik
- [ ] Wpisz nowe `email` + hasło ≥ 8 znaków
- [ ] Zaznacz checkboxy Terms oraz Adult
- [ ] Kliknij `Create account`
- [ ] Sprawdź, że UI pokazuje stan „Redirecting…” i po chwili następuje przejście do `/app/ftue`
- [ ] Sprawdź w narzędziach dev, że pojawiły się cookies `mm_access_token` i `mm_refresh_token` (httpOnly)

## 2. Register – walidacje

- [ ] Odznacz oba checkboxy i spróbuj submitować – przycisk powinien być disabled
- [ ] Wpisz hasło krótsze niż 8 znaków – formularz blokuje submit z komunikatem EN
- [ ] Spróbuj zarejestrować istniejący email – zobacz neutralny komunikat + focus na polu email

## 3. Login

- [ ] Wyloguj się (patrz sekcja 5) i przejdź na `/login`
- [ ] Wpisz poprawne dane konta – powinieneś trafić na `/app/dashboard`
- [ ] Wpisz błędne hasło – globalny alert „Invalid email or password”, pola zachowują wartości
- [ ] Kilkukrotnie wpisuj złe hasło aż backend zwróci `429` – formularz blokuje submit i pokazuje RateLimitNotice

## 4. Guardy tras

- [ ] Zaloguj się i spróbuj odwiedzić `/login` lub `/register` – natychmiast przekierowuje na `/app/dashboard`
- [ ] Będąc niezalogowanym, otwórz dowolny `/app/...` – redirect na `/login?redirectTo=...`
- [ ] Zaloguj się ponownie i odwiedź `https://app?` z parametrami – redirect zachowuje pełną ścieżkę w `redirectTo`

## 5. Logout

- [ ] Wywołaj UI `LogoutButton` (po integracji w App Shell)
- [ ] Obserwuj, że endpoint `POST /api/auth/logout` zwraca 200 oraz cookies `mm_*` znikają
- [ ] Po sukcesie następuje redirect do `/login`
- [ ] Jeśli endpoint zwróci błąd, komponent pokazuje komunikat i pozwala kliknąć „Try again”

## 6. Re-logowanie

- [ ] Po logout natychmiast zaloguj się ponownie tym samym kontem – flow działa bez wymuszania refresh
- [ ] Odśwież stronę `/app/dashboard` – sesja jest nadal aktywna (cookies)

## 7. Localized copy sanity check

- [ ] Przełącz język (jeśli dostępne) i upewnij się, że `LoginView` i `RegisterView` pokazują odpowiednie teksty
- [ ] Potwierdź, że `LogoutButton` korzysta z tych samych stringów (PL/EN)

## 8. Error observability

- [ ] W przypadku błędów 5xx sprawdź, że UI pokazuje neutralny komunikat + `X-Request-Id` jest dostępny w response headers
- [ ] Zloguj sample requestId do notatek QA (ułatwia korelację z backendem)
