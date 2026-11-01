// Odczyt i zapis plików Markdown z frontmatterem YAML.
// Używane zarówno przez stronę (podczas budowania), jak i przez skrypty pipeline'ów.
import YAML from "yaml";

export interface MarkdownFile<T> {
  data: T;
  body: string;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseMarkdownFile<T>(source: string): MarkdownFile<T> {
  const match = FRONTMATTER.exec(source);
  if (!match) {
    throw new Error("Brak frontmattera YAML (blok --- na początku pliku).");
  }
  // Schemat "core" nie zamienia dat na obiekty Date – daty zostają zwykłymi stringami.
  const data = YAML.parse(match[1], { schema: "core" }) as T;
  return { data, body: match[2].replace(/^\s+/, "") };
}

export function stringifyMarkdownFile<T extends object>(data: T, body: string): string {
  const yaml = YAML.stringify(stripUndefined(data), {
    lineWidth: 0,
    schema: "core",
    defaultStringType: "PLAIN",
    defaultKeyType: "PLAIN",
  });
  const content = body.trim();
  return `---\n${yaml}---\n${content ? `\n${content}\n` : ""}`;
}

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Dzieli treść Markdown na sekcje według nagłówków drugiego poziomu (## ...). */
export function splitSections(body: string): { heading: string | null; content: string }[] {
  const sections: { heading: string | null; content: string }[] = [];
  let current: { heading: string | null; lines: string[] } = { heading: null, lines: [] };
  for (const line of body.split(/\r?\n/)) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      sections.push({ heading: current.heading, content: current.lines.join("\n").trim() });
      current = { heading: heading[1], lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  sections.push({ heading: current.heading, content: current.lines.join("\n").trim() });
  return sections.filter((s) => s.heading !== null || s.content !== "");
}

/** Wstawia lub podmienia sekcję "## heading" w treści Markdown. */
export function upsertSection(body: string, heading: string, content: string): string {
  const sections = splitSections(body);
  const index = sections.findIndex((s) => s.heading === heading);
  if (index >= 0) sections[index] = { heading, content };
  else sections.push({ heading, content });
  return sections
    .map((s) => (s.heading ? `## ${s.heading}\n\n${s.content}` : s.content))
    .join("\n\n")
    .trim();
}
