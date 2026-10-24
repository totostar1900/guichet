import Link from "next/link";
import { notFound } from "next/navigation";
import { DeskNav } from "@/components/DeskNav";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import { amortissementImplicite, ecartsEntre, enMilliards, financementBoucle, foisLeDeficit, notesDe, partDesTitres, paysDuSlug, sommeDes } from "@/lib/market/budget";
import { LIBELLES_DU_RELEVE, numeroSuivant, releveDuBudget } from "@/lib/market/note-budget";
import { DIT, trousDe, signauxDe } from "@/lib/market/carnet";
import { RedigerNote } from "./RedigerNote";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

/**
 * LA FICHE D'UN ÉTAT. INTERNE AU DESK.
 *
 * L'ORDRE DES SECTIONS EST L'ARGUMENT DE LA PAGE, et il ne doit pas changer
 * sans raison écrite : le millésime AVANT tout chiffre, puis recettes et
 * dépenses, puis l'enchaînement solde → amortissement → besoin, puis les six
 * portes, et seulement ensuite les notes. On ne peut pas lire une note avant
 * de savoir de quel texte elle parle.
 *
 * LE SOLDE N'EST JAMAIS RECALCULÉ. Pour le Cameroun 2026, les deux agrégats
 * donnent −323,5 quand la loi écrit −631,0 : les périmètres diffèrent. La page
 * montre le chiffre ÉCRIT, affiche la somme de ses propres postes à côté, et
 * laisse l'écart visible plutôt que de le résorber.
 *
 * LE BESOIN VAUT CINQ FOIS LE DÉFICIT, et c'est la leçon centrale : qui
 * raisonne « déficit donc émissions » se trompe de 80 %. La page l'écrit en
 * toutes lettres plutôt que de laisser le lecteur faire la division.
 */
