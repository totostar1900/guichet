import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import { MOT_DU_MILLESIME, enMilliards, estComplet, notesDe, parLisibilite, partDesTitres, piecesSuivies, porteDesTitres, slugDuPays, trousDe } from "@/lib/market/budget";
import { REFERENCES_ZONE } from "@/data/budgets-seed";
import { DIT, carnet } from "@/lib/market/carnet";
import type { BudgetEtat } from "@/lib/domain/types";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Budgets des États" };

/**
 * LES BUDGETS DES SIX ÉTATS. INTERNE AU DESK.
 *
 * « Dette des États » montre le STOCK : ce que les six Trésors doivent
 * aujourd'hui. Cette page montre le FLUX qui le fabrique — ce qu'un État
 * encaisse, ce qu'il dépense, ce qui manque, et par quelles portes il va
 * chercher ce qui manque. Une seule de ces portes, les titres publics adjugés
 * à la BEAC, débouche sur Guichet.
 *
 * AUCUN TOTAL DE ZONE, et c'est le même refus que la page de la dette : six
 * millésimes différents, trois révisés, deux inconnus. Les additionner
 * donnerait un chiffre faux d'une précision rassurante.
 *
 * CE QUI N'A PAS ÉTÉ RELEVÉ EST NOMMÉ. Quatre États sur six sont incomplets au
 * 25 octobre 2026. Rendre des zéros à leur place donnerait l'illusion d'une
 * couverture qui n'existe pas ; la colonne le dit, et la fiche l'énumère.
 */
/* LE MOT vient du domaine — la fiche et le relevé d'une note le lisent aussi.
   LE TON reste ici : il parle de l'écran, pas du budget. */
const TON: Record<BudgetEtat["millesime"], string> = {
  vote: "calme",
  revision_annoncee: "attention",
  revision_deposee: "attention",
  revise: "change",
};

