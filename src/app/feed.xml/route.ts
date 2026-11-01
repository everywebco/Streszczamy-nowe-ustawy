import { STATUS_LABELS } from "@/lib/bill-types";
import { getAllBills } from "@/lib/bills";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/format";

export const dynamic = "force-static";

const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function GET() {
  const bills = [...getAllBills()]
    .sort((a, b) => (b.updatedAt ?? b.statusDate).localeCompare(a.updatedAt ?? a.statusDate))
    .slice(0, 50);

  const items = bills
    .map((bill) => {
      const url = `${SITE_URL}/ustawy/${bill.id}/`;
      const description = bill.status === "zawetowana" && bill.decisionSummary ? bill.decisionSummary : bill.lead;
      return `    <item>
      <title>${escapeXml(`[${STATUS_LABELS[bill.status]}] Ustawa ${bill.title}`)}</title>
      <link>${url}</link>
      <guid isPermaLink="false">${escapeXml(`${bill.id}:${bill.status}`)}</guid>
      <pubDate>${new Date(bill.updatedAt ?? `${bill.statusDate}T00:00:00Z`).toUTCString()}</pubDate>
      ${description ? `<description>${escapeXml(description)}</description>` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${SITE_URL}/</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>pl</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
