// Klient API Sejmu RP (https://api.sejm.gov.pl) oraz logika wyznaczania statusu ustawy.
import type {
  BillStatus,
  PublicationInfo,
  SejmFields,
  TimelineEvent,
  TribunalInfo,
  VetoInfo,
  Voting,
} from "../../src/lib/bill-types.ts";

const API_URL = (process.env.SEJM_API_URL ?? "https://api.sejm.gov.pl").replace(/\/$/, "");
const USER_AGENT = "streszczamy-nowe-ustawy (+https://github.com/everywebco/Streszczamy-nowe-ustawy)";

// --- typy odpowiedzi API (tylko używane pola) ---

export interface ProcessHeader {
  number: string;
  term: number;
  title: string;
  documentTypeEnum?: string;
  passed?: boolean;
  changeDate?: string;
}

export interface ProcessStage {
  stageName?: string;
  stageType?: string;
  date?: string | null;
  children?: ProcessStage[];
  decision?: string;
  comment?: string;
  position?: string;
  printNumber?: string;
  textAfter3?: string;
  omittedInconsistent?: boolean;
  verdict?: string;
  voting?: {
    yes: number;
    no: number;
    abstain: number;
    notParticipating: number;
    description?: string;
    topic?: string;
  };
}

export interface ProcessDetails extends ProcessHeader {
  titleFinal?: string;
  description?: string;
  urgencyStatus?: "NORMAL" | "URGENT" | "URGENT_WITHDRAWN";
  printsConsideredJointly?: string[];
  ELI?: string;
  eli?: string;
  displayAddress?: string;
  stages?: ProcessStage[];
}

export interface PrintDetails {
  number: string;
  title: string;
  attachments?: string[];
  deliveryDate?: string;
}

export interface EliAct {
  ELI: string;
  displayAddress?: string;
  title?: string;
  promulgation?: string;
  entryIntoForce?: string;
  comments?: string;
}

// --- HTTP ---

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path: string, accept: string): Promise<Response | null> {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: accept, "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(60_000),
      });
      if (res.status === 404) return null;
      if (res.ok) return res;
      if (res.status < 500 && res.status !== 429) {
        throw new Error(`HTTP ${res.status} dla ${url}`);
      }
      lastError = new Error(`HTTP ${res.status} dla ${url}`);
    } catch (error) {
      lastError = error;
      if (error instanceof Error && error.message.startsWith("HTTP 4")) throw error;
    }
    await sleep(2 ** attempt * 1000);
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function fetchJson<T>(path: string): Promise<T | null> {
  const res = await request(path, "application/json");
  return res ? ((await res.json()) as T) : null;
}

export async function fetchBinary(url: string): Promise<Uint8Array | null> {
  const res = await request(url, "*/*");
  return res ? new Uint8Array(await res.arrayBuffer()) : null;
}

// --- endpointy ---

export async function getCurrentTerm(): Promise<number> {
  const fromEnv = Number(process.env.SEJM_TERM);
  if (Number.isInteger(fromEnv) && fromEnv > 0) return fromEnv;
  const terms = await fetchJson<{ num: number; current?: boolean }[]>("/sejm/term");
  const current = terms?.find((t) => t.current) ?? terms?.at(-1);
  if (!current) throw new Error("Nie udało się ustalić bieżącej kadencji Sejmu.");
  return current.num;
}

/** Procesy legislacyjne zmienione od wskazanej daty (z paginacją). */
export async function listModifiedProcesses(term: number, since: Date): Promise<ProcessHeader[]> {
  const modifiedSince = since.toISOString().slice(0, 19);
  const limit = 100;
  const all: ProcessHeader[] = [];
  for (let offset = 0; ; offset += limit) {
    const page = await fetchJson<ProcessHeader[]>(
      `/sejm/term${term}/processes?modifiedSince=${modifiedSince}&limit=${limit}&offset=${offset}`,
    );
    if (!page || page.length === 0) break;
    all.push(...page);
    if (page.length < limit) break;
  }
  return all;
}

export const getProcess = (term: number, num: string) =>
  fetchJson<ProcessDetails>(`/sejm/term${term}/processes/${encodeURIComponent(num)}`);

export const getPrint = (term: number, num: string) =>
  fetchJson<PrintDetails>(`/sejm/term${term}/prints/${encodeURIComponent(num)}`);

export const getEliAct = (eli: string) => fetchJson<EliAct>(`/eli/acts/${eli}`);

export function printAttachmentUrl(term: number, print: string, file: string): string {
  return `${API_URL}/sejm/term${term}/prints/${encodeURIComponent(print)}/${encodeURIComponent(file)}`;
}

