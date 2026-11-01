import Link from "next/link";
import type { BillFrontmatter } from "@/lib/bill-types";
import { actDateLabel, capitalize, formatShortDate } from "@/lib/format";
import { DaysLeft } from "./DaysLeft";
import { StatusBadge } from "./StatusBadge";

export type BillSummary = Pick<
  BillFrontmatter,
  | "id"
  | "title"
  | "passedDate"
  | "status"
  | "statusDate"
  | "toPresidentDate"
  | "deadline"
  | "lead"
  | "impact"
  | "affected"
  | "initiator"
  | "decisionSummary"
>;

const DECISION_VERB: Record<string, string> = {
  podpisana: "Podpisana",
  zawetowana: "Weto",
  "skierowana-do-tk": "Skierowana do TK",
};

export function BillCard({ bill }: { bill: BillSummary }) {
  const lead = bill.status === "zawetowana" && bill.decisionSummary ? bill.decisionSummary : bill.lead;
  return (
    <article className={`card card--${bill.status}`}>
      <div className="card__top">
        <StatusBadge status={bill.status} short />
        {bill.impact && <span className="chip">Skala zmian: {bill.impact}</span>}
      </div>
      <h3 className="card__title">
        <Link href={`/ustawy/${bill.id}/`} className="card__link">
          <span className="card__act">{actDateLabel(bill.passedDate)}</span>
          {bill.title}
        </Link>
      </h3>
      {lead ? (
        <p className="card__lead">
          {bill.status === "zawetowana" && bill.decisionSummary && <strong>Powód weta: </strong>}
          {lead}
        </p>
      ) : (
        <p className="card__lead card__lead--pending">Streszczenie w przygotowaniu.</p>
      )}
      {bill.affected && bill.affected.length > 0 && (
        <ul className="tags" aria-label="Kogo dotyczy">
          {bill.affected.slice(0, 4).map((group) => (
            <li key={group} className="tag">
              {capitalize(group)}
            </li>
          ))}
        </ul>
      )}
      <dl className="card__meta">
        <div>
          <dt>Przekazana</dt>
          <dd>{formatShortDate(bill.toPresidentDate)}</dd>
        </div>
        {bill.status === "oczekuje" && bill.deadline ? (
          <div>
            <dt>Termin decyzji</dt>
            <dd>
              {formatShortDate(bill.deadline)} <DaysLeft deadline={bill.deadline} />
            </dd>
          </div>
        ) : (
          <div>
            <dt>{DECISION_VERB[bill.status] ?? "Decyzja"}</dt>
            <dd>{formatShortDate(bill.statusDate)}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}
