"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";
import { Sheet } from "@/components/mobile/Sheet";
import { anneesDe, bouge, casesParMois, ordonner, type CoupleFrise } from "@/lib/market/frise";
import styles from "./comparateur.module.css";

/**
 * LA FRISE : QUATRE ANNÉES DE SÉANCES EN QUARANTE-HUIT CASES.
 *
 * Le comparateur savait tout faire sauf dire OÙ REGARDER. Huit cents séances,
 * deux listes déroulantes, et aucune raison de choisir un couple plutôt qu'un
 * autre : on ouvrait les deux dernières, on constatait que rien n'avait bougé,
 * et on refermait. L'outil ne servait qu'à ceux qui savaient déjà.
 *
 * LE CHIFFRE EST UNE MESURE, PAS UN RACCOURCI. Il compte les séances du mois
 * où une ligne entre ou sort de la cote, par différence exacte des ensembles
 * d'ISIN. Le raccourci d'avant — « le bulletin compte une action de moins » —
 * a été mesuré puis retiré : sur 806 couples il en désignait 40, dont 6 sans
 * aucun mouvement, et en ratait 40 autres. Moins d'une fois sur deux.
 *
 * LA MARQUE NE DIT PAS LA MÊME CHOSE QUE LE CHIFFRE, et c'est tout l'objet de
 * la frise. Un mouvement est un fait de marché : une ligne entre, une ligne
 * sort, c'est la vie de la cote. Une séance à relire est un défaut CHEZ NOUS.
 * Les mêler sous une seule couleur, c'est l'erreur que « passagère » et
 * « définitive » ont déjà corrigée une fois sur les départs.
 *
 * Elle ne porte pas les incohérences des cinq contrôles, et c'est délibéré :
 * les juger sur huit cents couples demanderait de relire toute la cote à
 * chaque ouverture de page, et les réécrire en SQL ferait vivre la même règle
 * à deux endroits — la manière habituelle de les laisser dériver. La marque
 * vient donc du lecteur lui-même, qui a déjà dit ce qu'il n'a pas su lire.
 */

const MOIS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/**
 * UN GABARIT À DEUX TROUS, et non la fonction qui construit le lien : une
 * fonction ne traverse pas la frontière du serveur vers le client, et
 * TypeScript ne le dit pas — c'est React qui refuse à l'exécution. Le choix
 * d'une séance avait déjà résolu cela avec un trou ; il en faut deux ici,
 * puisqu'une case de la frise pose les deux dates d'un coup.
 */
export function Frise({ couples, courant, gabaritCouple }: { couples: CoupleFrise[] | undefined; courant: string; gabaritCouple: string }) {
  const t = useT();
  const router = useRouter();
  const [mois, setMois] = useState<string | null>(null);

  const annees = anneesDe(couples ?? []);
  const par = casesParMois(couples ?? []);
  const duMois = (mois && par.get(mois)?.couples) || [];
  const ordonnees = ordonner(duMois);

  /* DOUZE APPELS LITTÉRAUX, et non « t(tableau[i]) » : le scanner de clefs ne
     voit que ce qui est écrit en toutes lettres dans la source, et une clef
     qu'il ne voit pas n'existe pas en anglais. C'est le premier des trois
     angles morts connus. */
  const NOMS = [t("janvier"), t("février"), t("mars"), t("avril"), t("mai"), t("juin"), t("juillet"), t("août"), t("septembre"), t("octobre"), t("novembre"), t("décembre")];
  const titre = (k: string) => {
    const [an, m] = k.split("-");
    return `${NOMS[Number(m) - 1]} ${an}`;
  };

  /* UNE MESURE QUI MANQUE SE DIT. Une grille vide se lirait « rien n'a jamais
     bougé », qui est un énoncé, et faux. Le silence sur une panne est la
     famille de défauts la plus coûteuse de ce projet. */
  if (!couples) return <p className={styles.friseAbsente}>{t("Le relevé des mouvements n'a pas pu être lu : la frise ne montre donc rien, ce qui n'est pas la même chose qu'un marché immobile. Les deux listes de dates restent utilisables.")}</p>;

  return (
    <div className={styles.frise}>
      <div className={styles.friseGrille}>
        <span />
        {MOIS.map((m, i) => (
          <span key={i} className={styles.friseMois} aria-hidden="true">
            {m}
          </span>
        ))}
        {/* « display: contents » : l'année groupe ses douze cases dans la
            source sans rompre la grille, qui doit rester d'un seul tenant pour
            que les colonnes s'alignent d'une année à l'autre. */}
        {annees.map((an) => (
          <div key={an} style={{ display: "contents" }}>
            <span className={styles.friseAn}>{an}</span>
            {MOIS.map((_, i) => {
              const k = `${an}-${String(i + 1).padStart(2, "0")}`;
              const cs = par.get(k);
              if (!cs) return <span key={k} className={styles.friseVide} aria-hidden="true" />;
              const { mouvements: n, aRelire: relire } = cs;
              return (
                <button
                  key={k}
                  type="button"
                  className={`${styles.friseCase} ${n ? styles.friseBouge : ""} ${k === courant.slice(0, 7) ? styles.friseIci : ""}`}
                  onClick={() => setMois(k)}
                  aria-label={t("{mois} : {n} séance(s) où une ligne entre ou sort, {r} à relire, sur {s}", { mois: titre(k), n, r: relire, s: cs.seances })}
                >
                  {n ? n : <span className={styles.friseCalme}>·</span>}
                  {relire ? <span className={styles.friseRelire} aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <p className={styles.friseLegende}>
        {t("Le chiffre : les séances du mois où une ligne entre ou sort de la cote, par différence exacte des deux cotes. Le coin marqué : des séances sur lesquelles le lecteur a laissé une remarque. Un mouvement est un fait de marché, une remarque est un défaut chez nous.")}
      </p>

      <Sheet open={mois !== null} onClose={() => setMois(null)} title={mois ? titre(mois) : ""} sub={t("{n} séance(s), {b} avec un mouvement", { n: duMois.length, b: duMois.filter(bouge).length })}>
        <div className={styles.feuille}>
          {ordonnees.map((c) => (
            <button
              key={c.d}
              type="button"
              className={styles.feuilleLigne}
              onClick={() => {
                setMois(null);
                router.push(gabaritCouple.replace("__A__", c.p).replace("__B__", c.d));
              }}
            >
              <span className="mono">{c.d}</span>
              <span className={styles.feuilleQuoi}>
                {/* Les deux sens se disent séparément : trois parties et trois
                    arrivées ne font pas un mois calme. */}
                {c.s ? <b className={styles.baisse}>{t("−{n} partie(s)", { n: c.s })}</b> : null}
                {c.a ? <b className={styles.hausse}>{t("+{n} arrivée(s)", { n: c.a })}</b> : null}
                {bouge(c) ? null : <small>{t("aucun mouvement")}</small>}
              </span>
              {c.r ? <span className={styles.feuilleRelire}>{t("à relire")}</span> : <span />}
              <span className={styles.feuilleVa} aria-hidden="true">
                ›
              </span>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