export default async function BudgetsPage() {
  await requireDesk();
  const t = await getT();
  const r = repo();
  const [budgets, notes, seances] = await Promise.all([r.budgetsDesEtats(), r.notesBudget(), r.listAuctionResults({})]);
  const liste = parLisibilite(budgets);
  /* LE JOUR EST PASSÉ, JAMAIS LU DANS LE DOMAINE : un signal qui dit « il y a
     sept mois » se cite, donc il doit se tester. */
  const signaux = carnet(budgets, notes, seances, new Date().toISOString().slice(0, 10));
  const pieces = piecesSuivies(budgets, notes, REFERENCES_ZONE);
  const sansLien = pieces.filter((x) => !x.piece.url).length;

  return (
    <>
      <DeskNav current="/desk/budgets" />
      <main className={styles.page}>
        <header className={styles.tete}>
          <h1>{t("Budgets des États")}</h1>
          <p className={styles.sous}>
            {t(
              "Ce qu'un Trésor encaisse, ce qu'il dépense, ce qui manque, et par quelles portes il va chercher ce qui manque. Une seule de ces portes débouche sur Guichet : les titres publics adjugés à la BEAC.",
            )}{" "}
            <b>{t("Analyse interne : cette page ne sort pas du desk.")}</b>
          </p>
          <p className={styles.renvoi}>
            {t("La dette déjà contractée se lit sur")} <Link href="/desk/dette">{t("Dette des États")}</Link> {t("— le stock, dont cette page est le flux.")}
          </p>
        </header>

        {/* LE CARNET, AVANT LES CARTES.
            Une note qui ne s'écrit que lorsqu'on la demande s'écrit quand
            quelqu'un est déjà inquiet : la série penche vers les crises et se
            tait dans le calme. Le carnet corrige ce défaut sans rétablir le
            calendrier — il signale, il n'écrit pas. */}
        {signaux.length ? (
          <section className={styles.carnet}>
            <h2>{t("Ce qui attend d'être écrit")}</h2>
            <p className={styles.carnetDit}>
              {t("L'outil signale qu'il y a de quoi écrire ; il n'écrit pas la note, ne la date pas, et ne la propose à aucun client. Le desk décide.")}
            </p>
            <ul className={styles.lignes}>
              {signaux.map((s, i) => (
                <li key={`${s.pays}-${s.genre}-${i}`}>
                  <Link href={`/desk/budgets/${slugDuPays(s.pays)}`}>
                    {s.pays} {s.exercice}
                  </Link>
                  <span className={styles.dit}>{t(DIT[s.genre], trousDe(s.params, fmtDate))}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className={styles.cartes}>
          {liste.map((b) => {
            const titres = porteDesTitres(b);
            const part = partDesTitres(b);
            const mot = MOT_DU_MILLESIME[b.millesime];
            const n = notesDe(notes, b.pays, b.exercice);
            const derniere = n[0];
            return (
              <article key={b.pays} className={styles.carte}>
                <div className={styles.carteTete}>
                  <Link href={`/desk/budgets/${slugDuPays(b.pays)}`} className={styles.nom}>
                    {b.pays}
                  </Link>
                  <span className={`${styles.jeton} ${styles[TON[b.millesime]]}`}>{t(mot)}</span>
                </div>
                <p className={styles.loi}>
                  {b.loi}
                  {b.promulgueeLe ? ` · ${fmtDate(b.promulgueeLe)}` : ""}
                </p>

                <dl className={styles.chiffres}>
                  <div>
                    <dt>{t("Budget")}</dt>
                    <dd>{enMilliards(b.budgetTotal)}</dd>
                  </div>
                  <div>
                    <dt>{t("Besoin")}</dt>
                    <dd>{enMilliards(b.besoinDeFinancement)}</dd>
                  </div>
                  <div className={titres ? styles.titres : undefined}>
                    <dt>{t("Titres publics")}</dt>
                    <dd>
                      {enMilliards(titres?.montant)}
                      {part !== undefined ? <small> · {Math.round(part * 100)} %</small> : null}
                    </dd>
                  </div>
                </dl>

                {estComplet(b) ? null : (
                  <p className={styles.manque}>
                    {t("Relevé incomplet")} · {b.aRelever?.length ?? 0} {t("point(s) nommé(s) sur la fiche")}
                  </p>
                )}

                <p className={styles.note}>
                  {derniere ? (
                    <>
                      {t("Dernière note")} · n° {derniere.numero} · {fmtDate(derniere.closeLe)}
                    </>
                  ) : (
                    t("Aucune note écrite")
                  )}
                </p>
              </article>
            );
          })}
        </div>

        {/* TOUTES LES PIÈCES, POUR QU'ON PUISSE LES SUIVRE. Elles vivaient
            chacune dans sa fiche : consignées, donc, mais introuvables
            ensemble. Un lien pourrit en silence, et on ne s'en aperçoit qu'en
            le suivant — encore faut-il savoir lesquels on détient. */}
        <section className={styles.dossier}>
          <h2>{t("Les pièces du dossier")}</h2>
          <p className={styles.carnetDit}>
            {t("Tout ce sur quoi ces fiches et ces notes s'appuient, avec le jour où chaque adresse a été ouverte. Celles qui n'en ont pas encore viennent en premier : ce sont celles qu'il reste à trouver.")}{" "}
            {sansLien > 0 ? (
              <b>
                {sansLien} {t("sans adresse à ce jour.")}
              </b>
            ) : null}
          </p>
          <table className={styles.tableauPieces}>
            <thead>
              <tr>
                <th>{t("La pièce")}</th>
                <th>{t("Où elle sert")}</th>
                <th>{t("Ouverte le")}</th>
              </tr>
            </thead>
            <tbody>
              {pieces.map((x) => (
                <tr key={`${x.piece.editeur}-${x.piece.titre}`} className={x.piece.url ? undefined : styles.aTrouver}>
                  <td>
                    {x.piece.url ? (
                      <a href={x.piece.url} target="_blank" rel="noreferrer noopener">
                        {x.piece.titre}
                      </a>
                    ) : (
                      <span>{x.piece.titre}</span>
                    )}
                    <small>
                      {x.piece.editeur}
                      {x.piece.date ? ` · ${x.piece.date}` : ""}
                    </small>
                  </td>
                  <td>
                    {x.zone ? t("toute la zone") : x.pays.length === budgets.length ? t("les six États") : x.pays.length ? x.pays.join(", ") : t("État non rattaché")}
                    {x.notes.length ? (
                      <small>
                        {x.notes.length} {t("note(s) s'y appuient")}
                      </small>
                    ) : null}
                  </td>
                  <td className={styles.quand}>{x.piece.verifieLe ? fmtDate(x.piece.verifieLe) : t("jamais ouverte")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <p className={styles.refus}>
          <b>{t("Pas de ligne « CEMAC ».")}</b>{" "}
          {t(
            "Six millésimes différents, dont plusieurs révisés et plusieurs inconnus : les additionner donnerait un chiffre faux d'une précision rassurante. C'est le même refus que la page de la dette, qui montre deux colonnes et pas un total.",
          )}
        </p>
      </main>
    </>
  );
}
