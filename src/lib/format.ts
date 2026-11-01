const toDate = (date: string) => new Date(`${date.slice(0, 10)}T00:00:00Z`);

const longFormat = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const shortFormat = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(date: string | null | undefined): string {
  return date ? longFormat.format(toDate(date)) : "—";
}

export function formatShortDate(date: string | null | undefined): string {
  return date ? shortFormat.format(toDate(date)) : "—";
}

/** "Ustawa z dnia 4 września 2026 r." */
export function actDateLabel(passedDate: string | null): string {
  return passedDate ? `Ustawa z dnia ${formatDate(passedDate)} r.` : "Ustawa";
}

/** Liczba pełnych dni od dziś (lokalnie) do podanej daty; ujemna, jeśli termin minął. */
export function daysUntil(date: string, now = new Date()): number {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((toDate(date).getTime() - today) / 86_400_000);
}

export function pluralDays(n: number): string {
  return n === 1 ? "1 dzień" : `${n} dni`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const SITE_NAME = "Streszczamy nowe ustawy";
export const SITE_DESCRIPTION =
  "Streszczenia i ocena ustaw uchwalonych przez Sejm i przekazanych Prezydentowi RP do podpisu. Status, terminy i powody decyzji Prezydenta.";
export const REPO_URL =
  process.env.NEXT_PUBLIC_REPO_URL || "https://github.com/everywebco/Streszczamy-nowe-ustawy";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
