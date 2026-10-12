import Link from "next/link";
import { notFound } from "next/navigation";
import { DeskNav } from "@/components/DeskNav";
import { Cadence } from "@/components/Cadence";
import { repo } from "@/lib/data";
import { requireDesk } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { ficheDe, GESTES_AU_FIL } from "@/lib/desk/fiche-data";
import { GENRES, GENRE_LABEL, GESTES } from "@/lib/domain/journal-client";
import { CRAN_LABEL } from "@/lib/domain/tenue";
import { KIND_LABEL, STATUS_LABEL } from "@/lib/kyc/checklist";
import { INGREDIENT_LABEL } from "@/lib/domain/activite";
import styles from "./page.module.css";

/**
 * LA FICHE D'UN CLIENT : TOUT CE QU'IL A FAIT.
 *
 * La planche la plus dense de la maquette du 10 octobre 2026, et celle dont
 * l'audit du 12 octobre a montré qu'elle n'avait pas été construite : cinq
 * sections dessinées, deux blocs livrés, et vingt-cinq barres absentes.
 *
 * ELLE EST UNE PAGE, ET NON UN PANNEAU DE PLUS DANS « DOSSIERS ». Le panneau
 * y est déjà dense, et le lot avait justement été greffé dessus en y perdant
 * son dessin : une planche qui dessine une page entière se construit en page
 * entière, comme la vue quantitative, et se rejoint depuis le dossier. Le
 * dossier garde l'identité, les pièces et les signataires ; cette page garde
 * la conduite.
 */
export const dynamic = "force-dynamic";

