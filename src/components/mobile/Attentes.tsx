"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { lireLeBrouillon, poserLeBrouillon, reprendre, SIGNAL } from "@/lib/brouillon";
import { useT } from "@/i18n/client";
import type { Attente } from "@/lib/domain/services";
import styles from "./BarreDuCompte.module.css";

/**
 * CE QUI ATTEND LE CLIENT, EN UNE PIÈCE, POUR LES DEUX PORTES.
 *
 * Elle vivait dans le panneau de la cloche (« BarreDuCompte »). Depuis le 31
 * octobre 2026 la cloche du téléphone est devenue la ligne « Ce qui
 * m'attend » du menu à trois barres, et la colonne du grand écran garde la
 * sienne : deux endroits déroulent la même liste, et une liste écrite deux
 * fois finit par ne plus dire la même chose.
 */
export function useBrouillon() {
  /**
   * L'ORDRE COMMENCÉ ET NON ENVOYÉ COMPTE PARMI CE QUI ATTEND.
   *
   * Demandé le 28 octobre 2026, « sans date limite ». Il vient de l'appareil
   * et non du serveur — rien n'a été envoyé, le desk n'en sait rien — donc il
   * se lit ici, à côté des attentes qui, elles, viennent du dossier.
   *
   * L'INSTANTANÉ EST LA CHAÎNE BRUTE, et non l'objet : « useSyncExternalStore »
   * compare ce qu'on lui rend, et deux objets égaux ne sont jamais le même ;
   * rendre l'objet ferait une boucle de rendu.
   */
  const brut = useSyncExternalStore(
    (prevenir) => {
      window.addEventListener(SIGNAL, prevenir);
      window.addEventListener("storage", prevenir);
      return () => {
        window.removeEventListener(SIGNAL, prevenir);
        window.removeEventListener("storage", prevenir);
      };
    },
    () => {
      try {
        return localStorage.getItem("guichet:brouillon") ?? "";
      } catch {
        return "";
      }
    },
    () => "",
  );
  return useMemo(() => (brut ? lireLeBrouillon() : null), [brut]);
}

export function ListeAttentes({ attentes, brouillon, fermer }: { attentes: Attente[]; brouillon: ReturnType<typeof useBrouillon>; fermer: () => void }) {
  const t = useT();
  const [choisie, setChoisie] = useState<string | null>(attentes[0]?.cle ?? null);
  return (
    <>
      {/* LE BROUILLON EN TÊTE, et avec SA propre issue.
          Les attentes du dossier renvoient leur seconde issue à la
          page où la décision se prend — on ne retire pas un ordre
          depuis un panneau de trois cents pixels, à un doigt de
          « Signer ». Un brouillon n'est pas cela : rien n'est parti,
          le desk ne tient rien, et le jeter ne coûte que la frappe
          qu'on recommencera. Il s'abandonne donc ici, d'un bouton. */}
      {brouillon && (
        <div className={styles.att} data-ton="annonce">
          <button type="button" className={styles.attTete} aria-expanded={choisie === "brouillon"} onClick={() => setChoisie(choisie === "brouillon" ? null : "brouillon")}>
            <span className={styles.attQuand}>{t("Un ordre commencé")}</span>
            <span className={styles.attChiffre}>{brouillon.montant}</span>
            <svg className={styles.attChev} viewBox="0 0 24 24" aria-hidden="true" data-ouvert={choisie === "brouillon" ? "oui" : undefined}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {choisie === "brouillon" && (
            <div className={styles.attCorps}>
              <p>{t("Sur {l}. Vous ne l'avez pas envoyé : il vous attend tant que vous ne le reprenez pas ou ne l'abandonnez pas.", { l: brouillon.titre })}</p>
              <Link className={styles.attGeste} href={reprendre(brouillon)} onClick={() => fermer()}>
                {t("Reprendre")}
              </Link>
              <button type="button" className={styles.attSortie} onClick={() => poserLeBrouillon(null)}>
                {t("Abandonner")}
              </button>
            </div>
          )}
        </div>
      )}
      {attentes.map((a) => {
        const deploye = choisie === a.cle;
        return (
          <div key={a.cle} className={styles.att} data-ton={a.ton}>
            <button type="button" className={styles.attTete} aria-expanded={deploye} onClick={() => setChoisie(deploye ? null : a.cle)}>
              <span className={styles.attQuand}>{t(a.quand.key, a.quand.params)}</span>
              <span className={styles.attChiffre}>{typeof a.chiffre === "string" ? a.chiffre : t(a.chiffre.key, a.chiffre.params)}</span>
              <svg className={styles.attChev} viewBox="0 0 24 24" aria-hidden="true" data-ouvert={deploye ? "oui" : undefined}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {deploye && (
              <div className={styles.attCorps}>
                <p>{t(a.quoi.key, a.quoi.params)}</p>
                <Link className={styles.attGeste} href={a.href} onClick={() => fermer()}>
                  {t(a.geste)}
                </Link>
                {/* LES DEUX ISSUES, ET AUCUNE NE SE JOUE ICI.
                    La pastille portait un « ne plus me le rappeler »,
                    et c'était une troisième issue qui n'en est pas
                    une : le panier restait plein, le desk gardait un
                    ordre fantôme au carnet, et au bout de cinq jours
                    ouvrés l'ordre non réglé devenait un manquement
                    inscrit à la tenue du client. Faire taire le
                    rappel, c'était le laisser glisser vers la
                    sanction en silence.
                    Le second lien renvoie donc à la page de l'ordre,
                    à l'ancre où la question se pose, et non à une
                    action qui se jouerait dans un panneau de trois
                    cents pixels à un doigt de « Signer ». On y
                    retourne pour finir, ou on y retourne pour
                    renoncer. */}
                {a.sortie && (
                  <Link className={styles.attSortie} href={a.sortie.href} onClick={() => fermer()}>
                    {t(a.sortie.geste)}
                  </Link>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
