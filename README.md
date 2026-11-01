# Streszczamy nowe ustawy

Strona (Next.js, statyczny eksport na GitHub Pages) z prostymi streszczeniami i oceną ustaw, które Sejm uchwalił
i przekazał Prezydentowi RP do podpisu. Pokazuje status każdej ustawy (czeka na podpis / podpisana / zawetowana /
skierowana do TK), termin na decyzję, a w przypadku weta – streszczenie uzasadnienia Prezydenta.

Dane są przechowywane jako pliki Markdown w katalogu [`content/ustawy/`](content/) i aktualizowane automatycznie
przez GitHub Actions.

## Jak to działa

```
          codziennie (cron)                          gdy są nowe ustawy / zmiany
┌──────────────────────────────┐  gh workflow run  ┌──────────────────────────────┐
│ Sprawdzanie ustaw            │ ────────────────▶ │ Streszczenia AI              │
│ check-bills.yml              │                   │ summarize-bills.yml          │
│ • API Sejmu: zmienione       │                   │ • pobiera tekst ustawy (PDF),│
│   procesy z ostatnich 30 dni │                   │   uchwałę Senatu, weto       │
│ • wybiera ustawy przekazane  │                   │ • Claude (Anthropic API):    │
│   Prezydentowi do podpisu    │                   │   streszczenie, ocena zmian, │
│ • aktualizuje status, termin,│                   │   powody weta                │
│   weto, publikację w Dz.U.   │                   │ • commit content/ustawy/*.md │
│ • commit content/ustawy/*.md │                   └──────────────┬───────────────┘
└──────────────┬───────────────┘                                  │
               │ gh workflow run                                  │ gh workflow run
               ▼                                                  ▼
        ┌─────────────────────────────────────────────────────────────────┐
        │ Publikacja strony – deploy.yml: next build → GitHub Pages       │
        └─────────────────────────────────────────────────────────────────┘
```

| Workflow | Plik | Kiedy się uruchamia |
|---|---|---|
| **Sprawdzanie ustaw** | `.github/workflows/check-bills.yml` | codziennie o 5:23 UTC oraz ręcznie |
| **Streszczenia AI** | `.github/workflows/summarize-bills.yml` | gdy „Sprawdzanie ustaw” znajdzie ustawy bez aktualnego streszczenia, oraz ręcznie |
| **Publikacja strony** | `.github/workflows/deploy.yml` | po pushu do `main`, po zmianach wprowadzonych przez pipeline’y, ręcznie |
| **CI** | `.github/workflows/ci.yml` | dla pull requestów (sprawdzenie typów + build) |

Szczegóły:

