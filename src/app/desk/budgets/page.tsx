import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import { MOT_DU_MILLESIME, enMilliards, estComplet, notesDe, parLisibilite, partDesTitres, porteDesTitres, slugDuPays } from "@/lib/market/budget";
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
  const [budgets, notes] = await Promise.all([r.budgetsDesEtats(), r.notesBudget()]);
  const liste = parLisibilite(budgets);

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
