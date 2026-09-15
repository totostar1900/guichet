import Link from "next/link";
import { SEGMENT_HINT, SEGMENT_LABEL } from "@/lib/domain/status";

/**
 * The one strip that ties the Guichet and the Fonds page together: the three
 * market segments plus "Tout". Primary and secondary filter the Guichet in
 * place; collective management is its own page, because the fund list is much
 * wider than what the desk distributes.
 */
export function MarketTabs({ active, counts, onSelect }: { active: "all" | "primaire" | "secondaire" | "fonds"; counts: { all: number; primaire: number; secondaire: number; fonds: number }; onSelect?: (k: "all" | "primaire" | "secondaire") => void }) {
  const tab = (key: "all" | "primaire" | "secondaire", label: string, href: string, hint?: string) =>
    onSelect ? (
      <button key={key} type="button" role="tab" aria-selected={active === key} title={hint} onClick={() => onSelect(key)}>
        {label} <b>{counts[key]}</b>
      </button>
    ) : (
      <Link key={key} href={href} role="tab" aria-selected={active === key} title={hint}>
        {label} <b>{counts[key]}</b>
      </Link>
    );
  return (
    <div className="mtabs" role="tablist" aria-label="Marché">
      {tab("all", "Tout", "/")}
      {tab("primaire", SEGMENT_LABEL.primaire, "/?marche=primaire", SEGMENT_HINT.primaire)}
      {tab("secondaire", SEGMENT_LABEL.secondaire, "/?marche=secondaire", SEGMENT_HINT.secondaire)}
      <Link href="/fonds" role="tab" aria-selected={active === "fonds"} title={SEGMENT_HINT.fonds}>
        {SEGMENT_LABEL.fonds} <b>{counts.fonds}</b>
      </Link>
    </div>
  );
}
