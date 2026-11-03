import Link from "next/link";
import { gabaritDeSondage, limitesDeSondage } from "@/lib/domain/gabarit";
import { prete } from "@/lib/domain/sondage";
import type { LigneSondee } from "@/lib/domain/types";
import { fmt, fmtDate } from "@/lib/format";
import styles from "./page.module.css";

type T = (s: string, v?: Record<string, string>) => string;

/**
 * UNE RANGÉE DU SONDAGE, ÉCRITE UNE FOIS POUR LES DEUX LISTES (3 novembre 2026).
 *
 * DEMANDÉ : « la page sondage ne permet pas d'atterrir sur le détail du sondage. Revoir le design de
 * cette page. » Toute la rangée est un lien vers « /sondage?ligne=<id> », comme sur l'Accueil : le
 * gabarit « OTA 5 ans • CMR », dessous l'état et les limites en bleu, à droite le montant en or.
 * « Modifier » et « Retirer » ne sont plus dans la liste : ils vivent dans le détail.
 *
 * LE RÔLE NE CHANGE QUE LE SENS DU NIVEAU : la maison dit un niveau INDICATIF (« ind. »), le client pose
 * une limite — un coupon ou un taux MINIMUM, un prix MAXIMUM. Les confondre porterait au Trésor un chiffre
 * que personne n'a dit. Le rendement qui découle d'un prix n'est qu'un équivalent : gris, entre parenthèses.
 *
 * LA QUESTION NE PORTE PAS DE MONTANT, et c'est voulu : « 500 M FCFA » écrit sur la question DONNE LA
 * RÉPONSE AVANT DE POSER LA QUESTION. Le montant cherché reste au desk.
 *
 * ET LA DATE NE PROMET PLUS DE SÉANCE : « prête vers » dit la date sans la promesse, car la maison
 * n'adjuge pas et le sondage ne suit aucun calendrier annoncé.
 */
export function RangeeDeSondage({ l, role, etat, t }: { l: LigneSondee; role: "question" | "attente"; etat: { mot: string; ton: "bon" | "attention" | "neutre" }; t: T }) {
  const lim = limitesDeSondage(l);
  const j = prete(l);
  const mot = (m: string) => (role === "question" ? "ind." : t(m));
  return (
    <Link href={`/sondage?ligne=${l.id}`} className={styles.rang}>
      <span className={styles.qui}>
        <b>{gabaritDeSondage(l)}</b>
        <small>
          <span className={styles.etat} data-ton={etat.ton}>
            {t(etat.mot)}
          </span>
          {lim.niveau && (
            <>
              {" • "}
              <span className={`${styles.bleu} ${styles.groupe}`}>
                {t(lim.niveau.mot)} {mot("min")} {lim.niveau.valeur}
              </span>
            </>
          )}
          {lim.prix && (
            <>
              {" • "}
              <span className={`${styles.bleu} ${styles.groupe}`}>
                {t("prix")} {mot("max")} {lim.prix.valeur}
                {lim.rendement && <span className={styles.gris}> (≈ {lim.rendement.valeur})</span>}
              </span>
            </>
          )}
          {j && (
            <>
              {" • "}
              <span className={styles.groupe}>
                {t("prête vers")} {fmtDate(j, false)}
              </span>
            </>
          )}
        </small>
      </span>
      {role === "attente" && (
        <span className={styles.montant}>
          <b>
            {fmt(l.montant)}
            <i className={styles.unite}>FCFA</i>
          </b>
        </span>
      )}
      <svg className={styles.chev} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
