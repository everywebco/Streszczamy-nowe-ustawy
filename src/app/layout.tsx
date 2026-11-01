import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { BASE_PATH, REPO_URL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/format";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: { siteName: SITE_NAME, locale: "pl_PL", type: "website" },
  alternates: { types: { "application/rss+xml": `${SITE_URL}/feed.xml` } },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#14161a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        <a href="#tresc" className="skip-link">
          Przejdź do treści
        </a>
        <header className="site-header">
          <div className="container site-header__inner">
            <Link href="/" className="brand">
              <span className="brand__mark" aria-hidden="true">
                §
              </span>
              <span className="brand__name">
                Streszczamy <span>nowe ustawy</span>
              </span>
            </Link>
            <nav className="nav" aria-label="Główna nawigacja">
              <Link href="/">Ustawy</Link>
              <Link href="/o-projekcie/">Jak to działa</Link>
              <a href={`${BASE_PATH}/feed.xml`}>RSS</a>
            </nav>
          </div>
        </header>
        <main id="tresc">{children}</main>
        <footer className="site-footer">
          <div className="container site-footer__inner">
            <p>
              Dane: <a href="https://api.sejm.gov.pl">API Sejmu RP</a> i <a href="https://eli.gov.pl">ELI</a>.
              Streszczenia i oceny generuje automatycznie model AI – mogą zawierać błędy, dlatego zawsze podajemy
              źródła.
            </p>
            <p>
              <a href={REPO_URL}>Kod źródłowy na GitHubie</a> · <Link href="/o-projekcie/">Metodologia</Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
