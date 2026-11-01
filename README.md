# Streszczamy nowe ustawy

Strona (Next.js, statyczny eksport na GitHub Pages) z prostymi streszczeniami i oceną ustaw, które Sejm uchwalił
i przekazał Prezydentowi RP do podpisu. Pokazuje status każdej ustawy (czeka na podpis / podpisana / zawetowana /
skierowana do TK), termin na decyzję, a w przypadku weta – streszczenie uzasadnienia Prezydenta.

Dane są przechowywane jako pliki Markdown w katalogu [`content/ustawy/`](content/) i aktualizowane automatycznie
przez GitHub Actions.

## Jak to działa

```
        w każdą niedzielę (cron)                     gdy są nowe ustawy / zmiany
┌──────────────────────────────┐  gh workflow run  ┌──────────────────────────────┐
│ Sprawdzanie ustaw            │ ────────────────▶ │ Streszczenia AI              │
│ check-bills.yml              │                   │ summarize-bills.yml          │
│ • API Sejmu: zmienione       │                   │ • pobiera tekst ustawy (PDF),│
│   procesy z ostatnich 30 dni │                   │   uchwałę Senatu, weto       │
│ • wybiera ustawy przekazane  │                   │ • Claude Code (subskrypcja   │
│   Prezydentowi do podpisu    │                   │   Pro/Max): streszczenie,    │
│ • aktualizuje status, termin,│                   │   ocena zmian, powody weta   │
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
| **Sprawdzanie ustaw** | `.github/workflows/check-bills.yml` | w każdą niedzielę o 5:23 UTC oraz ręcznie |
| **Streszczenia AI** | `.github/workflows/summarize-bills.yml` | gdy „Sprawdzanie ustaw” znajdzie ustawy bez aktualnego streszczenia, oraz ręcznie |
| **Publikacja strony** | `.github/workflows/deploy.yml` | po pushu do `main`, po zmianach wprowadzonych przez pipeline’y, ręcznie |
| **CI** | `.github/workflows/ci.yml` | dla pull requestów (sprawdzenie typów + build) |

Szczegóły:

- **Źródło danych** – [API Sejmu RP](https://api.sejm.gov.pl) (`/sejm/term{N}/processes`, `/prints`, `/eli/acts`).
  Ustawa trafia do serwisu, gdy w przebiegu procesu legislacyjnego pojawi się etap „Ustawę przekazano Prezydentowi
  do podpisu”. Status wyznaczany jest z kolejnych etapów: podpis, weto (wniosek o ponowne rozpatrzenie), skierowanie
  do Trybunału Konstytucyjnego, a po podpisie – publikacja w Dzienniku Ustaw i data wejścia w życie.
- **Harmonogram** – sprawdzenie odbywa się raz w tygodniu, więc status na stronie może być opóźniony do 7 dni
  (strona ustawy informuje o tym przy statusie „czeka na decyzję”). Przeszukiwane są zmiany z ostatnich 30 dni,
  dzięki czemu nic nie umknie między kolejnymi niedzielami, a pełny przebieg (np. weto i jego data) jest odtwarzany
  z danych Sejmu.
- **Druki rozpatrywane wspólnie** (kilka projektów → jedna ustawa) są łączone w jeden plik.
- **Kiedy uruchamia się AI** – gdy ustawa nie ma jeszcze streszczenia, gdy zmieniły się dokumenty źródłowe
  (np. Senat wniósł poprawki) albo gdy Prezydent zgłosił weto i w Sejmie pojawił się druk z uzasadnieniem.
  Sama zmiana statusu na „podpisana” nie wymaga ponownego streszczenia.
- **Claude Code** – skrypt `scripts/summarize-bills.ts` uruchamia CLI Claude Code w trybie nieinteraktywnym
  (`claude -p`) z wymuszonym schematem odpowiedzi (`--json-schema`) i zamienia wynik na Markdown. Uwierzytelnienie
  odbywa się tokenem subskrypcji (`CLAUDE_CODE_OAUTH_TOKEN`), więc zużycie wlicza się w limity planu Pro/Max,
  a nie w rozliczenia API. Claude Code ma dostęp wyłącznie do narzędzia Read w tymczasowym katalogu
  z dokumentami (`--tools Read --restricted`) – bez Basha, sieci i zapisu plików.
- **Dokumenty** – tekst ustawy jest wyciągany z PDF i przekazywany bezpośrednio w poleceniu; dokumenty będące skanami
  (np. uzasadnienie weta, uchwała Senatu) są zapisywane jako PDF i Claude Code czyta je narzędziem Read.
  Skrypt sprawdza, czy model faktycznie odczytał każdy skan – jeśli nie, wynik jest odrzucany.

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
4. **Token subskrypcji Claude.** Na swoim komputerze (z zainstalowanym Claude Code i zalogowanym kontem
   z subskrypcją Pro lub Max) uruchom:
   ```bash
   claude setup-token
   ```
   Polecenie otworzy przeglądarkę do autoryzacji i wypisze długoterminowy token. Dodaj go jako sekret:
   **Settings → Secrets and variables → Actions → Secrets → New repository secret**, nazwa
   `CLAUDE_CODE_OAUTH_TOKEN`. Token daje dostęp do Twojej subskrypcji – nie umieszczaj go nigdzie poza sekretami.
   Opcjonalnie w zakładce **Variables** możesz ustawić:
   - `CLAUDE_MODEL` – np. `opus` lub `sonnet` (domyślnie: domyślny model Twojego planu),
   - `CLAUDE_EFFORT` – `low` … `max` (domyślnie `high`),
   - `CLAUDE_CODE_VERSION` – wersja CLI z npm (domyślnie kanał `stable`).
5. **Pierwsza publikacja.** Push do `main` uruchomi „Publikacja strony”. Możesz też wejść w **Actions → Publikacja
   strony → Run workflow**. Po chwili strona będzie dostępna pod adresem
   **https://everywebco.github.io/Streszczamy-nowe-ustawy/** (adres widać też w **Settings → Pages**).
6. **Pierwsze dane.** **Actions → Sprawdzanie ustaw → Run workflow** (pole „Ile dni wstecz” – domyślnie 30).
   Workflow zapisze ustawy, uruchomi „Streszczenia AI” i ponownie opublikuje stronę. Od tej pory wszystko dzieje się
   automatycznie w każdą niedzielę.

**Własna domena (opcjonalnie):** w **Settings → Pages → Custom domain** wpisz domenę i skonfiguruj rekord DNS
(CNAME na `everywebco.github.io`). Nic więcej nie trzeba zmieniać – `actions/configure-pages` przekaże do builda
pustą ścieżkę bazową (`PAGES_BASE_PATH`), a linki zaczną działać od korzenia domeny.

## Limity subskrypcji

- Streszczenia zużywają limity Twojego planu Claude (te same, co praca w Claude Code na komputerze). Streszczenie
  jednej ustawy to zwykle 1–2 wywołania, każde po kilkadziesiąt tysięcy tokenów (tekst ustawy, skany).
- Jedno uruchomienie „Streszczenia AI” przetwarza maksymalnie 10 ustaw (`max_bills`). Jeśli zostały kolejne,
  a partia przeszła bez błędów, workflow sam uruchamia następną partię.
- Gdy Claude Code zgłosi osiągnięcie limitu, skrypt przerywa pracę, zapisuje to, co zdążył przygotować,
  a pozostałe ustawy zostaną przetworzone przy kolejnym uruchomieniu (najpóźniej w następną niedzielę albo ręcznie
  z zakładki Actions).
- W podsumowaniu uruchomienia widać liczbę wywołań i ich „równowartość API” – to tylko informacja, przy subskrypcji
  nie jest naliczana.
- GitHub wyłącza harmonogramy w publicznych repozytoriach po 60 dniach bez aktywności – commity robione przez
  pipeline’y się liczą, ale jeśli przez dłuższy czas nie będzie nowych ustaw, sprawdź zakładkę Actions.

## Praca lokalna

Wymagany Node.js ≥ 22.18 (skrypty `.ts` uruchamiane są bezpośrednio przez Node) oraz – do streszczeń –
zainstalowany i zalogowany Claude Code (`npm install -g @anthropic-ai/claude-code`, potem `claude` → `/login`).

```bash
npm install
npm run dev                 # strona: http://localhost:3000
npm run build               # statyczny eksport do out/

