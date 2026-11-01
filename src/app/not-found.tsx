import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container narrow not-found">
      <p className="eyebrow">Błąd 404</p>
      <h1 className="page-title">Nie znaleziono strony</h1>
      <p>Ta ustawa lub strona nie istnieje albo została przeniesiona.</p>
      <p>
        <Link href="/">← Wróć do listy ustaw</Link>
      </p>
    </section>
  );
}
