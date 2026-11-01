import type { Voting } from "@/lib/bill-types";

export function VotingBar({ voting }: { voting: Voting }) {
  const total = voting.yes + voting.no + voting.abstain || 1;
  const parts = [
    { key: "yes", label: "za", value: voting.yes },
    { key: "no", label: "przeciw", value: voting.no },
    { key: "abstain", label: "wstrzymało się", value: voting.abstain },
  ];
  return (
    <figure className="voting">
      <div
        className="voting__bar"
        role="img"
        aria-label={`Głosowanie w Sejmie: za ${voting.yes}, przeciw ${voting.no}, wstrzymało się ${voting.abstain}`}
      >
        {parts.map((p) =>
          p.value > 0 ? (
            <span key={p.key} className={`voting__part voting__part--${p.key}`} style={{ flexGrow: p.value / total }} />
          ) : null,
        )}
      </div>
      <figcaption className="voting__legend">
        {parts.map((p) => (
          <span key={p.key} className="voting__legend-item">
            <span className={`voting__swatch voting__part--${p.key}`} aria-hidden="true" />
            <strong>{p.value}</strong> {p.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
