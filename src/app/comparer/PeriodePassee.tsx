import { fmt, fmtDate, fmtPct } from "@/lib/format";
import { COUVERTURE_FIABLE_DEPUIS } from "@/lib/market/adjudications-client";
import type { Periode } from "./periode";
import { Info } from "@/components/Info";
import { Select } from "@/components/ui/Select";
import styles from "./page.module.css";

type T = (k: string, p?: Record<string, string | number>) => string;
const sg = (v: number, d = 2) => `${v > 0 ? "+" : ""}${fmtPct(v, d)}`;
const TRESORS = ["Cameroun", "Congo", "Gabon", "Tchad", "RCA", "Guinée éq."];
const SHORTCUT: Record<string, string> = { m3: "3 mois", m6: "6 mois", a1: "1 an", a2: "2 ans", tout: "Tout" };

/**
 * LE MODE « SUR UNE PÉRIODE PASSÉE » (7 novembre 2026, planche « Comparatif sur une même période »).
 *
 * Une plage, bornée à ce que les deux lignes ont en commun et qui le dit ; ce que chaque ligne a rendu, dans sa nature ; trois stratégies de bons ; la dispersion selon le
 * jour d'entrée. Les chiffres viennent de `preparerPeriode` : cet écran ne calcule rien.
 */