export default async function FicheActivitePage({ searchParams }: { searchParams: Promise<{ file?: string; genre?: string }> }) {
  await requireDesk();
  const t = await getT();
  const sp = await searchParams;
  if (!sp.file) notFound();

  const r = repo();
  const dossier = (await r.listClientFiles().catch(() => [])).find((f) => f.id === sp.file);
  if (!dossier) notFound();
  const contact = (await r.listContacts().catch(() => [])).find((c) => c.id === dossier.userId);
  const nom = contact?.name ?? dossier.identity?.name ?? t("(sans nom)");

  const fiche = await ficheDe(dossier.userId);
  const genre = GENRES.find((g) => g === sp.genre);
  const auFil = genre ? fiche.gestes.filter((g) => g.genre === genre) : fiche.gestes;

  /* Le fil se regroupe par jour, comme la maquette : une date en bandeau,
     puis les gestes de ce jour-là, du plus récent au plus ancien. */
  const parJour = new Map<string, typeof auFil>();
  for (const g of auFil) {
    const j = g.at.slice(0, 10);
    const liste = parJour.get(j);
    if (liste) liste.push(g);
    else parJour.set(j, [g]);
  }

  const lien = (q: Record<string, string | undefined>) => {
    const p = new URLSearchParams({ file: sp.file! });
    for (const [k, v] of Object.entries(q)) if (v) p.set(k, v);
    return `/desk/clients/activite?${p}`;
  };

  return (
    <>
      <DeskNav current="/desk/clients" />

      <div className={styles.head}>
        <div>
          <div className="eyebrow">
            {t(KIND_LABEL[dossier.kind])} · {t("dossier {s}", { s: t(STATUS_LABEL[dossier.status]).toLowerCase() })}
            {contact?.since ? ` · ${t("client depuis le {d}", { d: fmtDate(contact.since) })}` : ""}
          </div>
          <h1 className="display">{nom}</h1>
        </div>
        <Link className="btn sm ghost" href={`/desk/clients?file=${dossier.id}`}>
          ← {t("Le dossier")}
        </Link>
      </div>

      {/* LES SIX TUILES. Chacune mène là où son chiffre se détaille : une
          tuile qui ne mène nulle part est un nombre de plus à l'écran. */}
      <div className={styles.tuiles}>
        <Link className={styles.tuile} href={`/desk/clients?file=${dossier.id}#mesures`}>
          <span className={styles.tuileNom}>{t("Statut")}</span>
          <b>{t(STATUS_LABEL[dossier.status])}</b>
          <small className="muted">{t("palier {n}", { n: contact?.tier ?? 1 })}</small>
        </Link>

        <a className={styles.tuile} href="#tenue">
          <span className={styles.tuileNom}>{t("Tenue")}</span>
          <b>
            <span className={`st ${fiche.tenue.cran === "en_defaut" ? "annulee" : fiche.tenue.cran === "a_surveiller" ? "recue" : "reglee"}`}>{t(CRAN_LABEL[fiche.tenue.cran])}</span>
          </b>
          <small className="muted">{fiche.tenue.manquements.length ? t("{n} manquement(s)", { n: fiche.tenue.manquements.length }) : t("aucun manquement")}</small>
        </a>

        <Link className={styles.tuile} href="/desk/referentiel/bareme">
          <span className={styles.tuileNom}>{t("Activité")}</span>
          <b className="num">
            {fiche.activite ? fiche.activite.score : "—"} <small className="muted">{t("sur 100")}</small>
          </b>
          <small className="muted">{fiche.activite ? t("barème v{n}", { n: fiche.activite.bareme }) : t("aucun barème publié")}</small>
        </Link>

        <Link className={styles.tuile} href={`/desk/clients/quantitatif?file=${dossier.id}`}>
          <span className={styles.tuileNom}>{t("Traité avec nous")}</span>
          <b>→</b>
          <small className="muted">{t("volume, espèces, commissions")}</small>
        </Link>

        <a className={styles.tuile} href="#fil">
          <span className={styles.tuileNom}>{t("Gestes enregistrés")}</span>
          <b className="num">{fiche.comptes.total}</b>
          <small className="muted">{fiche.depuis ? t("depuis le {d}", { d: fmtDate(fiche.depuis) }) : t("aucun geste")}</small>
        </a>

        <Link className={styles.tuile} href="/desk/journal?registre=gestes">
          <span className={styles.tuileNom}>{t("Cadence, 12 mois")}</span>
          <Cadence c={fiche.cadence} titre={nom} />
          <small className="muted">{t("{n} sur 30 jours", { n: fiche.cadence.recents })}</small>
        </Link>
      </div>

      <div className={styles.deux}>
        {/* ─────────── Le fil ─────────── */}
        <section className="panel" id="fil">
          <div className="panel-h">
            <h2>{t("Tout ce qu'il a fait")}</h2>
            <span className="muted">{fiche.depuis ? t("{n} lignes depuis le {d}", { n: fiche.comptes.total, d: fmtDate(fiche.depuis) }) : t("aucune ligne")}</span>
          </div>

          {/* LES HUIT COMPTEURS DE LA MAQUETTE : chacun porte son nombre, parce
              qu'un filtre qui ne dit pas combien il cache se clique à l'aveugle. */}
          <div className={styles.genres}>
            <Link className={`btn sm ${genre ? "ghost" : ""}`} href={lien({})}>
              {t("Tout")} <span className="muted">{fiche.comptes.total}</span>
            </Link>
            {GENRES.map((g) => (
              <Link key={g} className={`btn sm ${genre === g ? "" : "ghost"}`} href={genre === g ? lien({}) : lien({ genre: g })}>
                {t(GENRE_LABEL[g])} <span className="muted">{fiche.comptes.parGenre[g] ?? 0}</span>
              </Link>
            ))}
          </div>

          {auJourLeJour(parJour, t)}

          {fiche.comptes.total > GESTES_AU_FIL && (
            <p className={styles.plus}>
              <Link href="/desk/journal?registre=gestes">{t("Voir les {n} lignes précédentes au registre", { n: fiche.comptes.total - GESTES_AU_FIL })}</Link>
            </p>
          )}
        </section>

        <div className={styles.colonne}>
          {/* ─────────── La tenue ─────────── */}
          <section className="panel" id="tenue">
            <div className="panel-h">
              <h2>{t("Tenue : les manquements")}</h2>
            </div>
            {/* LA TENUE SE LIT EN MANQUEMENTS, JAMAIS EN NOTE : un cran se
                conteste ligne à ligne, un chiffre ne se conteste pas. */}
            {fiche.tenue.manquements.length === 0 ? (
              <p className={styles.rien}>{t("Rien à dire : aucun manquement sur la période.")}</p>
            ) : (
              <ul className={styles.liste}>
                {fiche.tenue.manquements.map((m, i) => (
                  <li key={i}>
                    <b>{t(m.phrase, m.vars)}</b>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ─────────── L'activité, ingrédient par ingrédient ─────────── */}
          <section className="panel">
            <div className="panel-h">
              <h2>{fiche.activite ? t("Activité : {n} sur 100", { n: fiche.activite.score }) : t("Activité")}</h2>
            </div>
            {!fiche.activite ? (
              <p className={styles.rien}>{t("Aucun barème publié : sans lui, un score ne se compare à rien.")}</p>
            ) : (
              <>
                <p className={styles.note}>
                  {t("Barème")} <Link href="/desk/referentiel/bareme">v{fiche.activite.bareme}</Link>. {t("Un score ne se compare qu'à barème égal.")}
                </p>
                <dl className={styles.parts}>
                  {fiche.activite.parts.map((p) => (
                    <div key={p.clef}>
                      <dt>{t(INGREDIENT_LABEL[p.clef])}</dt>
                      <dd className="muted">{p.brut}</dd>
                      <dd className="num">
                        {p.points}
                        <small className="muted">/{p.sur}</small>
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className={styles.note}>
                  {t("Les consultations ne pèsent rien dans ce score : elles nourrissent la cadence et le fil. Sinon regarder vaudrait acheter.")}
                </p>
              </>
            )}
          </section>

          {/* ─────────── Les alertes ─────────── */}
          <section className="panel">
            <div className="panel-h">
              <h2>{t("Alertes")}</h2>
            </div>
            {fiche.alertes.length === 0 ? (
              <p className={styles.rien}>{t("Aucun enchaînement à signaler.")}</p>
            ) : (
              <ul className={styles.liste}>
                {fiche.alertes.map((a, i) => (
                  <li key={i} className={styles.alerte}>
                    <b>{t(a.titre)}</b>
                    <small className="muted">{a.detail}</small>
                  </li>
                ))}
              </ul>
            )}
            <p className={styles.note}>{t("Une alerte naît d'un enchaînement, pas d'un score. Elle nomme les deux faits et leur écart dans le temps.")}</p>
          </section>

          {/* ─────────── Agir ─────────── */}
          <section className="panel">
            <div className="panel-h">
              <h2>{t("Agir")}</h2>
            </div>
            <div className={styles.agir}>
              <Link className="btn sm" href={`/desk/clients?file=${dossier.id}#mesures`}>
                {t("Prendre une mesure")}
              </Link>
              <Link className="btn sm ghost" href={`/desk/clients?file=${dossier.id}#message`}>
                {t("Écrire au client")}
              </Link>
            </div>
            <p className={styles.note}>{t("Une mesure demande un motif pris dans la liste, une durée, et un second responsable. Le client lit la mesure et sa cause.")}</p>
            {/* CETTE PHRASE N'EST PAS UN ORNEMENT : elle dit où ne PAS cliquer,
                et c'est la loi qui l'impose. */}
            <p className={styles.note}>{t("Un soupçon de fraude ne passe pas par ce bouton : il va à la conformité, il ne se dit pas au client, et c'est la loi qui l'impose.")}</p>
          </section>
        </div>
      </div>
    </>
  );
}

/** Le fil, regroupé par jour : une date en bandeau, puis les gestes. */
function auJourLeJour(parJour: Map<string, { id: string; at: string; geste: string; genre: string; detail?: string; objet?: string }[]>, t: (s: string, v?: Record<string, string | number>) => string) {
  if (parJour.size === 0) return <p className={styles.rien}>{t("Aucun geste pour ce filtre.")}</p>;
  return (
    <div className={styles.fil}>
      {[...parJour].map(([jour, gestes]) => (
        <div key={jour}>
          <div className={styles.jour}>{fmtDate(jour)}</div>
          {gestes.map((g) => (
            <div key={g.id} className={styles.ligne}>
              <span className={styles.heure}>{fmtDateTime(g.at).slice(-5)}</span>
              <div>
                {/* Le geste se dit en mots : « ordre.depose » n'est pas une phrase. */}
                <div>{t(GESTES[g.geste]?.auDesk ?? g.geste)}</div>
                {(g.detail || g.objet) && <small className="muted">{[g.detail, g.objet].filter(Boolean).join(" · ")}</small>}
              </div>
              <span className="st">{t(GENRE_LABEL[g.genre as keyof typeof GENRE_LABEL] ?? g.genre)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
