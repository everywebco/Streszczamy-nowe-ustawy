import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DaysLeft } from "@/components/DaysLeft";
import { Markdown } from "@/components/Markdown";
import { StatusBadge } from "@/components/StatusBadge";
import { Timeline } from "@/components/Timeline";
import { VotingBar } from "@/components/VotingBar";
import { DECISION_SECTION } from "@/lib/bill-types";
import { getAllBills, getBill, type Bill } from "@/lib/bills";
import { actDateLabel, capitalize, formatDate } from "@/lib/format";
import { splitSections } from "@/lib/markdown-file";

// Strona jest generowana statycznie dla każdej ustawy z katalogu content/ustawy.
export const dynamicParams = false;

// Placeholder pozwala zbudować eksport statyczny także wtedy, gdy nie ma jeszcze żadnej ustawy.
const PLACEHOLDER_ID = "brak";

export function generateStaticParams() {
  const bills = getAllBills();
  return bills.length > 0 ? bills.map((bill) => ({ id: bill.id })) : [{ id: PLACEHOLDER_ID }];
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const bill = getBill((await params).id);
  if (!bill) return { title: "Nie znaleziono ustawy" };
  const title = `Ustawa ${bill.title}`;
  return {
    title,
    description: bill.lead ?? bill.description ?? undefined,
    openGraph: { title, description: bill.lead ?? undefined, type: "article" },
  };
}

export default async function BillPage({ params }: Props) {
  const bill = getBill((await params).id);
  if (!bill) notFound();

  const sections = splitSections(bill.body);
  const decision = sections.find((s) => s.heading === DECISION_SECTION);
  const summaryBody = sections
    .filter((s) => s.heading !== DECISION_SECTION)
    .map((s) => (s.heading ? `## ${s.heading}\n\n${s.content}` : s.content))
    .join("\n\n");

  return (
    <article className="container bill">
      <nav className="breadcrumbs" aria-label="Ścieżka">
        <Link href="/">← Wszystkie ustawy</Link>
      </nav>

      <header className="bill__header">
        <StatusBadge status={bill.status} />
        <p className="bill__act">{actDateLabel(bill.passedDate)}</p>
        <h1 className="bill__title">{bill.title}</h1>
        {bill.lead && <p className="bill__lead">{bill.lead}</p>}
      </header>

      <div className="bill__layout">
        <div className="bill__main">
          <DecisionPanel bill={bill} decisionMarkdown={decision?.content} />

          {summaryBody ? (
            <section className="panel" aria-label="Streszczenie i ocena">
              <Markdown>{summaryBody}</Markdown>
            </section>
          ) : (
            <section className="panel panel--muted">
              <h2 className="panel__title">Streszczenie w przygotowaniu</h2>
              <p>
                Ustawa została niedawno dodana. Streszczenie i ocenę zmian przygotuje automatycznie model AI na
                podstawie tekstu ustawy – zwykle w ciągu kilku godzin.
              </p>
              {bill.description && (
                <p>
                  <strong>Opis projektu według Sejmu:</strong> {bill.description}
                </p>
              )}
            </section>
          )}

          {bill.ai && (
            <p className="ai-note">
              Streszczenie i ocenę wygenerował automatycznie model <code>{bill.ai.model}</code> (
              {formatDate(bill.ai.generatedAt)}) na podstawie dokumentów sejmowych
              {bill.ai.truncated ? ", przy czym bardzo długi tekst ustawy został skrócony" : ""}. Tekst może zawierać
              błędy lub uproszczenia – wiążące jest wyłącznie brzmienie ustawy.
            </p>
          )}
        </div>

        <aside className="bill__aside">
          <section className="panel">
            <h2 className="panel__title">Najważniejsze informacje</h2>
            <dl className="facts">
              {bill.initiator && (
                <div>
                  <dt>Inicjator</dt>
                  <dd>{bill.initiator}</dd>
                </div>
              )}
              <div>
                <dt>Uchwalona przez Sejm</dt>
                <dd>{formatDate(bill.passedDate)}</dd>
              </div>
              <div>
                <dt>Przekazana Prezydentowi</dt>
                <dd>{formatDate(bill.toPresidentDate)}</dd>
              </div>
              {bill.impact && (
                <div>
                  <dt>Skala zmian (ocena AI)</dt>
                  <dd>{capitalize(bill.impact)}</dd>
                </div>
              )}
              <div>
                <dt>{bill.prints.length > 1 ? "Druki sejmowe" : "Druk sejmowy"}</dt>
                <dd>
                  {bill.prints.map((p) => `nr ${p}`).join(", ")} ({bill.term}. kadencja)
                </dd>
              </div>
            </dl>
            {bill.voting && (
              <>
                <h3 className="panel__subtitle">Głosowanie w Sejmie</h3>
                <VotingBar voting={bill.voting} />
              </>
            )}
          </section>

          <section className="panel">
            <h2 className="panel__title">Przebieg</h2>
            <Timeline events={bill.timeline} />
          </section>

          <section className="panel">
            <h2 className="panel__title">Źródła</h2>
            <ul className="links">
              <li>
                <a href={bill.links.sejm}>Przebieg procesu legislacyjnego (sejm.gov.pl)</a>
              </li>
              {bill.links.text && (
                <li>
                  <a href={bill.links.text}>Tekst ustawy uchwalonej przez Sejm (PDF)</a>
                </li>
              )}
              {bill.links.senate && (
                <li>
                  <a href={bill.links.senate}>Uchwała Senatu z poprawkami (PDF)</a>
                </li>
              )}
              {bill.veto?.url && (
                <li>
                  <a href={bill.veto.url}>Wniosek Prezydenta o ponowne rozpatrzenie – druk nr {bill.veto.print} (PDF)</a>
                </li>
              )}
              {bill.publication && (
                <li>
                  <a href={bill.publication.url}>
                    Tekst opublikowany w Dzienniku Ustaw{bill.publication.displayAddress ? ` (${bill.publication.displayAddress})` : ""}
                  </a>
                </li>
              )}
            </ul>
          </section>
        </aside>
      </div>
    </article>
  );
}

