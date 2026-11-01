"use client";

import { useMemo, useState } from "react";
import { BILL_STATUSES, STATUS_SHORT_LABELS, type BillStatus } from "@/lib/bill-types";
import { BillCard, type BillSummary } from "./BillCard";

type Filter = BillStatus | "wszystkie";

const STAT_LABELS: Record<BillStatus, string> = {
  oczekuje: "czeka na decyzję",
  podpisana: "podpisanych",
  zawetowana: "zawetowanych",
  "skierowana-do-tk": "w Trybunale",
};

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l");

export function BillExplorer({ bills }: { bills: BillSummary[] }) {
  const [filter, setFilter] = useState<Filter>("wszystkie");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const result = Object.fromEntries(BILL_STATUSES.map((s) => [s, 0])) as Record<BillStatus, number>;
    for (const bill of bills) result[bill.status]++;
    return result;
  }, [bills]);

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return bills.filter(
      (bill) =>
        (filter === "wszystkie" || bill.status === filter) &&
        (!q ||
          normalize([bill.title, bill.lead, bill.decisionSummary, ...(bill.affected ?? [])].filter(Boolean).join(" ")).includes(q)),
    );
  }, [bills, filter, query]);

  return (
    <div className="explorer">
      <div className="stats" role="group" aria-label="Filtruj według statusu">
        {BILL_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={`stat stat--${status}`}
            aria-pressed={filter === status}
            onClick={() => setFilter(filter === status ? "wszystkie" : status)}
          >
            <span className="stat__value">{counts[status]}</span>
            <span className="stat__label">{STAT_LABELS[status]}</span>
          </button>
        ))}
      </div>

      <div className="toolbar">
        <div className="chips" role="group" aria-label="Status ustawy">
          {(["wszystkie", ...BILL_STATUSES] as Filter[]).map((value) => (
            <button
              key={value}
              type="button"
              className="filter-chip"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value === "wszystkie" ? "Wszystkie" : STATUS_SHORT_LABELS[value]}
              <span className="filter-chip__count">{value === "wszystkie" ? bills.length : counts[value]}</span>
            </button>
          ))}
        </div>
        <label className="search">
          <span className="visually-hidden">Szukaj ustawy</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M10 4a6 6 0 1 0 3.7 10.7l4.8 4.8 1.4-1.4-4.8-4.8A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"
            />
          </svg>
          <input
            type="search"
            placeholder="Szukaj, np. podatek, emerytury, gminy…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      {visible.length > 0 ? (
        <div className="grid">
          {visible.map((bill) => (
            <BillCard key={bill.id} bill={bill} />
          ))}
        </div>
      ) : (
        <p className="empty">
          {bills.length === 0
            ? "Nie ma jeszcze żadnych ustaw. Pojawią się automatycznie po pierwszym uruchomieniu pipeline'u sprawdzającego dane Sejmu."
            : "Brak ustaw spełniających kryteria wyszukiwania."}
        </p>
      )}
    </div>
  );
}