npm run check-bills         # sprawdzenie API Sejmu i zapis do content/ustawy/
LOOKBACK_DAYS=60 npm run check-bills

DRY_RUN=1 npm run summarize-bills                  # przygotowuje dokumenty, nie uruchamia Claude Code
BILL_IDS=10-2271 npm run summarize-bills           # używa Twojego zalogowanego Claude Code
```

Zmienne środowiskowe skryptów:

| Zmienna | Skrypt | Opis |
|---|---|---|
| `LOOKBACK_DAYS` | check-bills | ile dni wstecz szukać zmian (domyślnie 30) |
| `SEJM_TERM` | check-bills | numer kadencji (domyślnie bieżąca) |
| `CONTENT_DIR` | oba + strona | katalog z plikami ustaw (domyślnie `content/ustawy`) |
| `CLAUDE_CODE_OAUTH_TOKEN` | summarize-bills | token z `claude setup-token` (lokalnie niepotrzebny po zalogowaniu) |
| `CLAUDE_MODEL` | summarize-bills | model lub alias (`opus`, `sonnet`…); domyślnie model planu |
| `CLAUDE_EFFORT` | summarize-bills | `low` / `medium` / `high` / `xhigh` / `max`, domyślnie `high` |
| `CLAUDE_BIN` | summarize-bills | ścieżka do CLI Claude Code (domyślnie `claude`) |
| `BILL_IDS` | summarize-bills | lista ID, np. `10-2271,10-316` |
| `FORCE` | summarize-bills | `true` – wygeneruj ponownie aktualne streszczenia |
| `MAX_BILLS` | summarize-bills | limit ustaw na uruchomienie (domyślnie 10) |
| `DRY_RUN` | summarize-bills | `1` – bez uruchamiania Claude Code i bez zapisu |

## Struktura repozytorium

```
content/ustawy/             pliki Markdown z ustawami (format: content/README.md)
scripts/check-bills.ts      pipeline sprawdzający API Sejmu
scripts/summarize-bills.ts  pipeline AI (Claude Code w trybie nieinteraktywnym)
scripts/lib/                klient API Sejmu, zapis plików, helpery GitHub Actions
src/app/                    strona Next.js (lista, strona ustawy, „Jak to działa”, RSS)
src/components/             komponenty UI
src/lib/                    typy i logika współdzielona przez stronę i skrypty
.github/workflows/          pipeline’y GitHub Actions
```
