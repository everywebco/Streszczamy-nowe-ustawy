import Link from "next/link";
import { BillExplorer } from "@/components/BillExplorer";
import type { BillSummary } from "@/components/BillCard";
import { getAllBills } from "@/lib/bills";

export default function HomePage() {
  const bills: BillSummary[] = getAllBills().map((b) => ({
    id: b.id,
    title: b.title,
    passedDate: b.passedDate,
    status: b.status,
    statusDate: b.statusDate,
    toPresidentDate: b.toPresidentDate,
    deadline: b.deadline,
    lead: b.lead ?? null,
    impact: b.impact ?? null,
    affected: b.affected ?? [],
    initiator: b.initiator,
    decisionSummary: b.decisionSummary ?? null,
  }));

  return (
    <>
      <section className="hero">
        <div className="container">
          <p className="eyebrow">Ustawy na biurku Prezydenta RP</p>
          <h1 className="hero__title">Co uchwalił Sejm i co z tym zrobi Prezydent?</h1>
          <p className="hero__lead">
            Proste streszczenia i wyważona ocena ustaw przekazanych Prezydentowi do podpisu. Śledzimy status każdej
            ustawy, a gdy Prezydent zgłosi weto – wyjaśniamy, dlaczego. Dane aktualizujemy raz w tygodniu, w niedzielę,
            na podstawie oficjalnego API Sejmu.
          </p>
          <p className="hero__more">
            <Link href="/o-projekcie/">Jak powstają streszczenia →</Link>
          </p>
        </div>
      </section>
      <section className="container section" aria-labelledby="lista-ustaw">
        <h2 id="lista-ustaw" className="visually-hidden">
          Lista ustaw
        </h2>
        <BillExplorer bills={bills} />
      </section>
    </>
  );
}
