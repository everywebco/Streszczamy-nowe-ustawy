// Zasady prostego języka dla streszczeń ustaw.
// Jedno źródło dla polecenia AI (scripts/summarize-bills.ts) i strony „Jak to działa” (src/app/o-projekcie).
// Uwaga: plik jest uruchamiany także bezpośrednio przez Node (type stripping) – tylko „wymazywalna” składnia TS.

/** Dla kogo piszemy – wspólny opis czytelnika. */
export const PLAIN_LANGUAGE_READER =
  "Piszemy dla przeciętnego obywatela: osoby bez wykształcenia prawniczego i ekonomicznego, która czyta streszczenie " +
  "w kilka minut, np. na telefonie, i chce wiedzieć, co ta ustawa zmienia w jej życiu, w życiu jej rodziny, pracy lub firmy.";

/** Zasady prostego języka – wyświetlane na stronie i przekazywane modelowi AI. */
export const PLAIN_LANGUAGE_RULES: readonly string[] = [
  "Krótkie zdania – zwykle do 20 słów, jedna myśl w jednym zdaniu.",
  "Codzienne słowa zamiast urzędowych: „firma” zamiast „podmiot gospodarczy”, „urząd skarbowy” zamiast „organ podatkowy”, „pieniądze z budżetu” zamiast „środki publiczne”.",
  "Każdy niezbędny termin prawniczy lub skrót wyjaśniamy przy pierwszym użyciu, np. „KAS (Krajowa Administracja Skarbowa, czyli skarbówka)”.",
  "Bez numerów artykułów, paragrafów i pozycji Dziennika Ustaw oraz bez przepisywania brzmienia przepisów – mówimy, co z nich wynika.",
  "Najpierw najważniejsze: co się zmienia i kogo to dotyczy, dopiero potem szczegóły.",
  "Konkretnie: kto, co musi lub może zrobić, od kiedy, ile – podajemy kwoty i daty, jeśli są w ustawie.",
  "Strona czynna i bezpośredni zwrot („firma złoży wniosek przez internet”, a nie „wniosek jest składany drogą elektroniczną”).",
  "Gdy przepis jest trudny, dodajemy krótki przykład z życia.",
  "Jeśli ustawa nie zmienia nic w codziennym życiu większości ludzi, mówimy to wprost.",
];
