"use client";

import { useEffect, useState } from "react";
import { daysUntil, pluralDays } from "@/lib/format";

/** "został 1 dzień", "zostały 3 dni", "zostało 5 dni" */
function remainingLabel(days: number): string {
  if (days === 1) return "został";
  const lastDigit = days % 10;
  const lastTwo = days % 100;
  return lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14) ? "zostały" : "zostało";
}

/**
 * Liczba dni do terminu liczona w przeglądarce – strona jest statyczna,
 * więc wartość wyliczona podczas budowania szybko by się zdezaktualizowała.
 */
export function DaysLeft({ deadline }: { deadline: string }) {
  const [days, setDays] = useState<number | null>(null);
  useEffect(() => setDays(daysUntil(deadline)), [deadline]);
  if (days === null) return null;
  if (days < 0) return <span className="days-left days-left--over">termin minął</span>;
  if (days === 0) return <span className="days-left days-left--soon">termin upływa dziś</span>;
  return (
    <span className={`days-left${days <= 3 ? " days-left--soon" : ""}`}>
      {remainingLabel(days)} {pluralDays(days)}
    </span>
  );
}