/** URL pierwszego załącznika PDF druku (np. wniosku Prezydenta lub uchwały Senatu). */
export async function printPdfUrl(term: number, print: string): Promise<string | null> {
  const details = await getPrint(term, print);
  const pdf = details?.attachments?.find((a) => a.toLowerCase().endsWith(".pdf"));
  return pdf ? printAttachmentUrl(term, print, pdf) : null;
}

// --- wyznaczanie statusu ---

export function flattenStages(stages: ProcessStage[] = []): ProcessStage[] {
  return stages.flatMap((s) => [s, ...flattenStages(s.children)]);
}

export function hasToPresidentStage(process: ProcessDetails): boolean {
  return (process.stages ?? []).some((s) => s.stageType === "ToPresident");
}

/** Numery wszystkich druków rozpatrywanych wspólnie (łącznie z głównym). */
export function jointPrints(process: ProcessDetails): string[] {
  const prints = new Set([process.number, ...(process.printsConsideredJointly ?? [])]);
  return [...prints].sort((a, b) => parseInt(a, 10) - parseInt(b, 10) || a.localeCompare(b));
}

export function billId(term: number, print: string): string {
  return `${term}-${print}`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function detectInitiator(projectTitle: string): string | null {
  const t = projectTitle.toLowerCase();
  if (t.startsWith("rządowy")) return "Rada Ministrów";
  if (t.startsWith("poselski")) return "Posłowie";
  if (t.startsWith("senacki")) return "Senat";
  if (t.startsWith("obywatelski")) return "Obywatele";
  if (t.startsWith("komisyjny")) return "Komisja sejmowa";
  if (t.includes("przez prezydenta")) return "Prezydent RP";
  return null;
}

function isBudgetAct(process: ProcessDetails): boolean {
  const title = `${process.title} ${process.titleFinal ?? ""}`.toLowerCase();
  return /ustaw[ay] budżetow|prowizorium budżetow/.test(title);
}

function finalVoting(stage: ProcessStage | undefined): Voting | null {
  const votings = flattenStages(stage?.children).filter((s) => s.voting);
  const whole =
    votings.find((s) => /całoś/i.test(`${s.voting?.description} ${s.voting?.topic}`)) ?? votings.at(-1);
  if (!whole?.voting) return null;
  const { yes, no, abstain, notParticipating } = whole.voting;
  return { yes, no, abstain, notParticipating };
}

export interface BuildOptions {
  /** Pobiera URL PDF druku (np. weta, uchwały Senatu) – wstrzykiwane, by ułatwić testy. */
  resolvePrintPdf?: (term: number, print: string) => Promise<string | null>;
  resolveEli?: (eli: string) => Promise<EliAct | null>;
}

/**
 * Buduje pola faktograficzne ustawy na podstawie szczegółów procesu legislacyjnego.
 * Zwraca null, jeśli ustawa nie została (jeszcze) przekazana Prezydentowi.
 */
export async function buildBillFromProcess(
  process: ProcessDetails,
  options: BuildOptions = {},
): Promise<SejmFields | null> {
  const resolvePrintPdf = options.resolvePrintPdf ?? printPdfUrl;
  const resolveEli = options.resolveEli ?? getEliAct;
  const stages = process.stages ?? [];
  if (!hasToPresidentStage(process)) return null;

  const term = process.term;
  const timeline: TimelineEvent[] = [];
  let status: BillStatus = "oczekuje";
  let statusDate = "";
  let toPresidentDate = "";
  let deadline: string | null = null;
  let passedDate: string | null = null;
  let voting: Voting | null = null;
  let veto: VetoInfo | null = null;
  let tribunal: TribunalInfo | null = null;
  let textUrl: string | null = null;
  let senatePrint: string | null = null;
  let senateAmendmentsAccepted = false;
  let vetoed = false;
  const urgent = process.urgencyStatus === "URGENT";

  for (const stage of stages) {
    const date = stage.date ?? null;
    switch (stage.stageType) {
      case "SejmReading": {
        if (stage.textAfter3) textUrl = stage.textAfter3;
        if (/uchwalono/i.test(stage.decision ?? "")) {
          passedDate = date;
          voting = finalVoting(stage) ?? voting;
          const v = voting;
          timeline.push({
            date,
            label: "Sejm uchwalił ustawę",
            details: v ? `Głosowanie: za ${v.yes}, przeciw ${v.no}, wstrzymało się ${v.abstain}` : undefined,
          });
        }
        break;
      }
      case "SenatePosition": {
        if (stage.printNumber) senatePrint = stage.printNumber;
        timeline.push({ date, label: "Stanowisko Senatu", details: stage.position });
        break;
      }
      case "SenatePositionConsideration": {
        if (/przyjęto/i.test(stage.decision ?? "")) senateAmendmentsAccepted = true;
        timeline.push({ date, label: "Sejm rozpatrzył stanowisko Senatu", details: stage.decision });
        break;
      }
      case "ToPresident": {
        const days = vetoed || urgent || isBudgetAct(process) ? 7 : 21;
        toPresidentDate = date ?? toPresidentDate;
        deadline = date ? addDays(date, days) : null;
        status = "oczekuje";
        statusDate = toPresidentDate;
        timeline.push({
          date,
          label: vetoed
            ? "Ustawa ponownie przekazana Prezydentowi do podpisu"
            : "Ustawa przekazana Prezydentowi do podpisu",
          details: `Termin na decyzję: ${days} dni`,
          status: "oczekuje",
        });
        break;
      }
      case "Veto": {
        vetoed = true;
        status = "zawetowana";
        statusDate = date ?? statusDate;
        const print = stage.printNumber ?? null;
        veto = {
          date: date ?? "",
          print,
          url: print ? await resolvePrintPdf(term, print) : null,
        };
        timeline.push({
          date,
          label: "Prezydent zawetował ustawę",
          details: print ? `Wniosek o ponowne rozpatrzenie ustawy – druk nr ${print}` : undefined,
          status: "zawetowana",
        });
        break;
      }
      case "PresidentMotionConsideration": {
        timeline.push({
          date,
          label: "Sejm rozpatrzył wniosek Prezydenta",
          details: [stage.decision, stage.comment].filter(Boolean).join(" – ") || undefined,
        });
        break;
      }
      case "PresidentToTribunal": {
        status = "skierowana-do-tk";
        statusDate = date ?? statusDate;
        tribunal = { date, verdict: null };
        timeline.push({
          date,
          label: "Prezydent skierował ustawę do Trybunału Konstytucyjnego",
          status: "skierowana-do-tk",
        });
        break;
      }
      case "ConstitutionalTribunalRuling": {
        tribunal = { date: (tribunal as TribunalInfo | null)?.date ?? null, verdict: stage.verdict ?? null };
        timeline.push({ date, label: "Orzeczenie Trybunału Konstytucyjnego", details: stage.verdict });
        break;
      }
      case "PresidentSignature": {
        status = "podpisana";
        statusDate = date ?? statusDate;
        timeline.push({
          date,
          label: "Prezydent podpisał ustawę",
          details: stage.omittedInconsistent
            ? "Z pominięciem przepisów uznanych przez TK za niezgodne z Konstytucją"
            : undefined,
          status: "podpisana",
        });
        break;
      }
      case "End": {
        if (stage.comment) timeline.push({ date, label: "Zakończenie procesu", details: stage.comment });
        break;
      }
    }
  }

  let publication: PublicationInfo | null = null;
  const eli = process.ELI ?? process.eli;
  if (eli) {
    const act = await resolveEli(eli);
    publication = {
      eli,
      displayAddress: act?.displayAddress ?? process.displayAddress ?? null,
      url: `https://eli.gov.pl/eli/${eli}/ogl`,
      promulgation: act?.promulgation ?? null,
      entryIntoForce: act?.entryIntoForce ?? null,
      comments: act?.comments ?? null,
    };
    timeline.push({
      date: publication.promulgation,
      label: "Ustawa opublikowana w Dzienniku Ustaw",
      details: publication.displayAddress ?? undefined,
    });
  }

  const prints = jointPrints(process);
  const senateUrl =
    senatePrint && senateAmendmentsAccepted ? await resolvePrintPdf(term, senatePrint) : null;

  return {
    id: billId(term, prints[0]),
    term,
    print: prints[0],
    prints,
    title: (process.titleFinal ?? process.title).trim(),
    projectTitle: process.title.trim(),
    initiator: detectInitiator(process.title),
    description: process.description?.trim() || null,
    passedDate,
    toPresidentDate,
    deadline: status === "oczekuje" ? deadline : null,
    urgent,
    status,
    statusDate,
    timeline,
    voting,
    veto,
    tribunal,
    publication,
    links: {
      sejm: `https://www.sejm.gov.pl/Sejm${term}.nsf/PrzebiegProc.xsp?nr=${encodeURIComponent(prints[0])}`,
      text: textUrl,
      senate: senateUrl,
    },
  };
}
