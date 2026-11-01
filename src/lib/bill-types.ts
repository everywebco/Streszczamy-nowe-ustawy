// Wspólne typy dla strony (Next.js) i skryptów pipeline'ów (scripts/*.ts).
// Uwaga: plik jest uruchamiany także bezpośrednio przez Node (type stripping),
// więc może zawierać wyłącznie "wymazywalną" składnię TypeScript (bez enum, namespace itp.).

export const BILL_STATUSES = ["oczekuje", "podpisana", "zawetowana", "skierowana-do-tk"] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

export const STATUS_LABELS: Record<BillStatus, string> = {
  oczekuje: "Czeka na decyzję Prezydenta",
  podpisana: "Podpisana",
  zawetowana: "Zawetowana",
  "skierowana-do-tk": "Skierowana do Trybunału Konstytucyjnego",
};

export const STATUS_SHORT_LABELS: Record<BillStatus, string> = {
  oczekuje: "Czeka na podpis",
  podpisana: "Podpisana",
  zawetowana: "Weto",
  "skierowana-do-tk": "W TK",
};

export const IMPACT_LEVELS = ["niewielka", "umiarkowana", "duża"] as const;
export type ImpactLevel = (typeof IMPACT_LEVELS)[number];

/** Pojedyncze zdarzenie na osi czasu procesu legislacyjnego. */
export interface TimelineEvent {
  date: string | null;
  label: string;
  details?: string;
  /** Ustawione, jeśli zdarzenie zmienia status ustawy z punktu widzenia Prezydenta. */
  status?: BillStatus;
}

export interface Voting {
  yes: number;
  no: number;
  abstain: number;
  notParticipating: number;
}

export interface VetoInfo {
  date: string;
  /** Numer druku sejmowego z wnioskiem Prezydenta o ponowne rozpatrzenie ustawy. */
  print: string | null;
  url: string | null;
}

export interface TribunalInfo {
  date: string | null;
  verdict: string | null;
}

export interface PublicationInfo {
  eli: string;
  displayAddress: string | null;
  url: string;
  /** Data ogłoszenia w Dzienniku Ustaw */
  promulgation: string | null;
  /** Data wejścia w życie (główna) */
  entryIntoForce: string | null;
  /** Uwagi ISAP, np. o innych terminach wejścia w życie części przepisów */
  comments: string | null;
}

export interface BillLinks {
  /** Strona procesu legislacyjnego na sejm.gov.pl */
  sejm: string;
  /** PDF z tekstem ustawy uchwalonej przez Sejm */
  text: string | null;
  /** Druk z uchwałą Senatu (jeśli Senat wniósł poprawki) */
  senate: string | null;
}

/** Metadane wygenerowane przez pipeline AI (scripts/summarize-bills.ts). */
export interface AiMeta {
  model: string;
  generatedAt: string;
  /** Klucz dokumentów źródłowych, na podstawie których powstało streszczenie. */
  sourceKey: string | null;
  /** Klucz dokumentu z uzasadnieniem decyzji Prezydenta (np. "veto:3229"). */
  decisionKey: string | null;
  truncated?: boolean;
}

/**
 * Frontmatter pliku content/ustawy/<id>.md.
 *
 * Pola "faktograficzne" aktualizuje scripts/check-bills.ts na podstawie API Sejmu,
 * pola z sekcji "AI" uzupełnia scripts/summarize-bills.ts.
 */
export interface BillFrontmatter {
  id: string;
  term: number;
  print: string;
  prints: string[];
  /** Tytuł ustawy, np. "o zmianie ustawy o podatkach i opłatach lokalnych". */
  title: string;
  projectTitle: string;
  initiator: string | null;
  description: string | null;
  passedDate: string | null;
  toPresidentDate: string;
  deadline: string | null;
  urgent: boolean;
  status: BillStatus;
  statusDate: string;
  timeline: TimelineEvent[];
  voting: Voting | null;
  veto: VetoInfo | null;
  tribunal: TribunalInfo | null;
  publication: PublicationInfo | null;
  links: BillLinks;
  updatedAt: string;

  // --- AI ---
  lead?: string | null;
  impact?: ImpactLevel | null;
  affected?: string[];
  decisionSummary?: string | null;
  ai?: AiMeta | null;
}

/** Nagłówek sekcji Markdown z uzasadnieniem decyzji Prezydenta (strona wyświetla ją w osobnej ramce). */
export const DECISION_SECTION = "Uzasadnienie weta Prezydenta";

/** Pola utrzymywane przez scripts/check-bills.ts (reszta należy do pipeline'u AI). */
export const SEJM_FIELDS = [
  "id",
  "term",
  "print",
  "prints",
  "title",
  "projectTitle",
  "initiator",
  "description",
  "passedDate",
  "toPresidentDate",
  "deadline",
  "urgent",
  "status",
  "statusDate",
  "timeline",
  "voting",
  "veto",
  "tribunal",
  "publication",
  "links",
] as const satisfies readonly (keyof BillFrontmatter)[];

export type SejmFields = Pick<BillFrontmatter, (typeof SEJM_FIELDS)[number]>;

/** Klucz źródeł streszczenia – zmiana oznacza, że streszczenie trzeba wygenerować ponownie. */
export function summarySourceKey(bill: Pick<BillFrontmatter, "links">): string | null {
  if (!bill.links.text) return null;
  return [bill.links.text, bill.links.senate].filter(Boolean).join("|");
}

/** Klucz dokumentu uzasadniającego decyzję Prezydenta (obecnie: wniosek o ponowne rozpatrzenie). */
export function decisionSourceKey(bill: Pick<BillFrontmatter, "veto">): string | null {
  return bill.veto?.url ? `veto:${bill.veto.print}` : null;
}

export interface AiWork {
  summary: boolean;
  decision: boolean;
}

/** Określa, czego brakuje w pliku ustawy i co powinien wygenerować pipeline AI. */
export function pendingAiWork(bill: BillFrontmatter): AiWork {
  const sourceKey = summarySourceKey(bill);
  const decisionKey = decisionSourceKey(bill);
  return {
    summary: !bill.ai || (sourceKey !== null && bill.ai.sourceKey !== sourceKey),
    decision: decisionKey !== null && bill.ai?.decisionKey !== decisionKey,
  };
}
