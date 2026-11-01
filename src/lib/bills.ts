// Odczyt ustaw z plików Markdown podczas budowania strony (static export).
import fs from "node:fs";
import path from "node:path";
import { BILL_STATUSES, type BillFrontmatter, type BillStatus } from "./bill-types";
import { parseMarkdownFile } from "./markdown-file";

export interface Bill extends BillFrontmatter {
  body: string;
}

const CONTENT_DIR = path.resolve(process.cwd(), process.env.CONTENT_DIR ?? "content/ustawy");

let cache: Bill[] | null = null;

export function getAllBills(): Bill[] {
  if (cache) return cache;
  const files = fs.existsSync(CONTENT_DIR)
    ? fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    : [];
  const bills = files
    .map((file) => {
      const { data, body } = parseMarkdownFile<BillFrontmatter>(fs.readFileSync(path.join(CONTENT_DIR, file), "utf8"));
      return { ...data, id: data.id ?? file.replace(/\.md$/, ""), body };
    })
    .filter((bill) => BILL_STATUSES.includes(bill.status));
  cache = sortBills(bills);
  return cache;
}

export function getBill(id: string): Bill | undefined {
  return getAllBills().find((bill) => bill.id === id);
}

/** Najpierw ustawy czekające na decyzję (najbliższy termin na górze), potem najnowsze decyzje. */
export function sortBills<T extends BillFrontmatter>(bills: T[]): T[] {
  return [...bills].sort((a, b) => {
    const pendingA = a.status === "oczekuje";
    const pendingB = b.status === "oczekuje";
    if (pendingA !== pendingB) return pendingA ? -1 : 1;
    if (pendingA) return (a.deadline ?? "").localeCompare(b.deadline ?? "");
    return b.statusDate.localeCompare(a.statusDate) || b.toPresidentDate.localeCompare(a.toPresidentDate);
  });
}

export function countByStatus(bills: BillFrontmatter[]): Record<BillStatus, number> {
  const counts = Object.fromEntries(BILL_STATUSES.map((s) => [s, 0])) as Record<BillStatus, number>;
  for (const bill of bills) counts[bill.status]++;
  return counts;
}