function DecisionPanel({ bill, decisionMarkdown }: { bill: Bill; decisionMarkdown?: string }) {
  switch (bill.status) {
    case "oczekuje":
      return (
        <section className="decision decision--oczekuje">
          <h2 className="decision__title">Ustawa czeka na decyzję Prezydenta</h2>
          {bill.deadline && (
            <p className="decision__deadline">
              Termin: <strong>{formatDate(bill.deadline)}</strong> <DaysLeft deadline={bill.deadline} />
            </p>
          )}
          <p>
            Prezydent może ustawę podpisać, odmówić podpisu i przekazać ją Sejmowi do ponownego rozpatrzenia (weto)
            albo skierować ją do Trybunału Konstytucyjnego.
          </p>
          <p className="decision__note">
            Status sprawdzamy raz w tygodniu (w niedzielę), więc decyzja mogła już zapaść – aktualny stan zawsze
            znajdziesz na stronie procesu w Sejmie.
          </p>
        </section>
      );
    case "podpisana": {
      const pub = bill.publication;
      return (
        <section className="decision decision--podpisana">
          <h2 className="decision__title">Prezydent podpisał ustawę {formatDate(bill.statusDate)}</h2>
          {pub ? (
            <p>
              Opublikowana w Dzienniku Ustaw
              {pub.displayAddress ? <> (<a href={pub.url}>{pub.displayAddress}</a>)</> : null}
              {pub.promulgation ? ` ${formatDate(pub.promulgation)}` : ""}.
              {pub.entryIntoForce ? <> Wchodzi w życie <strong>{formatDate(pub.entryIntoForce)}</strong>.</> : null}
              {pub.comments ? ` ${capitalize(pub.comments)}` : null}
            </p>
          ) : (
            <p>Ustawa czeka na publikację w Dzienniku Ustaw.</p>
          )}
        </section>
      );
    }
    case "zawetowana":
      return (
        <section className="decision decision--zawetowana" aria-labelledby="weto">
          <h2 id="weto" className="decision__title">
            Prezydent zawetował ustawę {formatDate(bill.statusDate)}
          </h2>
          {decisionMarkdown ? (
            <Markdown>{decisionMarkdown}</Markdown>
          ) : (
            <p>
              {bill.veto?.url
                ? "Streszczenie uzasadnienia weta jest w przygotowaniu."
                : "Uzasadnienie weta nie zostało jeszcze opublikowane w systemie Sejmu – uzupełnimy je, gdy tylko się pojawi."}
            </p>
          )}
          {bill.veto?.url && (
            <p className="decision__source">
              Źródło: <a href={bill.veto.url}>wniosek Prezydenta o ponowne rozpatrzenie ustawy (druk nr {bill.veto.print})</a>
            </p>
          )}
          <p className="decision__note">
            Sejm może odrzucić weto większością 3/5 głosów w obecności co najmniej połowy posłów. Wtedy Prezydent musi
            podpisać ustawę w ciągu 7 dni.
          </p>
        </section>
      );
    case "skierowana-do-tk":
      return (
        <section className="decision decision--skierowana-do-tk">
          <h2 className="decision__title">
            Prezydent skierował ustawę do Trybunału Konstytucyjnego
            {bill.tribunal?.date ? ` ${formatDate(bill.tribunal.date)}` : ""}
          </h2>
          {bill.tribunal?.verdict ? (
            <p>
              <strong>Orzeczenie TK:</strong> {bill.tribunal.verdict}
            </p>
          ) : (
            <p>
              Trybunał sprawdzi zgodność ustawy z Konstytucją. Jeśli uzna ją za zgodną, Prezydent nie może odmówić
              podpisu.
            </p>
          )}
        </section>
      );
  }
}