export function PeriodePassee({ periode: p, a, b, tb, tbSource, t }: { periode: Periode; a: string; b: string; tb?: string; tbSource: { kind: "desk"; on: string } | { kind: "client" } | { kind: "aucun" }; t: T }) {
  const href = (extra: Record<string, string>) => {
    const q = new URLSearchParams({ a, b, mode: "passe", t: p.tresor, ...(tb ? { tb } : {}), ...extra });
    return `/comparer?${q.toString()}`;
  };
  const mesures = p.resultats.filter((r) => r.mesure);
  const pct = (m: NonNullable<(typeof mesures)[number]["mesure"]>) => (m.annualise ?? m.cumule);
  const max = Math.max(1, ...mesures.map((r) => Math.abs(pct(r.mesure!))));
  const bornesEntree = p.entree.lignes.flatMap((l) => (l.s ? [l.s.pire, l.s.meilleure] : []));
  const lo = Math.min(0, ...bornesEntree);
  const hi = Math.max(0.0001, ...bornesEntree);
  const pos = (v: number) => `${(((v - lo) / (hi - lo)) * 100).toFixed(1)}%`;

  return (
    <div className="pile">
      <p className={styles.garde} role="note">
        <b>{t("Ce qui s'est passé, pas ce qui va se passer.")}</b> {t("Performances passées non garanties. Rendements bruts, avant frais et fiscalité.")}
      </p>

      {!p.fenetre || !p.commune ? (
        <div className="empty">{t("Ces deux lignes n'ont aucune période mesurable en commun : choisissez des lignes qui se cotent ou s'adjugent sur les mêmes dates.")}</div>
      ) : (
        <section className={styles.fenetre} aria-label={t("Période")}>
          <div className={styles.puces}>
            {p.raccourcis.map((c) => (
              <a key={c.id} className={`${styles.puce} ${c.du === p.fenetre!.du && c.au === p.fenetre!.au ? styles.puceOn : ""}`} href={href({ du: c.du, au: c.au })}>
                {t(SHORTCUT[c.id])}
              </a>
            ))}
          </div>
          <form method="get" action="/comparer" className={styles.dates}>
            <input type="hidden" name="a" value={a} />
            <input type="hidden" name="b" value={b} />
            <input type="hidden" name="mode" value="passe" />
            <label>
              {t("Du")}
              <input type="date" name="du" defaultValue={p.fenetre.du} min={p.commune.debut} max={p.commune.fin} />
            </label>
            <label>
              {t("Au")}
              <input type="date" name="au" defaultValue={p.fenetre.au} min={p.commune.debut} max={p.commune.fin} />
            </label>
            <div>
              <Select name="t" value={p.tresor} label={t("Trésor pour les bons")} cherchable={false} compact block options={TRESORS.map((x) => ({ value: x, label: t(x) }))} />
            </div>
            <div className={styles.champ}>
              <span>
                <label htmlFor="tb">{t("Taux bancaire")}</label> <Info term="taux_bancaire" />
              </span>
              <span className={styles.taux}>
                <input id="tb" name="tb" inputMode="decimal" defaultValue={tb ?? String(p.tauxBancairePct).replace(".", ",")} aria-describedby="tb-aide" /> %
              </span>
            </div>
            <button className="btn" type="submit">{t("Appliquer")}</button>
          </form>
          <p id="tb-aide" className={styles.note}>
            {tbSource.kind === "desk"
              ? t("Argent entre deux placements : valorisé à {p} (référence du Desk, arrêtée le {d}). Vous pouvez y mettre votre taux.", { p: fmtPct(p.tauxBancairePct, 2), d: fmtDate(tbSource.on) })
              : tbSource.kind === "client"
                ? t("Argent entre deux placements : valorisé à {p}, le taux que vous avez saisi.", { p: fmtPct(p.tauxBancairePct, 2) })
                : t("Argent entre deux placements : taux non renseigné, valorisé à zéro. Saisissez le taux de votre banque.")}
          </p>
          <div className={styles.bande} aria-hidden>
            <i style={{ left: `${(daysBetweenIso(p.commune.debut, p.fenetre.du) / Math.max(1, daysBetweenIso(p.commune.debut, p.commune.fin))) * 100}%`, right: `${(daysBetweenIso(p.fenetre.au, p.commune.fin) / Math.max(1, daysBetweenIso(p.commune.debut, p.commune.fin))) * 100}%` }} />
          </div>
          <p className={styles.note}>
            {t("Données communes aux deux lignes : du {a} au {b}.", { a: fmtDate(p.commune.debut), b: fmtDate(p.commune.fin) })} {t("{n} jours.", { n: p.fenetre.jours })}
          </p>
          {p.fenetre.borne && <p className={styles.avert}>{t("La plage demandée dépassait ces données : elle a été ramenée à ce que les deux lignes ont en commun.")}</p>}
          {p.commune.debut < COUVERTURE_FIABLE_DEPUIS && <p className={styles.note}>{t("Avant le {d}, l'état des offres aux adjudications n'est pas lisible : les bons y sont une indication.", { d: fmtDate(COUVERTURE_FIABLE_DEPUIS) })}</p>}
        </section>
      )}

      <section className={styles.resultats} aria-label={t("Ce que chaque ligne a rendu")}>
        <h2 className="display">{t("Ce que chaque ligne a rendu")}</h2>
        {p.resultats.map((r) => (
          <article key={r.id} className={styles.resultat}>
            <h3>{t(r.titre)}</h3>
            <p className={styles.nature}>{t(r.nature)}</p>
            {r.mesure ? (
              <>
                <p className={styles.chiffre}>
                  <b>{sg(r.mesure.cumule)}</b> {t("sur {n} jours", { n: r.mesure.jours })}
                  {r.mesure.annualise != null ? ` · ${sg(r.mesure.annualise)} ${t("par an")}` : ` · ${t("moins de 30 jours : pas de taux annuel")}`}
                </p>
                {r.mesure.placements != null && (
                  <p className={styles.note}>
                    {t("{n} placement(s), {j} jour(s) sans placement valorisés au taux bancaire.", { n: r.mesure.placements, j: r.mesure.joursSansPlacement ?? 0 })}
                  </p>
                )}
                <div className={styles.barre} aria-hidden>
                  <i style={{ width: `${(Math.abs(pct(r.mesure)) / max) * 100}%` }} />
                </div>
              </>
            ) : (
              <>
                {r.actuariel != null && (
                  <p className={styles.chiffre}>
                    <b>{fmtPct(r.actuariel, 2)}</b> {t("par an, à l'échéance")}
                  </p>
                )}
                <p className={styles.hors}>{t("Non mesuré sur la période")} · {t(r.hors ?? "")}</p>
              </>
            )}
          </article>
        ))}
      </section>

      {p.fenetre && (
        <section className={styles.resultats} aria-label={t("Stratégies")}>
          <h2 className="display">{t("Trois stratégies de bons, {t}", { t: t(p.tresor) })}</h2>
          <div className="scroll-x">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("Stratégie")}</th>
                  <th className="r">{t("Sur la période")}</th>
                  <th className="r">{t("Sur 10 000 000 FCFA")}</th>
                </tr>
              </thead>
              <tbody>
                {p.strategies.map((s) => (
                  <tr key={s.id}>
                    <td>{s.uneFois ? t("BTA {n} sem., une fois", { n: s.semaines }) : t("BTA {n} sem. roulé", { n: s.semaines })}</td>
                    <td className="r">{s.mesure ? sg(s.mesure.cumule) : "—"}</td>
                    <td className="r">{s.gain != null ? `${s.gain >= 0 ? "+" : ""}${fmt(s.gain)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.note}>{t("Taux moyen pondéré de chaque séance, réinvesti à la séance suivante. « — » : aucune séance de cette durée assez tôt dans la période.")}</p>
        </section>
      )}

      {bornesEntree.length > 0 && (
        <section className={styles.resultats} aria-label={t("Selon le jour d'entrée")}>
          <h2 className="display">{t("Selon le jour d'entrée")}</h2>
          <p className={styles.note}>{t("Pour une détention de {n} jours, le rendement de chaque jour d'entrée possible dans la période.", { n: p.entree.duree })}</p>
          {p.entree.lignes.map((l) =>
            l.s ? (
              <div key={l.id} className={styles.entree}>
                <b>{t(l.titre)}</b>
                <div className={styles.etendue} aria-hidden>
                  <i style={{ left: pos(l.s.pire), right: `calc(100% - ${pos(l.s.meilleure)})` }} />
                  <em style={{ left: pos(l.s.mediane) }} />
                </div>
                <span>
                  {t("pire")} {sg(l.s.pire)} · {t("médiane")} {sg(l.s.mediane)} · {t("meilleure")} {sg(l.s.meilleure)} · {t("{n} jours d'entrée possibles", { n: l.s.n })}
                </span>
              </div>
            ) : null,
          )}
        </section>
      )}
    </div>
  );
}

const daysBetweenIso = (a: string, b: string): number => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
