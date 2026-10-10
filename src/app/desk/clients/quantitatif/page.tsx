import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { repo } from "@/lib/data";
import { requireDesk } from "@/lib/auth";
import { fmt, fmtDate, fmtMillions } from "@/lib/format";
import { INTENT_STATE_LABEL } from "@/lib/domain/intent";
import {
  DUREES,
  estDuree,
  estGranularite,
  granularitesPossibles,
  granulariteParDefaut,
  plageDeLaDuree,
  type Barre,
  type DureeId,
  type Granularite,
} from "@/lib/domain/quantitatif";
import { chargerQuantitatif, ouvertureDuCompte } from "@/lib/desk/quantitatif-data";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ce qu'il a traité" };

const NOM: Record<Granularite, string> = { mois: "Mensuel", trimestre: "Trimestriel", annee: "Annuel" };

/** La hauteur d'une barre, en pourcentage de la plus haute de son graphique. */
const hauteur = (v: number, max: number) => (max > 0 ? `${Math.max(v > 0 ? 2 : 0, Math.round((v / max) * 100))}%` : "0");

/** Quatre repères d'axe, du maximum à zéro, arrondis à l'unité qui se lit. */
const axe = (max: number) => [max, max * (2 / 3), max / 3, 0].map((v) => (v === 0 ? "0" : fmtMillions(v)));

