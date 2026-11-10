import { notFound } from "next/navigation";
import Link from "next/link";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { Info } from "@/components/Info";
import { Avatar } from "@/components/Avatar";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { fmtDate, localIso } from "@/lib/format";
import { getIssuerRegistry, FAMILY_LABEL } from "@/data/issuer-registry";
import { GRAPHE_H, GRAPHE_L } from "@/lib/ui/graphe";
import {
  MOT_DU_MILLESIME,
  enMilliards,
  porteDesTitres,
  sommeDes,
} from "@/lib/market/budget";
import { seancesOuvertes, seancesPrevues } from "@/lib/domain/accueil";
import {
  DEF_INDICATEUR,
  ECHELLES,
  derniereJusqua,
  derniereRevue,
  etatParSlug,
  fraicheurDeLaSaisie,
  institutionParSlug,
  placeSurLEchelle,
  serie,
  type EntiteFait,
  type IndicateurPays,
  type PaysIndicateur,
} from "@/lib/market/pays";
import { PiecesConservees } from "@/components/PiecesConservees";
import { entiteDeBudget } from "@/lib/market/pieces";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getT();
  const etat = etatParSlug(slug);
  const inst = institutionParSlug(slug);
  const nom = etat
    ? `${t("Trésor public")} · ${t(etat.pays)}`
    : (inst?.nom ?? "");
  return {
    title: nom
      ? `${nom} · ${t("Santé économique et financière")}`
      : t("Santé économique et financière"),
  };
}

/* ─── Le dessin : la dette brute, pleine jusqu'à la dernière année observée, tiretée ensuite ─── */

function CourbeDette({
  points,
  label,
}: {
  points: PaysIndicateur[];
  label: string;
}) {
  if (points.length < 2) return null;
  const W = GRAPHE_L;
  const H = GRAPHE_H - 40;
  const g = { l: 30, r: 10, t: 12, b: 22 };
  const a0 = points[0].annee;
  const a1 = points[points.length - 1].annee;
  const max = Math.max(...points.map((p) => p.valeur), 1) * 1.1;
  const x = (a: number) =>
    g.l + ((a - a0) / Math.max(a1 - a0, 1)) * (W - g.l - g.r);
  const y = (v: number) => g.t + (1 - v / max) * (H - g.t - g.b);
  const observes = points.filter((p) => !p.estime);
  const dernierObserve = observes.at(-1);
  const estimes = dernierObserve
    ? [dernierObserve, ...points.filter((p) => p.estime)]
    : points.filter((p) => p.estime);
  const d = (pts: PaysIndicateur[]) =>
    pts
      .map(
        (p, i) =>
          `${i ? "L" : "M"}${x(p.annee).toFixed(1)} ${y(p.valeur).toFixed(1)}`,
      )
      .join(" ");
  const graduations = [0, 0.5, 1].map((k) => Math.round((max / 1.1) * k));
  const annees = [a0, Math.round((a0 + a1) / 2), a1];
  return (
    <svg
      className={styles.graphe}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={label}
    >
      {graduations.map((v) => (
        <g key={v}>
          <line
            x1={g.l}
            x2={W - g.r}
            y1={y(v)}
            y2={y(v)}
            className={styles.grille}
          />
          <text
            x={g.l - 4}
            y={y(v) + 3}
            textAnchor="end"
            className={styles.texte}
          >
            {v}
          </text>
        </g>
      ))}
      {annees.map((a) => (
        <text
          key={a}
          x={x(a)}
          y={H - 6}
          textAnchor="middle"
          className={styles.texte}
        >
          {a}
        </text>
      ))}
      {observes.length > 1 && (
        <path d={d(observes)} className={styles.pleine} />
      )}
      {estimes.length > 1 && <path d={d(estimes)} className={styles.tiretee} />}
      {dernierObserve && (
        <circle
          cx={x(dernierObserve.annee)}
          cy={y(dernierObserve.valeur)}
          r={3}
          className={styles.point}
        />
      )}
    </svg>
  );
}

