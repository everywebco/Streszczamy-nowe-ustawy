# Format plików ustaw

Każda ustawa to jeden plik `content/ustawy/<kadencja>-<druk>.md`, np. `10-2271.md`. Pliki tworzy i aktualizuje
pipeline „Sprawdzanie ustaw”, a streszczenia dopisuje pipeline „Streszczenia AI”. Można je też poprawiać ręcznie –
ręczne zmiany w treści zostaną zachowane, dopóki AI nie wygeneruje streszczenia ponownie (np. po poprawkach Senatu
albo przy uruchomieniu z opcją `force`).

## Frontmatter (YAML)

Pola uzupełniane z API Sejmu (`scripts/check-bills.ts`):

| Pole | Opis |
|---|---|
| `id`, `term`, `print`, `prints` | identyfikator, kadencja, główny druk i wszystkie druki rozpatrywane wspólnie |
| `title`, `projectTitle` | tytuł ustawy („o …”) i tytuł projektu |
| `initiator`, `description` | inicjator projektu i opis z systemu Sejmu |
| `passedDate`, `toPresidentDate` | data uchwalenia przez Sejm i przekazania Prezydentowi |
| `deadline` | termin na decyzję Prezydenta (tylko dla statusu `oczekuje`) |
| `status`, `statusDate` | `oczekuje` · `podpisana` · `zawetowana` · `skierowana-do-tk` i data zmiany |
| `timeline` | przebieg: uchwalenie, Senat, przekazanie, decyzje Prezydenta, publikacja |
| `voting` | wynik głosowania nad całością ustawy w Sejmie |
| `veto` | data, numer druku i PDF wniosku Prezydenta o ponowne rozpatrzenie |
| `tribunal` | skierowanie do TK i ewentualne orzeczenie |
| `publication` | adres w Dzienniku Ustaw (ELI), data ogłoszenia i wejścia w życie |
| `links` | strona procesu w Sejmie, PDF tekstu ustawy, PDF uchwały Senatu (gdy były poprawki) |

Pola uzupełniane przez AI (`scripts/summarize-bills.ts`):

| Pole | Opis |
|---|---|
| `lead` | 1–2 zdania o tym, co zmienia ustawa (lista ustaw na stronie) |
| `impact` | skala zmian: `niewielka` · `umiarkowana` · `duża` |
| `affected` | grupy, których ustawa dotyczy |
| `decisionSummary` | 2–3 zdania o powodach weta |
| `ai` | model, data wygenerowania i klucze dokumentów źródłowych (`sourceKey`, `decisionKey`) |

## Treść (Markdown)

Sekcje `## Streszczenie`, `## Najważniejsze zmiany`, `## Kogo dotyczy`, `## Wejście w życie`, `## Ocena zmian`
oraz – dla zawetowanych ustaw – `## Uzasadnienie weta Prezydenta` (wyświetlana na stronie w osobnej ramce przy
statusie). Surowy HTML w treści nie jest renderowany.
