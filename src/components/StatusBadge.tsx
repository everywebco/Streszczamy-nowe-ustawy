import { STATUS_LABELS, STATUS_SHORT_LABELS, type BillStatus } from "@/lib/bill-types";

export function StatusBadge({ status, short = false }: { status: BillStatus; short?: boolean }) {
  return (
    <span className={`badge badge--${status}`}>
      <span className="badge__dot" aria-hidden="true" />
      {short ? STATUS_SHORT_LABELS[status] : STATUS_LABELS[status]}
    </span>
  );
}
