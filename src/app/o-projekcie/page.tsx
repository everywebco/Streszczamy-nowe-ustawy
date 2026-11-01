import type { Metadata } from "next";
import { StatusBadge } from "@/components/StatusBadge";
import { REPO_URL } from "@/lib/format";

export const metadata: Metadata = {
  title: "Jak to działa",
  description: "Skąd pochodzą dane, jak powstają streszczenia i co oznaczają statusy ustaw.",
};

export default function AboutPage() {
  return (
    <article className="container narrow about">
      <p className="eyebrow">Metodologia</p>
      <h1 className="page-title">Jak to działa</h1>
      <p className="bill__lead">
        Serwis automatycznie śledzi ustawy uchwalone przez Sejm i przekazane Prezydentowi RP do podpisu, a następnie
        przygotowuje ich proste streszczenie i ocenę.
      </p>

      <div className="prose">
        <h2>Skąd pochodzą dane</h2>
        <p>
          Codziennie automat (GitHub Actions) odpytuje oficjalne <a href="https://api.sejm.gov.pl">API Sejmu RP</a> o
          procesy legislacyjne zmienione w ostatnich dniach. Gdy ustawa trafia do Prezydenta, zapisujemy ją w
          repozytorium jako plik Markdown – razem z przebiegiem prac, wynikiem głosowania i linkami do dokumentów.
          Przy każdym sprawdzeniu aktualizujemy też status ustaw, które czekają na decyzję.
        </p>

        <h2>Jak powstają streszczenia</h2>
        <p>
          Gdy pojawi się nowa ustawa lub zmieni się jej sytuacja (np. Prezydent zgłosi weto), uruchamia się osobny
          proces, który przekazuje modelowi AI Claude (Anthropic) tekst ustawy uchwalonej przez Sejm, a jeśli trzeba –
          także uchwałę Senatu z poprawkami lub wniosek Prezydenta o ponowne rozpatrzenie ustawy. Model ma za zadanie:
        </p>
        <ul>
          <li>wyjaśnić prostym językiem, co ustawa zmienia i kogo dotyczy,</li>
          <li>wskazać potencjalne korzyści oraz wątpliwości i ryzyka – w sposób wyważony i neutralny politycznie,</li>
          <li>w przypadku weta – wiernie streścić argumenty Prezydenta, bez ich oceniania.</li>
        </ul>
        <p>
          Streszczenia powstają automatycznie i mogą zawierać błędy lub uproszczenia. Przy każdej ustawie podajemy
          źródła – wiążące jest wyłącznie brzmienie ustawy.
        </p>

        <h2>Co oznaczają statusy</h2>
        <dl className="status-list">
          <div>
            <dt>
              <StatusBadge status="oczekuje" />
            </dt>
            <dd>
              Ustawa jest na biurku Prezydenta. Ma on 21 dni na decyzję (7 dni w przypadku ustawy budżetowej, ustawy
              uchwalonej w trybie pilnym lub uchwalonej ponownie po wecie).
            </dd>
          </div>
          <div>
            <dt>
              <StatusBadge status="podpisana" />
            </dt>
            <dd>Prezydent podpisał ustawę. Po publikacji w Dzienniku Ustaw podajemy datę wejścia w życie.</dd>
          </div>
          <div>
            <dt>
              <StatusBadge status="zawetowana" />
            </dt>
            <dd>
              Prezydent odmówił podpisu i przekazał ustawę Sejmowi do ponownego rozpatrzenia. Sejm może odrzucić weto
              większością 3/5 głosów – wtedy ustawa wraca do Prezydenta, który musi ją podpisać w ciągu 7 dni.
            </dd>
          </div>
          <div>
            <dt>
              <StatusBadge status="skierowana-do-tk" />
            </dt>
            <dd>
              Prezydent poprosił Trybunał Konstytucyjny o sprawdzenie zgodności ustawy z Konstytucją. Jeśli Trybunał
              uzna ustawę za zgodną, Prezydent nie może odmówić jej podpisania.
            </dd>
          </div>
        </dl>

        <h2>Otwarte dane i kod</h2>
        <p>
          Wszystkie streszczenia są przechowywane jako pliki Markdown w publicznym repozytorium, a cały kod –
          strona, skrypty i pipeline’y – jest dostępny na <a href={REPO_URL}>GitHubie</a>. Każda zmiana jest
          widoczna w historii repozytorium.
        </p>
      </div>
    </article>
  );
}