export default async function FicheBudget({ params }: { params: Promise<{ pays: string }> }) {
  await requireDesk();
  const t = await getT();
  const { pays: slug } = await params;
  const pays = paysDuSlug(slug);
  if (!pays) notFound();

  const r = repo();
  const [budgets, toutesNotes] = await Promise.all([r.budgetsDesEtats(), r.notesBudget()]);
  const b = budgets.find((x) => x.pays === pays);
  if (!b) notFound();

  const notes = notesDe(toutesNotes, b.pays, b.exercice);
  const amort = amortissementImplicite(b);
  const fois = foisLeDeficit(b);
  const part = partDesTitres(b);
  const boucle = financementBoucle(b);
  const sommeRecettes = b.recettes.length ? sommeDes(b.recettes) : undefined;
  const sommeDepenses = b.depenses.length ? sommeDes(b.depenses) : undefined;
  /* LE CARNET DE CET ÉTAT, MOINS « jamais écrite » : la fiche porte déjà son
     état vide, qui le dit plus longuement et mieux. Les deux côte à côte
     faisaient dire deux fois la même chose en deux phrases différentes. */
  const signaux = signauxDe(b, toutesNotes, new Date().toISOString().slice(0, 10)).filter((s) => s.genre !== "jamais_ecrite");

  return (
    <>
      <DeskNav current="/desk/budgets" />
      <main className={styles.page}>
        <nav className={styles.retour}>
          <Link href="/desk/budgets">{t("Budgets des États")}</Link>
        </nav>
        <header className={styles.tete}>
          <h1>
            {b.pays} · {b.exercice}
          </h1>
          <p className={styles.sous}>
            <b>{t("Analyse interne : cette page ne sort pas du desk.")}</b>{" "}
            {t("La dette déjà contractée se lit sur")} <Link href="/desk/dette">{t("Dette des États")}</Link>.
          </p>
        </header>

        {/* LE MILLÉSIME, AVANT TOUT CHIFFRE. Un budget est voté, puis corrigé,
            puis exécuté : trois chiffres pour la même année. */}
        <section className={styles.millesime}>
          <h2>{t("Le millésime")}</h2>
          <p className={styles.loi}>
            {b.loi}
            {b.promulgueeLe ? ` · ${t("promulguée le")} ${fmtDate(b.promulgueeLe)}` : ""}
          </p>
          {b.hypotheses?.length ? (
            <ul className={styles.hypotheses}>
              {b.hypotheses.map((h) => (
                <li key={h.cle}>
                  <b>{h.libelle}</b> : {h.valeur}
                  {h.constate ? (
                    <>
                      {" "}
                      · <span className={styles.ecart}>{t("constaté")} {h.constate}</span>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          <p className={styles.source}>
            {t("Source")} : {b.source.texte} · {t("relevé le")} {fmtDate(b.source.releveLe)}
          </p>
        </section>

        {b.recettes.length || b.depenses.length ? (
          <section className={styles.bloc}>
            <h2>{t("Recettes et dépenses")}</h2>
            <div className={styles.deuxColonnes}>
              <div>
                <h3>{t("Recettes")}</h3>
                <table className={styles.postes}>
                  <tbody>
                    {b.recettes.map((p) => (
                      <tr key={p.cle}>
                        <td>{p.libelle}</td>
                        <td className={styles.r}>{enMilliards(p.montant)}</td>
                      </tr>
                    ))}
                    {sommeRecettes !== undefined ? (
                      <tr className={styles.somme}>
                        <td>{t("Somme des postes ci-dessus")}</td>
                        <td className={styles.r}>{enMilliards(sommeRecettes)}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <div>
                <h3>{t("Dépenses")}</h3>
                <table className={styles.postes}>
                  <tbody>
                    {b.depenses.map((p) => (
                      <tr key={p.cle}>
                        <td>{p.libelle}</td>
                        <td className={styles.r}>{enMilliards(p.montant)}</td>
                      </tr>
                    ))}
                    {sommeDepenses !== undefined ? (
                      <tr className={styles.somme}>
                        <td>{t("Somme des postes ci-dessus")}</td>
                        <td className={styles.r}>{enMilliards(sommeDepenses)}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        {/* L'ENCHAÎNEMENT : c'est l'ossature de la page. */}
        {b.soldeDeclare !== undefined || b.besoinDeFinancement !== undefined ? (
          <section className={styles.bloc}>
            <h2>{t("Du solde au besoin de financement")}</h2>
            <div className={styles.chaine}>
              <div className={styles.etape}>
                <span className={styles.el}>{t("Solde déclaré")}</span>
                <b className={styles.gros}>{enMilliards(b.soldeDeclare)}</b>
                <small>{t("écrit par le document, jamais recalculé ici")}</small>
              </div>
              <span className={styles.plus}>+</span>
              <div className={styles.etape}>
                <span className={styles.el}>{t("Remboursement du principal")}</span>
                <b className={styles.gros}>{enMilliards(amort)}</b>
                <small>{t("par différence — ce que l'État rend sur ses emprunts passés")}</small>
              </div>
              <span className={styles.plus}>=</span>
              <div className={`${styles.etape} ${styles.besoin}`}>
                <span className={styles.el}>{t("Besoin de financement")}</span>
                <b className={styles.gros}>{enMilliards(b.besoinDeFinancement)}</b>
                {fois ? (
                  <small>
                    <b>
                      {fois.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} {t("fois le déficit")}
                    </b>{" "}
                    · {t("qui raisonne « déficit donc émissions » se trompe largement")}
                  </small>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {b.financement.length ? (
          <section className={styles.bloc}>
            <h2>{t("Par quelles portes")}</h2>
            <p className={styles.chapo}>
              {t(
                "Les six portes se montrent ensemble, et jamais la seule qui nous concerne : la ligne des titres n'est pas une décision, c'est un solde. Quand un appui glisse ou qu'un prêt projet ne se tire pas, c'est elle qui enfle, en cours d'année, sans qu'aucune loi soit rouverte.",
              )}
            </p>
            <table className={styles.tableau}>
              <thead>
                <tr>
                  <th>{t("Porte")}</th>
                  <th className={styles.r}>{t("Milliards")}</th>
                  <th className={styles.r}>{t("Part")}</th>
                  <th>{t("Ce qu'elle suppose")}</th>
                </tr>
              </thead>
              <tbody>
                {b.financement.map((f) => (
                  <tr key={f.cle} className={f.titres ? styles.ligneTitres : undefined}>
                    <td>
                      {f.libelle}
                      {f.titres ? <span className={styles.ici}>{t("la seule que Guichet voit")}</span> : null}
                    </td>
                    <td className={styles.r}>{enMilliards(f.montant)}</td>
                    <td className={styles.r}>{b.besoinDeFinancement ? `${Math.round((f.montant / b.besoinDeFinancement) * 100)} %` : "—"}</td>
                    <td className={styles.suppose}>{f.suppose ?? "—"}</td>
                  </tr>
                ))}
                {boucle ? (
                  <tr className={styles.somme}>
                    <td>{t("Somme des portes")}</td>
                    <td className={styles.r}>{enMilliards(boucle.somme)}</td>
                    <td className={styles.r}>{part !== undefined ? "" : ""}</td>
                    <td className={styles.suppose}>
                      {boucle.ecart === 0 ? t("le tableau boucle exactement") : `${t("écart avec le besoin déclaré")} : ${enMilliards(boucle.ecart)}`}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        ) : null}

        {b.aRelever?.length ? (
          <section className={styles.bloc}>
            <h2>{t("Ce qui n'a pas été relevé")}</h2>
            <p className={styles.chapo}>{t("Nommé plutôt que laissé vide : un zéro à cette place donnerait l'illusion d'une couverture qui n'existe pas.")}</p>
            <ul className={styles.aRelever}>
              {b.aRelever.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* LES PIÈCES, JUSTE AVANT LES NOTES : une lecture se juge sur ce
            qu'elle avait sous les yeux. */}
        <section className={styles.bloc}>
          <h2>{t("Les pièces")}</h2>
          <p className={styles.chapo}>{t("Ce sur quoi le relevé s'appuie. Une pièce sans adresse se retrouve par son éditeur et sa date ; un lien mort, lui, ferait croire qu'elle n'existe pas.")}</p>
          {b.references?.length ? (
            <ul className={styles.pieces}>
              {b.references.map((p) => (
                <li key={`${p.editeur}-${p.titre}`}>
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noreferrer noopener">
                      {p.titre}
                    </a>
                  ) : (
                    <span>{p.titre}</span>
                  )}
                  <small>
                    {p.editeur}
                    {p.date ? ` · ${p.date}` : ""}
                    {p.url ? "" : ` · ${t("lien non relevé")}`}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.vide}>{t("Aucune pièce nommée. Le relevé vient de reprises de presse que personne n'a encore identifiées une par une.")}</p>
          )}
        </section>

        {/* LES NOTES, APRÈS LES CHIFFRES : on ne lit pas une lecture avant de
            savoir de quel texte elle parle. */}
        <section className={styles.bloc}>
          <h2>{t("Les notes du desk")}</h2>

          {/* LE CARNET DE CET ÉTAT, AU-DESSUS DU FORMULAIRE : ce qu'il y
              aurait à écrire se lit avant de commencer à écrire. */}
          {signaux.length ? (
            <ul className={styles.carnetFiche}>
              {signaux.map((s, i) => (
                <li key={`${s.genre}-${i}`}>{t(DIT[s.genre], trousDe(s, fmtDate))}</li>
              ))}
            </ul>
          ) : null}
          {/* LE FORMULAIRE AVANT LE FIL, parce que le fil se lit du plus récent
              au plus ancien : la note qu'on s'apprête à écrire prend la place
              qu'elle occupera. */}
          <RedigerNote
            slug={slug}
            pays={b.pays}
            exercice={b.exercice}
            releve={releveDuBudget(b)}
            references={b.references ?? []}
            prochainNumero={numeroSuivant(notes)}
          />
          {notes.length === 0 ? (
            <p className={styles.vide}>{t("Aucune note écrite sur cet État. Une note se demande ; elle ne se produit pas toute seule.")}</p>
          ) : (
            notes.map((n, i) => {
              const precedente = notes[i + 1];
              const ecarts = ecartsEntre(precedente, n);
              return (
                <article key={n.id} className={styles.note}>
                  <div className={styles.noteTete}>
                    <div>
                      <span className={styles.el}>
                        {t("Note")} n° {n.numero} · {fmtDate(n.closeLe)}
                      </span>
                      <h3>{n.titre}</h3>
                    </div>
                    <p className={styles.qui}>
                      {t("Demandée par")} {n.demandeePar} · {t("motif")} : {n.motif}
                      <br />
                      {t("Rédigée par")} {n.redigeePar}
                      {n.reluePar ? ` · ${t("relue par")} ${n.reluePar}` : ""}
                    </p>
                  </div>

                  <p className={styles.phrase}>
                    <b>{t("En une phrase.")}</b> {n.enUnePhrase}
                  </p>

                  {ecarts.length ? (
                    <div>
                      <span className={styles.el}>{precedente ? `${t("Ce qui a changé depuis la note")} n° ${precedente.numero}` : t("Le relevé de cette note")}</span>
                      <table className={styles.tableau}>
                        <thead>
                          <tr>
                            <th>{t("Le poste")}</th>
                            {precedente ? <th className={styles.r}>{t("Avant")}</th> : null}
                            <th className={styles.r}>{t("Aujourd'hui")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ecarts.map((e) => (
                            <tr key={e.cle} className={precedente && e.change ? styles.bouge : undefined}>
                              {/* NOS QUATRE LIBELLÉS PASSENT AU DICTIONNAIRE,
                                  LES AUTRES NON — et le tri se fait sur la
                                  clef, pas sur la phrase. Faute d'entrée, t()
                                  traduit mot à mot : l'intitulé de la loi
                                  « Prix du baril retenu » revenait en « Price
                                  du baril retenu », un hybride pire que le
                                  français laissé tel quel. Vu à l'écran, en
                                  anglais, et pas autrement. */}
                              <td>{e.cle in LIBELLES_DU_RELEVE ? t(e.libelle) : e.libelle}</td>
                              {precedente ? <td className={styles.r}>{e.avant ?? "—"}</td> : null}
                              <td className={styles.r}>{e.apres ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  <div className={styles.corps}>
                    {n.corps.map((p, k) => (
                      <p key={k}>
                        <span className={`${styles.etiq} ${p.genre === "constat" ? styles.constat : styles.lecture}`}>{t(p.genre)}</span> {p.texte}
                      </p>
                    ))}
                  </div>

                  <div className={styles.deuxColonnes}>
                    <div>
                      <span className={styles.el}>{t("Ce qu'il faut surveiller")}</span>
                      <ul className={styles.surveiller}>
                        {n.surveiller.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </div>
                    <div className={styles.malLu}>
                      <span className={styles.el}>{t("Ce que la note précédente a mal lu")}</span>
                      <p>{n.malLu}</p>
                    </div>
                  </div>

                  {/* LES PIÈCES DE CETTE NOTE-LÀ, et non celles de la fiche
                      aujourd'hui : relue dans deux ans, elle doit montrer ce
                      qu'elle avait sous les yeux. */}
                  {n.references?.length ? (
                    <div>
                      <span className={styles.el}>{t("Ce sur quoi elle s'appuie")}</span>
                      <ul className={styles.pieces}>
                        {n.references.map((p) => (
                          <li key={`${p.editeur}-${p.titre}`}>
                            {p.url ? (
                              <a href={p.url} target="_blank" rel="noreferrer noopener">
                                {p.titre}
                              </a>
                            ) : (
                              <span>{p.titre}</span>
                            )}
                            <small>
                              {p.editeur}
                              {p.date ? ` · ${p.date}` : ""}
                              {p.url ? "" : ` · ${t("lien non relevé")}`}
                            </small>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </section>
      </main>
    </>
  );
}
