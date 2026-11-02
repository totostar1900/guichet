import Link from "next/link";
import { getT } from "@/i18n/server";
import { joursEnMots } from "@/lib/domain/echeances";
import { PastilleVariation } from "@/components/PastilleVariation";
import { fondsOuverts, joursRestants, lignesActives, seancesOuvertes, seancesPrevues, variationDe } from "@/lib/domain/accueil";
import { summarize } from "@/lib/domain/summary";
import type { Offer } from "@/lib/domain/types";
import { INSTRUMENTS_PAGES } from "@/lib/nav-groups";
import { fmtDate } from "@/lib/format";
import styles from "./GrilleInvestir.module.css";

/**
 * « INVESTIR » : TROIS ENTRÉES QUI MONTRENT CE QU'ELLES CONTIENNENT, ET LA PORTE DU RESTE.
 *
 * Titres, Fonds et Adjudications étaient trois bandes neutres — un nom, une
 * phrase fixe, un chevron — qui disaient la même chose les jours où tout bougeait
 * et ceux où rien ne bougeait. Chacune porte désormais UNE LIGNE EN TÊTE et deux
 * lignes de choix, tirées des offres que la page a déjà : aucune lecture de plus.
 *
 * AUCUN NOMBRE DE LIGNES. L'arbitrage du 29 octobre 2026 vaut ici comme
 * ailleurs : un intitulé qui annonce son inventaire parle de la maison, pas du
 * lecteur. Ce que la tuile dit, c'est ce qui presse (une clôture), ou ce qui
 * vient de se passer (la dernière séance).
 *
 * LA QUATRIÈME PLACE EST DYNAMIQUE, ET C'EST LE CLIENT QUI LA REMPLIT.
 *  — des séances sont annoncées mais pas encore ouvertes : la place porte deux
 *    tuiles, « Prochaines adjudications » et, plus petite, l'invitation à en
 *    proposer une soi-même ;
 *  — il n'y en a pas : l'invitation prend toute la place. Une tuile « prochaines
 *    séances » qui dirait « rien » apprendrait à l'œil à sauter cet endroit.
 * Proposer, c'est le sondage : la ligne que le client pousse lui-même, avant
 * qu'il y ait quoi que ce soit à prendre.
 *
 * LE PIED MÈNE AU CATALOGUE ENTIER. « Vos services » n'est plus une tuile du bas
 * de page : c'est un bouton sous les entrées, au niveau d'« Investir ».
 */
export async function GrilleInvestir({ offres }: { offres: Offer[] }) {
  const t = await getT();
  const now = new Date();
  const ouvertes = seancesOuvertes(offres, now);
  const cote = lignesActives(offres, now);
  const fonds = fondsOuverts(offres);
  const prevues = seancesPrevues(offres, now, 3);
  const page = (cle: string) => INSTRUMENTS_PAGES.find((p) => p.key === cle)!;

  type Ligne = { id: string; nom: string; valeur: string; variation?: number };
  const ligne = (o: Offer): Ligne => {
    const s = summarize(o, now);
    return { id: o.id, nom: t(o.title), valeur: s.hero, variation: variationDe(o) };
  };
  const tuile = (cle: "titres" | "fonds" | "calendrier", liste: Offer[], tete: (o: Offer) => { texte: string; ton?: "urgent" | "calme" }) => {
    const p = page(cle);
    const premiere = liste[0];
    const lead = premiere ? tete(premiere) : undefined;
    return (
      <Link key={cle} href={p.href} className={styles.tuile}>
        <span className={styles.haut}>
          <b>{t(p.label)}</b>
          <svg className={styles.chev} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>
        {premiere && lead ? (
          <>
            <span className={`${styles.tete} ${lead.ton === "urgent" ? styles.urgent : ""}`}>
              <b>{t(premiere.title)}</b>
              <small>{lead.texte}</small>
            </span>
            {liste.slice(1, 3).map((o) => {
              const l = ligne(o);
              return (
                <span key={l.id} className={styles.ligne}>
                  <b>{l.nom}</b>
                  <small>{l.valeur}</small>
                  <PastilleVariation v={l.variation} titre={t("Variation de la dernière valeur liquidative")} />
                </span>
              );
            })}
          </>
        ) : (
          <small className={styles.hint}>{t(p.hint)}</small>
        )}
      </Link>
    );
  };

  return (
    <section className={`${styles.bloc}`} aria-label={t("Investir")}>
      <span className="eyebrow">{t("Investir")}</span>
      <div className="pile-tuiles">
        <div className={styles.grille}>
          {tuile("titres", cote, (o) => ({ texte: o.lastTradedOn ? t("dernière séance le {d}", { d: fmtDate(o.lastTradedOn, false) }) : t(summarize(o, now).status) }))}
          {tuile("fonds", fonds, (o) => ({ texte: t(summarize(o, now).status) }))}
          {tuile("calendrier", ouvertes, (o) => {
            const q = joursEnMots(joursRestants(o.deadlineAt, now));
            return { texte: t(q.key, q.params), ton: joursRestants(o.deadlineAt, now) <= 7 ? "urgent" : "calme" };
          })}
          <div className={styles.place}>
            {prevues.length > 0 && (
              <Link href="/calendrier" className={`${styles.tuile} ${styles.prevues}`}>
                <span className={styles.haut}>
                  <b>{t("Prochaines adjudications")}</b>
                  <svg className={styles.chev} viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </span>
                {prevues.map((o) => (
                  <span key={o.id} className={styles.ligne}>
                    <b>{t(o.title)}</b>
                    <small>{t("ouvre le {d}", { d: fmtDate(o.opensAt.slice(0, 10), false) })}</small>
                  </span>
                ))}
              </Link>
            )}
            <Link href="/sondage" className={`${styles.tuile} ${styles.proposer}`}>
              <span className={styles.haut}>
                <b>{t("Proposer une adjudication")}</b>
                <svg className={styles.plus} viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <small className={styles.hint}>{t("Ce que vous prendriez, avant qu'une séance ouvre")}</small>
            </Link>
          </div>
        </div>
        <Link href="/trader" className={styles.tous}>
          {t("Tous vos services")} →
        </Link>
      </div>
    </section>
  );
}
