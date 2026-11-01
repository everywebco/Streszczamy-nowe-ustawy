// Odczyt i zapis plików content/ustawy/<id>.md
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BillFrontmatter } from "../../src/lib/bill-types.ts";
import { parseMarkdownFile, stringifyMarkdownFile } from "../../src/lib/markdown-file.ts";

export const CONTENT_DIR = path.resolve(process.env.CONTENT_DIR ?? "content/ustawy");

export interface StoredBill {
  data: BillFrontmatter;
  body: string;
}

const fileFor = (id: string) => path.join(CONTENT_DIR, `${id}.md`);

export async function loadBills(): Promise<Map<string, StoredBill>> {
  const bills = new Map<string, StoredBill>();
  let files: string[] = [];
  try {
    files = (await readdir(CONTENT_DIR)).filter((f) => f.endsWith(".md") && !f.startsWith("_"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  for (const file of files.sort()) {
    const source = await readFile(path.join(CONTENT_DIR, file), "utf8");
    const parsed = parseMarkdownFile<BillFrontmatter>(source);
    bills.set(parsed.data.id ?? file.replace(/\.md$/, ""), parsed);
  }
  return bills;
}

export async function saveBill(bill: StoredBill): Promise<void> {
  await mkdir(CONTENT_DIR, { recursive: true });
  await writeFile(fileFor(bill.data.id), stringifyMarkdownFile(bill.data, bill.body), "utf8");
}
