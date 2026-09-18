import Link from "next/link";
import { LineIdentity } from "@/components/LineIdentity";
import { Info } from "@/components/Info";
import { Select } from "@/components/ui/Select";
import { repo } from "@/lib/data";
import { displayYield } from "@/lib/domain/status";
import { summarize } from "@/lib/domain/summary";
import { offerReference } from "@/lib/domain/sheet";
import type { Offer } from "@/lib/domain/types";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comparer deux lignes" };

/**
 * Two lines side by side, on the figures a client actually weighs: what it
 * returns, when the money comes back, what it costs to get in, what can go
 * wrong. Picks are carried in the URL so a comparison can be shared.
 */
export default async function ComparerPage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const sp = await searchParams;
  const r = repo();
  const all = (await r.listOffers()).filter((o) => !o.hidden);
  const now = new Date();
  const a = sp.a ? all.find((o) => o.id === sp.a) : undefined;
  const b = sp.b ? all.find((o) => o.id === sp.b) : undefined;
  const cols = [a, b].filter((o): o is Offer => Boolean(o));
  const data = cols.map((o) => {
    const s = summarize(o, now);
    const map = new Map<string, string>();
    // The first figure is the return, whatever it is called on that line (taux nominal at par, actuariel, dividende…): one row.
    s.ledger.forEach(([k, v, note], i) => map.set(i === 0 ? "Rendement" : k, i === 0 ? `${v} · ${k.toLowerCase()}${note ? ` · ${note}` : ""}` : note ? `${v} · ${note}` : v));
    return { s, dy: displayYield(o), ref: offerReference(o, now), map };
  });
  const labels = [...new Set(data.flatMap((d) => [...d.map.keys()]))];
  const better = (i: number) => data.length === 2 && data[0].dy.pct != null && data[1].dy.pct != null && (data[0].dy.pct > data[1].dy.pct ? 0 : 1) === i;

  return (
    <>
      <div className={styles.head}>
        <h1>Comparer deux lignes</h1>
        <p className="muted">Choisissez deux lignes du Guichet : rendement, échéance, ticket et calcul de référence côte à côte. Rendements bruts, avant frais et fiscalité.</p>
      </div>

      <form className={styles.pick} method="get">
        {(["a", "b"] as const).map((k) => (
          <label key={k} className="field">
            Ligne {k.toUpperCase()}
            <Select block name={k} value={sp[k] ?? ""} options={[{ value: "", label: "choisir une ligne" }, ...all.map((o) => ({ value: o.id, label: o.title }))]} />
          </label>
        ))}
        <button className="btn" type="submit">
          Comparer
        </button>
      </form>

      {cols.length === 2 && (
        <div className={styles.grid}>
          <div className={styles.corner} />
          {cols.map((o, i) => (
            <div key={o.id} className={`${styles.colHead} ${better(i) ? styles.best : ""}`}>
              <LineIdentity o={o} s={data[i].s} href={`/offres/${o.id}`} size="lg" />
              {better(i) && <span className={styles.tag}>rendement le plus élevé</span>}
            </div>
          ))}

          {labels.map((label) => (
            <div key={label} className={styles.row}>
              <div className={styles.label}>
                {label}
                {label === "Rendement" ? <Info term="rendement_cours" /> : label === "Ticket" ? <Info term="ticket" /> : null}
              </div>
              {data.map((d, i) => (
                <div key={i} className={styles.cell}>
                  {d.map.get(label) ?? "—"}
                </div>
              ))}
            </div>
          ))}

          <div className={styles.row}>
            <div className={styles.label}>Statut</div>
            {data.map((d, i) => (
              <div key={i} className={styles.cell}>
                <span className={`pill ${d.s.statusClass}`}>{d.s.status}</span>
              </div>
            ))}
          </div>

          <div className={styles.row}>
            <div className={styles.label}>Calcul de référence</div>
            {data.map((d, i) => (
              <div key={i} className={styles.cell}>
                {d.ref ? (
                  <>
                    <b className={styles.refTitle}>{d.ref.title}</b>
                    <dl className={styles.ref}>
                      {d.ref.rows.map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </>
                ) : (
                  "—"
                )}
              </div>
            ))}
          </div>

          <div className={styles.row}>
            <div className={styles.label}>Agir</div>
            {cols.map((o, i) => (
              <div key={o.id} className={`${styles.cell} ${styles.actions}`}>
                {data[i].s.primary ? (
                  <Link className="btn sm" href={`/offres/${o.id}`}>
                    Voir la fiche
                  </Link>
                ) : (
                  <Link className="btn sm" href={`/offres/${o.id}`}>
                    Fiche
                  </Link>
                )}
                <a className="btn sm ghost" href={`/offres/${o.id}/fiche`} target="_blank" rel="noreferrer">
                  PDF
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
      {cols.length === 1 && <p className="muted">Choisissez une seconde ligne pour comparer.</p>}
    </>
  );
}
