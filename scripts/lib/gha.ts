// Pomocnicze funkcje dla GitHub Actions (outputs, podsumowanie kroku, adnotacje).
import { appendFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

export async function setOutput(name: string, value: string): Promise<void> {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) {
    console.log(`[output] ${name}=${value}`);
    return;
  }
  const delimiter = `EOF_${randomUUID()}`;
  await appendFile(file, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
}

export async function addSummary(markdown: string): Promise<void> {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (file) await appendFile(file, `${markdown}\n`);
}

export function warning(message: string): void {
  if (process.env.GITHUB_ACTIONS) console.log(`::warning::${message.replace(/\r?\n/g, "%0A")}`);
  else console.warn(`UWAGA: ${message}`);
}

export function error(message: string): void {
  if (process.env.GITHUB_ACTIONS) console.log(`::error::${message.replace(/\r?\n/g, "%0A")}`);
  else console.error(`BŁĄD: ${message}`);
}

/** Polska odmiana liczebników: plural(2, "ustawa", "ustawy", "ustaw") → "2 ustawy". */
export function plural(n: number, one: string, few: string, many: string): string {
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  const word = n === 1 ? one : lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many;
  return `${n} ${word}`;
}
