// Codzienny skrypt pipeline'u "check-bills":
//  1. pobiera z API Sejmu procesy legislacyjne zmienione w ostatnich LOOKBACK_DAYS dniach,
//  2. wybiera ustawy przekazane Prezydentowi do podpisu i zapisuje je w content/ustawy/<id>.md,
//  3. ponownie sprawdza status już śledzonych ustaw, które nie mają jeszcze ostatecznego rozstrzygnięcia,
//  4. zwraca (GITHUB_OUTPUT) listę ustaw wymagających streszczenia/oceny przez AI.
//
// Zmienne środowiskowe:
//   LOOKBACK_DAYS – ile dni wstecz przeszukiwać zmiany (domyślnie 30 – obejmuje cały 21-dniowy termin na decyzję Prezydenta)
//   SEJM_TERM     – numer kadencji (domyślnie bieżąca)
//   CONTENT_DIR   – katalog z plikami ustaw (domyślnie content/ustawy)
import {
  BILL_STATUSES,
  SEJM_FIELDS,
  STATUS_LABELS,
  pendingAiWork,
  type BillFrontmatter,
  type SejmFields,
} from "../src/lib/bill-types.ts";
import { addSummary, error, plural, setOutput, warning } from "./lib/gha.ts";
import {
  billId,
  buildBillFromProcess,
  getCurrentTerm,
  getProcess,
  hasToPresidentStage,
  jointPrints,
  listModifiedProcesses,
  type ProcessDetails,
} from "./lib/sejm.ts";
import { loadBills, saveBill, type StoredBill } from "./lib/store.ts";

const LOOKBACK_DAYS = Number(process.env.LOOKBACK_DAYS || 30);
const DAY = 24 * 60 * 60 * 1000;

type Change = { id: string; title: string; kind: "nowa" | "status" | "aktualizacja"; from?: string; to: string };

function pickSejmFields(data: Partial<BillFrontmatter>): Partial<SejmFields> {
  return Object.fromEntries(SEJM_FIELDS.map((key) => [key, data[key]])) as Partial<SejmFields>;
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}

/** Czy śledzoną ustawę trzeba ponownie sprawdzić, nawet jeśli nie pojawiła się na liście zmian? */
function needsRecheck(bill: BillFrontmatter, now: number): boolean {
  if (bill.status !== "podpisana") return true;
  // Po podpisie czekamy jeszcze na publikację w Dzienniku Ustaw (maks. 90 dni).
  const signedAgo = now - Date.parse(bill.statusDate);
  return (!bill.publication || !bill.publication.promulgation) && signedAgo < 90 * DAY;
}