/* ─── La rangée d'une échelle officielle : la note marquée, la frontière de la catégorie d'investissement ─── */

function Echelle({ cle, note }: { cle: string; note?: string }) {
  const e = ECHELLES[cle];
  const place = note ? placeSurLEchelle(cle, note) : undefined;
  const frontiere = e.crans.indexOf(e.dernierInvestissement);
  return (
    <ol
      className={styles.echelle}
      aria-label={cle === "Moody" ? "Moody's" : cle}
    >
      {e.crans.map((c, i) => (
        <li
          key={c}
          className={`${styles.cran} ${place?.rang === i ? styles.cranMarque : ""} ${i === frontiere ? styles.cranFrontiere : ""}`}
          aria-current={place?.rang === i ? "true" : undefined}
        >
          {c}
        </li>
      ))}
    </ol>
  );
}

const premierParOrganisme = (faits: EntiteFait[]): EntiteFait[] => {
  const vus = new Set<string>();
  return [...faits]
    .sort((a, b) => b.dateFait.localeCompare(a.dateFait))
    .filter((f) =>
      vus.has(f.organisme) ? false : (vus.add(f.organisme), true),
    );
};

const fmtVal = (n: number) =>
  n.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

export default async function PaysFichePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const etat = etatParSlug(slug);
  const inst = institutionParSlug(slug);
  if (!etat && !inst) notFound();
  const t = await getT();
  const entite = (etat?.entite ?? inst?.entite)!;
  const r = repo();
  const [indicateurs, faits, offers, encours, budgets, piecesEntite] = await Promise.all([
    r.listPaysIndicateurs(),
    r.listEntiteFaits(entite),
    r.listOffers(),
    r.encoursOfficiel(),
    r.budgetsDesEtats(),
    r.listPiecesArchivees(),
  ]);
  const now = new Date();
  const aujourdhui = localIso(now);
  const anneeCourante = now.getFullYear();

  const profil = getIssuerRegistry().find((p) => p.slug === entite);
  const nomTresor = etat
    ? (profil?.aliases.find((a) => /^Trésor public de la /.test(a)) ??
      `${t("Trésor public")} · ${t(etat.pays)}`)
    : undefined;
  const titre = etat ? nomTresor! : inst!.nom;

  const revue = derniereRevue(faits, entite);
  const fr = fraicheurDeLaSaisie(revue, aujourdhui);
  const lu = indicateurs
    .filter((i) => etat && i.pays === etat.pays)
    .map((i) => i.luLe)
    .sort()
    .at(-1);

  const notations = premierParOrganisme(
    faits.filter((f) => f.genre === "notation"),
  );
  const chiffres = faits
    .filter((f) => f.genre === "chiffre")
    .sort((a, b) => b.dateFait.localeCompare(a.dateFait));

  /* ─── Les quatre chiffres : dernière valeur observée ou estimée, jamais celle d'une prévision lointaine ─── */
  const chiffre = (ind: IndicateurPays) =>
    etat
      ? derniereJusqua(indicateurs, etat.pays, ind, anneeCourante)
      : undefined;
  const enBref: IndicateurPays[] = [
    "dette_brute_pib",
    "solde_global_pib",
    "dette_exterieure_rnb",
    "service_dette_exports",
  ];
  const autres: IndicateurPays[] = [
    "croissance_pib",
    "inflation",
    "compte_courant_pib",
  ];

  const dette = etat ? serie(indicateurs, etat.pays, "dette_brute_pib") : [];
  const detteAffichee = dette.filter(
    (p) => p.annee >= anneeCourante - 15 && p.annee <= anneeCourante + 5,
  );

  const encoursPays = etat
    ? encours
        .filter((e) => e.pays === etat.pays)
        .sort((a, b) => b.mois.localeCompare(a.mois))[0]
    : undefined;
  const budget = etat
    ? budgets
        .filter((b) => b.pays === etat.pays)
        .sort((a, b) => b.exercice - a.exercice)[0]
    : undefined;
  const titres = budget ? porteDesTitres(budget) : undefined;
  const piecesBudget = etat ? piecesEntite.filter((c) => c.entite === entiteDeBudget(etat.pays, budget?.exercice)) : [];
  const piecesNotes = piecesEntite.filter((c) => c.entite === entite);

  const seances = etat
    ? [
        ...seancesOuvertes(offers, now),
        ...seancesPrevues(offers, now, 20),
      ].filter((o) => o.country === etat.pays && /tr[ée]sor/i.test(o.issuer))
    : [];

  const sourcesLues = new Set(
    etat
      ? indicateurs.filter((i) => i.pays === etat.pays).map((i) => i.source)
      : [],
  );

  return (
    <Glissement>
      <div className={styles.page}>
        <EnTete
          surTitre={t(
            etat ? "Émetteur · État" : "Émetteur · Institution régionale",
          )}
          titre={titre}
        />

        <header className={styles.tete}>
          {etat ? (
            <Avatar
              offre={{
                issuer: "Trésor public",
                country: etat.pays,
                title: titre,
              }}
            />
          ) : (
            <span className={styles.mono} aria-hidden="true">
              {inst!.nom.slice(0, 2)}
            </span>
          )}
          <p className={styles.sous}>
            
            {revue
              ? `${t("Dernière revue le")} ${fmtDate(revue)}`
              : t("Pas encore relevé")}{" "}
            ·{" "}
            {t(
              fr.etat === "a_jour"
                ? "à jour"
                : fr.etat === "a_verifier"
                  ? "à vérifier"
                  : "à saisir",
            )}
            {inst && profil ? ` · ${t(FAMILY_LABEL[profil.family])}` : ""}
          </p>
        </header>

        {etat && (
          <section className={styles.bloc} aria-labelledby="enbref">
            <h2 id="enbref">
              {t("En bref")}{" "}
              <Info
                termes={[
                  "dette_brute",
                  "solde_global",
                  "dette_exterieure",
                  "service_dette",
                ]}
              />
            </h2>
            <ul className={styles.chiffres}>
              {enBref.map((ind) => {
                const d = chiffre(ind);
                const def = DEF_INDICATEUR[ind];
                return (
                  <li key={ind} className={styles.chiffre}>
                    <span className={styles.etiquette}>{t(def.libelle)}</span>
                    {d ? (
                      <>
                        <b className={styles.valeur}>
                          {fmtVal(d.valeur)} <small>{t(def.unite)}</small>
                        </b>
                        <span className={styles.meta}>
                          {d.annee} · {t(d.source)}
                          {d.estime ? ` · ${t("estimation ou prévision")}` : ""}
                        </span>
                      </>
                    ) : (
                      <span className={styles.absent}>
                        {t("non publié par la source")}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {etat && (
          <section className={styles.bloc} aria-labelledby="dette">
            <h2 id="dette">{t("La dette")}</h2>
            {detteAffichee.length > 1 ? (
              <>
                <CourbeDette
                  points={detteAffichee}
                  label={`${t("Dette brute")} (${t("% du PIB")})`}
                />
                <p className={styles.legende}>
                  <span className={styles.traitPlein} aria-hidden="true" />{" "}
                  {t("observé")}{" "}
                  <span className={styles.traitTiret} aria-hidden="true" />{" "}
                  {t("estimation ou prévision")} · {t("Dette brute")},{" "}
                  {t("% du PIB")} · {t("FMI")}
                </p>
              </>
            ) : (
              <p className={styles.absent}>
                {t("Série de la dette non publiée par la source")}
              </p>
            )}
            <dl className={styles.faits}>
              <div>
                <dt>{t("Titres publics en circulation")}</dt>
                <dd>
                  {encoursPays ? (
                    <>
                      <b>{enMilliards(encoursPays.encours)} Md FCFA</b>{" "}
                      <span className={styles.meta}>
                        {encoursPays.mois.slice(0, 7)} · BEAC
                      </span>
                    </>
                  ) : (
                    <span className={styles.absent}>
                      {t("non publié par la source")}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </section>
        )}

        <section className={styles.bloc} aria-labelledby="notes">
          <h2 id="notes">{t("Notations publiques")}</h2>
          {notations.length ? (
            <>
              <div className={styles.tableau}>
                <table>
                  <thead>
                    <tr>
                      <th>{t("Agence")}</th>
                      <th>{t("Note")}</th>
                      <th>{t("Perspective")}</th>
                      <th>{t("Date")}</th>
                      <th>{t("Pièce")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notations.map((n) => (
                      <tr key={n.id}>
                        <td>{n.organisme}</td>
                        <td>
                          <b>{n.valeur}</b>
                        </td>
                        <td>{n.perspective ?? "—"}</td>
                        <td>{fmtDate(n.dateFait)}</td>
                        <td>
                          <a
                            href={n.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {t("Voir la pièce")} ↗
                          </a>
                          {piecesNotes.find((c) => c.urlOrigine === n.url) && (
                            <>
                              {" · "}
                              <a href={`/pieces/${piecesNotes.find((c) => c.urlOrigine === n.url)!.id}`} target="_blank" rel="noopener">
                                {t("copie")}
                              </a>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {notations.map((n) => {
                const place = placeSurLEchelle(n.organisme, n.valeur);
                return place ? (
                  <div key={n.id} className={styles.echelleBloc}>
                    <span className={styles.etiquette}>
                      {n.organisme} · {t("échelle officielle")}
                    </span>
                    <Echelle cle={place.cle} note={n.valeur} />
                  </div>
                ) : null;
              })}
              <p className={styles.legende}>
                {t(
                  "Le trait à droite de BBB- (Baa3 chez Moody's) borde la catégorie d'investissement. Notes à long terme, telles que les agences les publient.",
                )}
              </p>
            </>
          ) : (
            <p className={styles.absent}>{t("Aucune note publique saisie")}</p>
          )}
        </section>


        {inst && (
          <section className={styles.bloc} aria-labelledby="comptes">
            <h2 id="comptes">{t("Chiffres des comptes publiés")}</h2>
            {chiffres.length ? (
              <ul className={styles.liste}>
                {chiffres.map((c) => (
                  <li key={c.id}>
                    <span>{c.perspective ?? c.organisme}</span>{" "}
                    <b>
                      {c.valeur}
                      {c.unite ? ` ${c.unite}` : ""}
                    </b>
                    <span className={styles.meta}>
                      {" "}
                      · {c.organisme} · {fmtDate(c.dateFait)} ·{" "}
                      <a href={c.url} target="_blank" rel="noopener noreferrer">
                        {t("Voir la pièce")} ↗
                      </a>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.absent}>
                {t("Aucun chiffre des comptes saisi")}
              </p>
            )}
          </section>
        )}

        {etat && (
          <section className={styles.bloc} aria-labelledby="budget">
            <h2 id="budget">{t("Budget et besoin annuel d'endettement")}</h2>
            {budget ? (
              <>
                <dl className={styles.faits}>
                  <div>
                    <dt>{t("Exercice")}</dt>
                    <dd>
                      {budget.exercice} · {t(MOT_DU_MILLESIME[budget.millesime])} · {budget.loi}
                    </dd>
                  </div>
                  {[
                    ["Budget total", budget.budgetTotal],
                    ["Recettes", budget.recettes.length ? sommeDes(budget.recettes) : undefined],
                    ["Dépenses", budget.depenses.length ? sommeDes(budget.depenses) : undefined],
                    ["Solde déclaré", budget.soldeDeclare],
                    ["Besoin de financement", budget.besoinDeFinancement],
                    ...(titres ? ([["dont titres publics", titres.montant]] as [string, number][]) : []),
                  ].map(([libelle, v]) => (
                    <div key={libelle as string}>
                      <dt>{t(libelle as string)}</dt>
                      <dd>
                        {v === undefined ? <span className={styles.absent}>{t("non publié par la source")}</span> : <b>{enMilliards(v as number)} Md FCFA</b>}
                      </dd>
                    </div>
                  ))}
                  {budget.financement.map((f) => (
                    <div key={f.cle}>
                      <dt>{t("Financement")} · {f.libelle}</dt>
                      <dd>
                        <b>{enMilliards(f.montant)} Md FCFA</b>
                      </dd>
                    </div>
                  ))}
                </dl>
                {budget.references?.length ? (
                  <ul className={styles.liste}>
                    {budget.references.filter((x) => x.url).map((x) => {
                      const copie = piecesBudget.find((c) => c.urlOrigine === x.url);
                      return (
                        <li key={x.url}>
                          <a href={x.url} target="_blank" rel="noopener noreferrer">
                            {x.titre} ↗
                          </a>
                          <span className={styles.meta}>
                            {" "}
                            · {x.editeur}
                            {copie ? (
                              <>
                                {" "}
                                · <a href={`/pieces/${copie.id}`} target="_blank" rel="noopener">{t("copie conservée")}</a>
                              </>
                            ) : null}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </>
            ) : (
              <p className={styles.absent}>{t("Budget non publié dans la base")}</p>
            )}
          </section>
        )}

        {etat && (
          <section className={styles.bloc} aria-labelledby="calendrier">
            <h2 id="calendrier">{t("Calendrier d'endettement")}</h2>
            {seances.length ? (
              <ul className={styles.liste}>
                {seances.map((o) => (
                  <li key={o.id}>
                    <Link href={`/offres/${o.id}`}>{t(o.title)}</Link>
                    <span className={styles.meta}>
                      {" "}
                      · {fmtDate(o.opensAt.slice(0, 10))} →{" "}
                      {fmtDate(o.deadlineAt.slice(0, 10))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.absent}>{t("Aucune séance annoncée")}</p>
            )}
          </section>
        )}

        {etat && (
          <section className={styles.bloc} aria-labelledby="autres">
            <h2 id="autres">{t("Autres indicateurs")}</h2>
            <dl className={styles.faits}>
              {autres.map((ind) => {
                const d = chiffre(ind);
                const def = DEF_INDICATEUR[ind];
                return (
                  <div key={ind}>
                    <dt>{t(def.libelle)}</dt>
                    <dd>
                      {d ? (
                        <>
                          <b>
                            {fmtVal(d.valeur)} {t(def.unite)}
                          </b>{" "}
                          <span className={styles.meta}>
                            {d.annee} · {t(d.source)}
                            {d.estime
                              ? ` · ${t("estimation ou prévision")}`
                              : ""}
                          </span>
                        </>
                      ) : (
                        <span className={styles.absent}>
                          {t("non publié par la source")}
                        </span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        )}

        {piecesNotes.length + piecesBudget.length > 0 && (
          <section className={styles.bloc} aria-labelledby="copies">
            <h2 id="copies">{t("Copies des sources")}</h2>
            <PiecesConservees pieces={[...piecesBudget, ...piecesNotes]} />
          </section>
        )}

        <footer className={styles.pied}>
          <h2>{t("Sources et fraîcheur")}</h2>
          <p className={styles.meta}>
            {etat && sourcesLues.size
              ? `${[...sourcesLues].map((s) => t(s)).join(" · ")} · ${t("lu le")} ${lu ? fmtDate(lu) : "—"}. `
              : ""}
            {t(
              "Notations : saisies chaque trimestre à partir des pièces publiques, chacun avec son lien.",
            )}{" "}
            {t(
              "Les chiffres décrivent le passé et des projections de leur source ; ils ne sont ni un conseil ni une prévision de Guichet.",
            )}
          </p>
        </footer>
      </div>
    </Glissement>
  );
}