- **Źródło danych** – [API Sejmu RP](https://api.sejm.gov.pl) (`/sejm/term{N}/processes`, `/prints`, `/eli/acts`).
  Ustawa trafia do serwisu, gdy w przebiegu procesu legislacyjnego pojawi się etap „Ustawę przekazano Prezydentowi
  do podpisu”. Status wyznaczany jest z kolejnych etapów: podpis, weto (wniosek o ponowne rozpatrzenie), skierowanie
  do Trybunału Konstytucyjnego, a po podpisie – publikacja w Dzienniku Ustaw i data wejścia w życie.
- **Druki rozpatrywane wspólnie** (kilka projektów → jedna ustawa) są łączone w jeden plik.
- **Kiedy uruchamia się AI** – gdy ustawa nie ma jeszcze streszczenia, gdy zmieniły się dokumenty źródłowe
  (np. Senat wniósł poprawki) albo gdy Prezydent zgłosił weto i w Sejmie pojawił się druk z uzasadnieniem.
  Sama zmiana statusu na „podpisana” nie wymaga ponownego streszczenia.
- **Dokumenty dla modelu** – tekst ustawy jest wyciągany z PDF jako tekst (taniej); dokumenty będące skanami
  (np. uzasadnienie weta, uchwała Senatu) są wysyłane jako PDF, który model odczytuje wizualnie.
- **Model** – domyślnie `claude-opus-5-5` z ustrukturyzowaną odpowiedzią (JSON → Markdown), adaptacyjnym
  myśleniem i `effort: high`. Włączony jest serwerowy fallback (`fallbacks: "default"`) – jeśli klasyfikatory
  bezpieczeństwa odrzucą zapytanie, API automatycznie ponowi je na rekomendowanym modelu zapasowym.

## Hosting na GitHub Pages – krok po kroku

Strona jest w pełni statyczna (`next build` z `output: "export"` tworzy katalog `out/`), więc GitHub Pages
wystarcza – nie potrzeba serwera ani bazy danych.

1. **Gałąź `main`.** Workflowy zakładają, że gałęzią domyślną jest `main` (tylko z niej działa harmonogram
   cron i tylko z niej GitHub Pages przyjmuje wdrożenia). Jeśli repozytorium nie ma jeszcze `main`, utwórz ją z gałęzi
   z tym kodem, np.:
   ```bash
   git fetch origin
   git push origin origin/claude/nextjs-bills-summaries-app-q20khm:refs/heads/main
   ```
   a potem w **Settings → General → Default branch** ustaw `main`. (Jeśli `main` już istnieje – po prostu zmerguj
   pull request z tymi zmianami.)
2. **Włącz GitHub Pages.** **Settings → Pages → Build and deployment → Source: „GitHub Actions”.**
3. **Uprawnienia workflowów.** **Settings → Actions → General**: upewnij się, że Actions są włączone. Workflowy same
   deklarują potrzebne uprawnienia (`contents: write`, `actions: write`, `pages: write`); jeśli organizacja
   wymusza tylko odczyt, ustaw **Workflow permissions → Read and write permissions**.
4. **Klucz API Anthropic.** Utwórz klucz w [Claude Console](https://platform.claude.com/settings/keys)
   i dodaj go jako sekret: **Settings → Secrets and variables → Actions → Secrets → New repository secret**,
   nazwa `ANTHROPIC_API_KEY`.
   Opcjonalnie w zakładce **Variables** możesz ustawić `ANTHROPIC_MODEL` (np. `claude-sonnet-5-5`, by obniżyć koszty)
   i `ANTHROPIC_EFFORT` (`low` … `max`).
5. **Pierwsza publikacja.** Push do `main` uruchomi „Publikacja strony”. Możesz też wejść w **Actions → Publikacja
   strony → Run workflow**. Po chwili strona będzie dostępna pod adresem
   **https://everywebco.github.io/Streszczamy-nowe-ustawy/** (adres widać też w **Settings → Pages**).
6. **Pierwsze dane.** **Actions → Sprawdzanie ustaw → Run workflow** (pole „Ile dni wstecz” – domyślnie 30, co
   obejmuje cały 21-dniowy termin na decyzję Prezydenta). Workflow zapisze ustawy, uruchomi „Streszczenia AI”
   i ponownie opublikuje stronę. Od tej pory wszystko dzieje się automatycznie raz dziennie.

**Własna domena (opcjonalnie):** w **Settings → Pages → Custom domain** wpisz domenę i skonfiguruj rekord DNS
(CNAME na `everywebco.github.io`). Nic więcej nie trzeba zmieniać – `actions/configure-pages` przekaże do builda
pustą ścieżkę bazową (`PAGES_BASE_PATH`), a linki zaczną działać od korzenia domeny.

## Koszty i limity

- Jedno uruchomienie „Streszczenia AI” przetwarza maksymalnie 10 ustaw (`max_bills`), pozostałe trafiają do kolejnego
  uruchomienia – chroni to przed nieoczekiwanym rachunkiem przy pierwszym zasileniu danymi.
- Orientacyjnie: streszczenie jednej ustawy to kilkadziesiąt tysięcy tokenów wejściowych (tekst ustawy, skany)
  i kilka–kilkanaście tysięcy wyjściowych, czyli przy `claude-opus-5-5` zwykle kilkadziesiąt centów (USD) za ustawę.
  Liczbę tokenów każdego wywołania widać w podsumowaniu uruchomienia workflowu.
- Ustawy, których nie udało się streścić (np. błąd API), zostaną automatycznie ponowione przy następnym codziennym
  sprawdzeniu.
- GitHub wyłącza harmonogramy w publicznych repozytoriach po 60 dniach bez aktywności – commity robione przez
  pipeline’y się liczą, ale jeśli przez dłuższy czas nie będzie nowych ustaw, sprawdź zakładkę Actions.

## Praca lokalna

Wymagany Node.js ≥ 22.18 (skrypty `.ts` uruchamiane są bezpośrednio przez Node).

```bash
npm install
npm run dev                 # strona: http://localhost:3000
npm run build               # statyczny eksport do out/

npm run check-bills         # sprawdzenie API Sejmu i zapis do content/ustawy/
LOOKBACK_DAYS=60 npm run check-bills

DRY_RUN=1 npm run summarize-bills                         # pobiera dokumenty, nie wywołuje API
ANTHROPIC_API_KEY=sk-ant-... BILL_IDS=10-2271 npm run summarize-bills
```

Zmienne środowiskowe skryptów:

| Zmienna | Skrypt | Opis |
|---|---|---|
| `LOOKBACK_DAYS` | check-bills | ile dni wstecz szukać zmian (domyślnie 30) |
| `SEJM_TERM` | check-bills | numer kadencji (domyślnie bieżąca) |
| `CONTENT_DIR` | oba + strona | katalog z plikami ustaw (domyślnie `content/ustawy`) |
| `ANTHROPIC_API_KEY` | summarize-bills | klucz API |
| `ANTHROPIC_MODEL` | summarize-bills | model, domyślnie `claude-opus-5-5` |
| `ANTHROPIC_EFFORT` | summarize-bills | `low` / `medium` / `high` / `xhigh` / `max`, domyślnie `high` |
| `BILL_IDS` | summarize-bills | lista ID, np. `10-2271,10-316` |
| `FORCE` | summarize-bills | `true` – wygeneruj ponownie aktualne streszczenia |
| `MAX_BILLS` | summarize-bills | limit ustaw na uruchomienie (domyślnie 10) |
| `DRY_RUN` | summarize-bills | `1` – bez wywołania API i bez zapisu |

## Struktura repozytorium

```
content/ustawy/          pliki Markdown z ustawami (format: content/README.md)
scripts/check-bills.ts   pipeline sprawdzający API Sejmu
scripts/summarize-bills.ts  pipeline AI (Anthropic SDK)
scripts/lib/             klient API Sejmu, zapis plików, helpery GitHub Actions
src/app/                 strona Next.js (lista, strona ustawy, „Jak to działa”, RSS)
src/components/          komponenty UI
src/lib/                 typy i logika współdzielona przez stronę i skrypty
.github/workflows/       pipeline’y GitHub Actions
```