async function main() {
  const now = Date.now();
  const term = await getCurrentTerm();
  const bills = await loadBills();
  const since = new Date(now - LOOKBACK_DAYS * DAY);

  // indeks: "kadencja-druk" -> id pliku (uwzględnia druki rozpatrywane wspólnie)
  const printIndex = new Map<string, string>();
  for (const { data } of bills.values()) {
    for (const print of data.prints ?? [data.print]) printIndex.set(`${data.term}-${print}`, data.id);
  }

  console.log(`Kadencja ${term}. Szukam zmian od ${since.toISOString().slice(0, 10)} (${LOOKBACK_DAYS} dni).`);
  const modified = await listModifiedProcesses(term, since);
  const candidates = modified.filter((p) => (p.documentTypeEnum ?? "BILL") === "BILL" && p.passed !== false);
  console.log(`Zmienione procesy: ${modified.length}, w tym uchwalone projekty ustaw: ${candidates.length}.`);

  const queue = new Map<string, { term: number; print: string }>();
  for (const p of candidates) queue.set(`${term}-${p.number}`, { term, print: p.number });
  for (const { data } of bills.values()) {
    if (needsRecheck(data, now)) queue.set(`${data.term}-${data.print}`, { term: data.term, print: data.print });
  }

  const seen = new Set<string>();
  const changes: Change[] = [];
  const failures: string[] = [];

  for (const [key, item] of queue) {
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      let process: ProcessDetails | null = await getProcess(item.term, item.print);
      if (!process || !hasToPresidentStage(process)) continue;

      // Druki rozpatrywane wspólnie to jedna ustawa – śledzimy ją pod jednym identyfikatorem.
      const group = jointPrints(process);
      group.forEach((p) => seen.add(`${item.term}-${p}`));
      const existingId = group.map((p) => printIndex.get(`${item.term}-${p}`)).find(Boolean);
      const canonicalPrint = existingId ? bills.get(existingId)!.data.print : group[0];
      if (canonicalPrint !== process.number) {
        const canonical = await getProcess(item.term, canonicalPrint);
        if (canonical && hasToPresidentStage(canonical)) process = canonical;
      }

      const fields = await buildBillFromProcess(process);
      if (!fields) continue;
      const prints = [...new Set([...group, ...fields.prints])].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
      fields.prints = prints;
      fields.print = canonicalPrint;
      fields.id = existingId ?? billId(item.term, canonicalPrint);
      prints.forEach((p) => seen.add(`${item.term}-${p}`));

      const previous = bills.get(fields.id);
      if (previous && stableJson(pickSejmFields(previous.data)) === stableJson(fields)) continue;

      const updated: StoredBill = {
        data: { ...(previous?.data ?? {}), ...fields, updatedAt: new Date(now).toISOString() } as BillFrontmatter,
        body: previous?.body ?? "",
      };
      await saveBill(updated);
      bills.set(fields.id, updated);
      prints.forEach((p) => printIndex.set(`${item.term}-${p}`, fields.id));

      const change: Change = !previous
        ? { id: fields.id, title: fields.title, kind: "nowa", to: fields.status }
        : previous.data.status !== fields.status
          ? { id: fields.id, title: fields.title, kind: "status", from: previous.data.status, to: fields.status }
          : { id: fields.id, title: fields.title, kind: "aktualizacja", to: fields.status };
      changes.push(change);
      console.log(
        `[${change.kind}] ${fields.id}: ${fields.title} → ${STATUS_LABELS[fields.status]}` +
          (change.from ? ` (było: ${STATUS_LABELS[change.from as keyof typeof STATUS_LABELS]})` : ""),
      );
    } catch (e) {
      const message = `Nie udało się przetworzyć druku ${item.print} (kadencja ${item.term}): ${(e as Error).message}`;
      failures.push(message);
      warning(message);
    }
  }

  // Ustawy, dla których brakuje streszczenia lub uzasadnienia decyzji (także po wcześniejszych błędach AI).
  const aiQueue = [...bills.values()]
    .filter(({ data }) => BILL_STATUSES.includes(data.status))
    .filter(({ data }) => {
      const work = pendingAiWork(data);
      return work.summary || work.decision;
    })
    .map(({ data }) => data.id);

  const added = changes.filter((c) => c.kind === "nowa").length;
  const statusChanged = changes.filter((c) => c.kind === "status").length;
  const updatedCount = changes.length - added - statusChanged;
  const parts = [
    added && plural(added, "nowa", "nowe", "nowych"),
    statusChanged && plural(statusChanged, "zmiana statusu", "zmiany statusu", "zmian statusu"),
    updatedCount && plural(updatedCount, "aktualizacja", "aktualizacje", "aktualizacji"),
  ].filter(Boolean);
  const commitMessage = `Ustawy: ${parts.join(", ") || "brak zmian"}`;

  console.log(`\n${commitMessage}. Do streszczenia przez AI: ${aiQueue.length}.`);
  await setOutput("changed", changes.length > 0 ? "true" : "false");
  await setOutput("ai_ids", aiQueue.join(","));
  await setOutput("commit_message", commitMessage);

  const rows = changes
    .map((c) => {
      const status = c.from
        ? `${STATUS_LABELS[c.from as keyof typeof STATUS_LABELS]} → ${STATUS_LABELS[c.to as keyof typeof STATUS_LABELS]}`
        : STATUS_LABELS[c.to as keyof typeof STATUS_LABELS];
      return `| \`${c.id}\` | ${c.title.replace(/\|/g, "\\|")} | ${c.kind} | ${status} |`;
    })
    .join("\n");
  await addSummary(
    [
      `## Sprawdzanie ustaw – kadencja ${term}`,
      `Przeszukano zmiany z ostatnich ${LOOKBACK_DAYS} dni: ${modified.length} procesów, sprawdzono ${seen.size} druków.`,
      changes.length ? `| ID | Ustawa | Zmiana | Status |\n|---|---|---|---|\n${rows}` : "Brak zmian.",
      aiQueue.length ? `**Do streszczenia przez AI:** ${aiQueue.map((id) => `\`${id}\``).join(", ")}` : "",
      failures.length ? `### Błędy\n${failures.map((f) => `- ${f}`).join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  );

  if (failures.length > 0 && changes.length === 0 && failures.length === queue.size) {
    throw new Error("Nie udało się przetworzyć żadnego druku – API Sejmu może być niedostępne.");
  }
}

main().catch((e) => {
  error((e as Error).stack ?? String(e));
  process.exit(1);
});
