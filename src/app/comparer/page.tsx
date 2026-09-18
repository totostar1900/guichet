import Link from "next/link";
import { LineIdentity } from "@/components/LineIdentity";
import { Info } from "@/components/Info";
import { BackButton } from "@/components/BackButton";
import { getT } from "@/i18n/server";
import { repo } from "@/lib/data";
import { displayStatus, displayYield, familyLabel, familySegment, offerFamily, SEGMENT_LABEL, statusLabel } from "@/lib/domain/status";
import { fmtPct } from "@/lib/format";
import { LinePicker, type PickLine } from "./LinePicker";
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
  const t = await getT();
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
    s.ledger.forEach(([k, v, note], i) => map.set(i === 0 ? "Rendement" : k, i === 0 ? `${v} · ${t(k).toLowerCase()}${note ? ` · ${t(note)}` : ""}` : note ? `${v} · ${t(note)}` : v));
    return { s, dy: displayYield(o), ref: offerReference(o, now), map };
  });
  const labels = [...new Set(data.flatMap((d) => [...d.map.keys()]))];
  // Every line the picker can narrow down: family, market, issuer, country, the headline figure.
  const lines: PickLine[] = all.map((o) => {
    const fam = offerFamily(o);
    const dy = displayYield(o);
    return { id: o.id, title: o.title, family: familyLabel(fam), segment: familySegment(fam), issuer: o.issuer, country: o.countryName, yieldText: dy.pct == null ? "—" : `${dy.approx ? "≈ " : ""}${fmtPct(dy.pct, 2)}`, status: statusLabel(o, displayStatus(o, now)) };
  });
  const better = (i: number) => data.length === 2 && data[0].dy.pct != null && data[1].dy.pct != null && (data[0].dy.pct > data[1].dy.pct ? 0 : 1) === i;

  return (
    <>
      <div className={styles.head}>
        <BackButton fallbackHref="/" fallbackLabel={t("Retour au Guichet")} />
        <h1>{t("Comparer deux lignes")}</h1>
        <p className="muted">{t("Choisissez deux lignes du Guichet : rendement, échéance, ticket et calcul de référence côte à côte. Rendements bruts, avant frais et fiscalité.")}</p>
      </div>

      <form className={styles.pick} method="get">
        {(["a", "b"] as const).map((k) => (
          <LinePicker key={k} name={k} lines={lines} value={sp[k] ?? ""} label={`${t("Ligne")} ${k.toUpperCase()}`} segments={SEGMENT_LABEL} />
        ))}
        <button className="btn" type="submit">
          {t("Comparer")}
        </button>
      </form>

      {cols.length === 2 && (
        <div className={styles.grid}>
          <div className={styles.corner} />
          {cols.map((o, i) => (
            <div key={o.id} className={`${styles.colHead} ${better(i) ? styles.best : ""}`}>
              <LineIdentity o={o} s={data[i].s} href={`/offres/${o.id}`} size="lg" />
              {better(i) && <span className={styles.tag}>{t("rendement le plus élevé")}</span>}
            </div>
          ))}

          {labels.map((label) => (
            <div key={label} className={styles.row}>
              <div className={styles.label}>
                {t(label)}
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
            <div className={styles.label}>{t("Statut")}</div>
            {data.map((d, i) => (
              <div key={i} className={styles.cell}>
                <span className={`pill ${d.s.statusClass}`}>{t(d.s.status)}</span>
              </div>
            ))}
          </div>

          <div className={styles.row}>
            <div className={styles.label}>{t("Calcul de référence")}</div>
            {data.map((d, i) => (
              <div key={i} className={styles.cell}>
                {d.ref ? (
                  <>
                    <b className={styles.refTitle}>{t(d.ref.title)}</b>
                    <dl className={styles.ref}>
                      {d.ref.rows.map(([k, v]) => (
                        <div key={k}>
                          <dt>{t(k)}</dt>
                          <dd>{t(v)}</dd>
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
            <div className={styles.label}>{t("Agir")}</div>
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
      {cols.length === 1 && <p className="muted">{t("Choisissez une seconde ligne pour comparer.")}</p>}
    </>
  );
}