export default async function QuantitatifPage({
  searchParams,
}: {
  searchParams: Promise<{ file?: string; duree?: string; g?: string; from?: string; to?: string }>;
}) {
  await requireDesk("/desk/clients");
  const t = await getT();
  const sp = await searchParams;
  const r = repo();

  const files = await r.listClientFiles();
  const dossier = files.find((f) => f.id === sp.file);
  if (!dossier) {
    return (
      <>
        <DeskNav current="/desk/clients" />
        <div className="panel">
          <p className={styles.vide}>{t("Aucun dossier choisi.")} <Link href="/desk/clients">{t("Ouvrir les dossiers")}</Link></p>
        </div>
      </>
    );
  }

  /* L'OUVERTURE EST LE PREMIER GESTE, PAS LA DATE DU DOSSIER. Un dossier peut
     être créé par le desk avant que le client n'ait rien fait ; faire partir
     la fenêtre de là donnerait des mois vides en tête de graphique. */
  const { ouverture, aujourdHui } = await ouvertureDuCompte(dossier.userId, dossier.createdAt);

  const duree: DureeId = estDuree(sp.duree) ? sp.duree : "tout";
  const dates = /^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? "") && /^\d{4}-\d{2}-\d{2}$/.test(sp.to ?? "");
  const { plage: plageDuree, rabotee } = plageDeLaDuree(duree, ouverture, aujourdHui);
  const plage = dates ? { from: sp.from!, to: sp.to! } : plageDuree;

  const possibles = granularitesPossibles(plage);
  const granularite: Granularite = estGranularite(sp.g) && possibles.includes(sp.g) ? sp.g : granulariteParDefaut(plage);
  const q = await chargerQuantitatif(dossier.userId, plage, granularite);

  const lien = (p: Record<string, string>) => {
    const u = new URLSearchParams({ file: dossier.id, ...(dates ? { from: plage.from, to: plage.to } : { duree }), g: granularite, ...p });
    return `/desk/clients/quantitatif?${u.toString()}`;
  };

  const maxVolume = Math.max(...q.barres.map((b) => Math.max(b.achats, b.cessions)), 1);
  const maxEntree = Math.max(...q.barres.map((b) => b.entrees), 1);
  const maxSortie = Math.max(...q.barres.map((b) => b.sorties), 1);
  const maxCom = Math.max(...q.barres.map((b) => b.commissions), 1);
  const vide = q.barres.every((b) => b.achats + b.cessions + b.entrees + b.sorties === 0);

  const libelles = (
    <div className={styles.libelles}>
      {q.barres.map((b) => (
        <span key={b.clef}>{b.libelle}</span>
      ))}
    </div>
  );

  return (
    <>
      <DeskNav current="/desk/clients" />

      <div className="panel">
        <div className="panel-h">
          <div>
            <div className="eyebrow">{t("Ce qu'il a traité avec nous")}</div>
            <h1 className="display" style={{ margin: 0 }}>{dossier.identity.name || t("(sans nom)")}</h1>
          </div>
          <span className="right" />
          <Link className="btn sm" href={`/desk/clients?file=${dossier.id}`}>
            {t("Retour au dossier")}
          </Link>
        </div>

        <div className={styles.compteurs}>
          <div className={styles.compteur}>
            <span className="eyebrow">{t("Traité sur la plage")}</span>
            <b>{fmt(q.totaux.traite)}</b>
            <small className="muted">{t("{n} opération(s) réglée(s)", { n: String(q.totaux.operations) })}</small>
          </div>
          <div className={styles.compteur}>
            <span className="eyebrow">{t("Entrées d'espèces")}</span>
            <b>{fmt(q.totaux.entrees)}</b>
            <small className="muted">{t("sorties : {m}", { m: fmt(q.totaux.sorties) })}</small>
          </div>
          <div className={styles.compteur}>
            <span className="eyebrow">{t("Commissions perçues")}</span>
            <b>{fmt(q.totaux.commissions)}</b>
            <small className="muted">
              {q.totaux.traite > 0
                ? t("{p} % du volume", { p: ((q.totaux.commissions / q.totaux.traite) * 100).toFixed(2).replace(".", ",") })
                : t("rien n'a encore été traité")}
            </small>
          </div>
          <div className={styles.compteur}>
            <span className="eyebrow">{t("Ticket médian")}</span>
            <b>{q.totaux.operations ? fmt(q.totaux.ticketMedian) : "—"}</b>
            <small className="muted">{t("sur les opérations réglées")}</small>
          </div>
          <div className={styles.compteur}>
            <span className="eyebrow">{t("Servi, jamais réglé")}</span>
            <b className={q.totaux.enDefaut ? "crit-ink" : undefined}>{q.totaux.enDefaut ? fmt(q.totaux.enDefaut) : "—"}</b>
            <small className="muted">{q.totaux.refsEnDefaut.join(" · ") || t("rien en souffrance")}</small>
          </div>
        </div>

        <div className={styles.commandes}>
          <div className={styles.groupe} role="group" aria-label={t("Durée d'observation")}>
            <span className="eyebrow">{t("Durée")}</span>
            <Link className={`btn sm ${!dates && duree === "tout" ? "primary" : ""}`} href={`/desk/clients/quantitatif?file=${dossier.id}&duree=tout`}>
              {t("Depuis l'ouverture")}
            </Link>
            {DUREES.map((d) => (
              <Link key={d.id} className={`btn sm ${!dates && duree === d.id ? "primary" : ""}`} href={`/desk/clients/quantitatif?file=${dossier.id}&duree=${d.id}`}>
                {t(d.nom)}
              </Link>
            ))}
          </div>

          <form method="get" className={styles.groupe}>
            <input type="hidden" name="file" value={dossier.id} />
            <input type="hidden" name="g" value={granularite} />
            <label className="field">
              {t("Du")}
              <input type="date" name="from" defaultValue={plage.from} max={aujourdHui} />
            </label>
            <label className="field">
              {t("Au")}
              <input type="date" name="to" defaultValue={plage.to} max={aujourdHui} />
            </label>
            <button className="btn sm" type="submit">
              {t("Appliquer")}
            </button>
          </form>

          <div className={styles.groupe} role="group" aria-label={t("Découpage")}>
            <span className="eyebrow">{t("Découpage")}</span>
            {(["mois", "trimestre", "annee"] as const).map((g) =>
              possibles.includes(g) ? (
                <Link key={g} className={`btn sm ${g === granularite ? "primary" : ""}`} href={lien({ g })}>
                  {t(NOM[g])}
                </Link>
              ) : (
                <button key={g} className="btn sm" type="button" disabled title={t("La plage ne contient pas une tranche entière de cette taille.")}>
                  {t(NOM[g])}
                </button>
              ),
            )}
          </div>
        </div>

        <p className="muted" style={{ fontSize: ".82rem", marginTop: 0 }}>
          {t("Du {a} au {b}, en {n} tranche(s).", { a: fmtDate(plage.from), b: fmtDate(plage.to), n: String(q.barres.length) })}
          {rabotee ? ` ${t("La durée demandée dépasse l'histoire du compte : la plage part de son premier geste, le {d}.", { d: fmtDate(ouverture) })}` : ""}
        </p>
      </div>

      {vide ? (
        <div className="panel">
          <p className={styles.vide}>{t("Rien n'a été traité sur cette plage. Élargissez la durée, ou regardez la chronologie plus bas.")}</p>
        </div>
      ) : (
        <>
          <div className="panel">
            <div className="panel-h">
              <h2>{t("Volume traité")}</h2>
              <span className="muted" style={{ fontSize: ".8rem" }}>
                {t("compté au jour du règlement")}
              </span>
            </div>
            <div className={styles.tracé}>
              <div className={styles.aire}>
                <div className={styles.barres}>
                  {q.barres.map((b: Barre) => (
                    <div key={b.clef} className={styles.tranche} title={`${b.libelle} · ${fmt(b.achats)} / ${fmt(b.cessions)}`}>
                      <span style={{ height: hauteur(b.achats, maxVolume), background: "var(--navy-2)" }} aria-hidden="true" />
                      <span style={{ height: hauteur(b.cessions, maxVolume), background: "var(--cat-M)" }} aria-hidden="true" />
                    </div>
                  ))}
                </div>
                {libelles}
              </div>
              <div className={`${styles.axe} ${styles.axeHaut}`}>
                {axe(maxVolume).map((v, i) => (
                  <span key={i}>{v}</span>
                ))}
              </div>
            </div>
            <div className={styles.legende}>
              <div>
                <span className={styles.pastille} style={{ background: "var(--navy-2)" }} aria-hidden="true" />
                {t("Achats et souscriptions")}
                <div className="muted" style={{ fontSize: ".82rem" }}>{fmt(q.totaux.achats)}</div>
              </div>
              <div>
                <span className={styles.pastille} style={{ background: "var(--cat-M)" }} aria-hidden="true" />
                {t("Ventes et rachats")}
                <div className="muted" style={{ fontSize: ".82rem" }}>{fmt(q.totaux.cessions)}</div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-h">
              <h2>{t("Mouvements d'espèces")}</h2>
              <span className="muted" style={{ fontSize: ".8rem" }}>
                {t("à la date de valeur")}
              </span>
            </div>
            <div className={styles.tracé}>
              <div className={styles.aire}>
                <div className={styles.deuxSens}>
                  {q.barres.map((b) => (
                    <div key={b.clef} className={styles.colonne} title={`${b.libelle} · +${fmt(b.entrees)} / -${fmt(b.sorties)}`}>
                      <div className={styles.haut}>
                        <span style={{ width: "1.25rem", height: hauteur(b.entrees, maxEntree), background: "var(--navy-2)" }} aria-hidden="true" />
                      </div>
                      <div className={styles.zero} />
                      <div className={styles.bas}>
                        <span style={{ width: "1.25rem", height: hauteur(b.sorties, maxSortie), background: "var(--cat-A)" }} aria-hidden="true" />
                      </div>
                    </div>
                  ))}
                </div>
                {libelles}
              </div>
              <div className={`${styles.axe} ${styles.axeSens}`}>
                <span>{fmtMillions(maxEntree)}</span>
                <span>0</span>
                <span>-{fmtMillions(maxSortie)}</span>
              </div>
            </div>
            <div className={styles.legende}>
              <div>
                <span className={styles.pastille} style={{ background: "var(--navy-2)" }} aria-hidden="true" />
                {t("Entrées")}
                <div className="muted" style={{ fontSize: ".82rem" }}>{fmt(q.totaux.entrees)}</div>
              </div>
              <div>
                <span className={styles.pastille} style={{ background: "var(--cat-A)" }} aria-hidden="true" />
                {t("Sorties")}
                <div className="muted" style={{ fontSize: ".82rem" }}>{fmt(q.totaux.sorties)}</div>
              </div>
              {q.totaux.enDefaut > 0 && (
                <div>
                  <span className="crit-ink">{t("Dont jamais réglé")}</span>
                  <div className="muted" style={{ fontSize: ".82rem" }}>
                    {fmt(q.totaux.enDefaut)} · {q.totaux.refsEnDefaut.join(" · ")}
                  </div>
                </div>
              )}
            </div>
          </div>

          {q.totaux.commissions > 0 && (
            <div className="panel">
              <div className="panel-h">
                <h2>{t("Ce que la maison a perçu")}</h2>
                <span className="muted" style={{ fontSize: ".8rem" }}>
                  {t("courtage et droits de garde, tels qu'ils ont été débités")}
                </span>
              </div>
              <div className={styles.tracé}>
                <div className={styles.aire}>
                  <div className={styles.barres}>
                    {q.barres.map((b) => (
                      <div key={b.clef} className={styles.tranche} title={`${b.libelle} · ${fmt(b.commissions)}`}>
                        <span style={{ height: hauteur(b.commissions, maxCom), background: "var(--gold)" }} aria-hidden="true" />
                      </div>
                    ))}
                  </div>
                  {libelles}
                </div>
                <div className={`${styles.axe} ${styles.axeHaut}`}>
                  {axe(maxCom).map((v, i) => (
                    <span key={i}>{v}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="panel">
        <div className="panel-h">
          <h2>{t("Les opérations, dans l'ordre")}</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {t("{n} sur la plage", { n: String(q.operations.length) })}
          </span>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("Date")}</th>
                <th>{t("Nature")}</th>
                <th>{t("Ligne")}</th>
                <th className="r">{t("Montant")}</th>
                <th>{t("État")}</th>
                <th>{t("Pièce")}</th>
              </tr>
            </thead>
            <tbody>
              {q.operations.map((o) => (
                <tr key={o.ref}>
                  <td className="num">{fmtDate(o.date)}</td>
                  <td>{t(o.nature)}</td>
                  <td>{o.ligne}</td>
                  <td className="r num">{fmt(o.montant)}</td>
                  <td>
                    <span className={`st ${o.etat}`}>{t(INTENT_STATE_LABEL[o.etat])}</span>
                    {o.enDefaut && <small className="crit-ink"> {t("jamais réglé")}</small>}
                  </td>
                  <td className="mono">{o.ref}</td>
                </tr>
              ))}
              {q.operations.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.vide}>
                    {t("Aucune opération sur cette plage.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: ".8rem", padding: "0 var(--s-6) var(--s-5)" }}>
          {t("Tout se recalcule depuis le journal des ordres et les mouvements d'espèces : aucun total n'est stocké. Un chiffre qui semble faux se corrige à sa source.")}
        </p>
      </div>
    </>
  );
}
