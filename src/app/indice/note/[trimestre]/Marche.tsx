import Link from "next/link";
import { PastilleVariation } from "@/components/PastilleVariation";
import { fmt, fmtDate, fmtPct, money } from "@/lib/format";
import type { MomentDeLaPlace } from "@/lib/market/moment";
import type { QuarterLine } from "@/lib/market/index-quarter";
import { MiniCourbe } from "./Figures";
import styles from "./marche.module.css";

/**
 * L'ÉCRAN DE MARCHÉ DE LA NOTE (7 novembre 2026, planche « Notes de marché », 3B, 4A, 5A).
 * Le niveau en grand et sa pastille, un bandeau de ce qui se passe sur la place aujourd'hui, puis une rangée par société : celle des listes de Guichet (nom, cours, pastille de
 * variation, mini-courbe), qui ouvre la fiche de la ligne. Tous les libellés arrivent déjà traduits : ces composants ne portent aucun mot à eux.
 */

export function NiveauDuMarche({ niveau, variation, periode, aLaDate }: { niveau: number; variation: number; periode: string; aLaDate: string }) {
  return (
    <div className={styles.hero}>
      <span className={styles.niveau}>{fmt(niveau)}</span>
      <PastilleVariation v={Number(variation.toFixed(2))} periode={periode} />
      <small className={styles.aLaDate}>{aLaDate}</small>
    </div>
  );
}

export function BandeauMoment({ moment, l }: { moment: MomentDeLaPlace; l: { titre: string; derniere: string; semaine: string; adjudication: string; ouverte: string; aucune: string; cloture: string; transactions: string } }) {
  const d = moment.derniereSeance;
  const a = moment.prochaineAdjudication;
  return (
    <aside className={styles.moment} aria-label={l.titre}>
      <span className={styles.etq}>{l.titre}</span>
      <div className={styles.cases}>
        <div>
          <small>{l.derniere}</small>
          {d ? (
            <>
              <b>{fmt(d.niveau)}</b> <PastilleVariation v={Number(d.variationPct.toFixed(2))} />
              <small>{fmtDate(d.date)}</small>
            </>
          ) : (
            <b>—</b>
          )}
        </div>
        <div>
          <small>{l.semaine}</small>
          <b>{moment.semaine.montant ? money(moment.semaine.montant) : "—"}</b>
          <small>
            FCFA · {moment.semaine.transactions} {l.transactions}
          </small>
        </div>
        <div>
          <small>{a?.ouverte ? l.ouverte : l.adjudication}</small>
          {a ? (
            <>
              <Link href={`/offres/${a.id}`}>
                <b>{a.titre}</b>
              </Link>
              <small>
                {l.cloture} {fmtDate(a.clotureLe)}
              </small>
            </>
          ) : (
            <b className={styles.neutre}>{l.aucune}</b>
          )}
        </div>
      </div>
    </aside>
  );
}

const sg = (v: number) => `${v > 0 ? "+" : ""}${fmtPct(Number(v.toFixed(2)) === 0 ? 0 : v, 2)}`;

export function LignesSocietes({ lines, l }: { lines: QuarterLine[]; l: { titre: string; poids: string; periode: string } }) {
  return (
    <section className={styles.societes} aria-label={l.titre}>
      <span className={styles.etq}>{l.titre}</span>
      <ul>
        {lines.map((s) => (
          <li key={s.mnemo}>
            <Link href={`/societes/${s.mnemo.toLowerCase()}`} className={styles.rang}>
              <span className={styles.nom}>
                <b>{s.name}</b>
                <small>
                  {s.mnemo} · {l.poids} {fmtPct(s.weight, 1)}
                </small>
              </span>
              <span className={styles.px}>
                <b>{fmt(s.price)}</b>
                <PastilleVariation v={Number(s.move.toFixed(2))} periode={l.periode} />
              </span>
              <MiniCourbe serie={s.serie} sens={s.move} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export { sg };
