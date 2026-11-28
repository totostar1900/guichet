"use client";

import Link from "next/link";
import { useState } from "react";
import { useDates, useT } from "@/i18n/client";
import { cleDeLaPhrase, type EnClair } from "@/lib/domain/en-clair";
import { CHIFFRES, GAGNER, PHRASE, RECUPERER, RISQUER, TITRES_DES_CURSEURS } from "@/lib/domain/en-clair-textes";
import { Sheet } from "./mobile/Sheet";
import styles from "./EnClair.module.css";

/**
 * « EN CLAIR », UNE FENÊTRE (28 novembre 2026, le client : « la page en clair sera un popup avec sa croix et sa fermeture avec glissement bas, dans la tuile et dans la fiche ; dynamique, adaptée à la
 * ligne ; elle ne doit pas changer, bousculer ou déplacer le contenu actuel mais se rajouter de manière ordonnée »).
 *
 * Elle S'AJOUTE, elle ne s'insère pas : un bouton dans la rangée de l'extension d'une carte, un onglet à la fin de la bande de la fiche (et un bouton à côté de « Fiche PDF » sur grand écran, où la bande n'est pas
 * montrée). Rien d'autre ne bouge dans la page. La fenêtre est celle de la maison (centrée, croix, tirée vers le bas pour fermer) et lit la ligne : la phrase, les trois curseurs, puis les chiffres de CETTE ligne
 * avec leurs valeurs.
 */
function Contenu({ e, titre }: { e: EnClair; titre: string }) {
  const t = useT();
  const { fmtDate } = useDates();
  /* Les dates arrivent en ISO : elles se disent dans la langue du lecteur. */
  const mots = (p: Record<string, string>) => (p.date ? { ...p, date: fmtDate(p.date, true) } : p);
  const lignes = [
    ["gagner", TITRES_DES_CURSEURS.gagner, GAGNER[e.famille]],
    ["recuperer", TITRES_DES_CURSEURS.recuperer, RECUPERER[e.famille]],
    ["risquer", TITRES_DES_CURSEURS.risquer, RISQUER[e.famille]],
  ] as const;
  return (
    <div className={styles.fenetre}>
      <p className={styles.ligneDeTitre}>{titre}</p>
      <p className={styles.phrase}>{t(PHRASE[cleDeLaPhrase(e)], e.params)}</p>
      <dl className={styles.curseurs}>
        {lignes.map(([cle, intitule, texte]) => (
          <div key={cle}>
            <dt>{t(intitule)}</dt>
            <dd>{t(texte)}</dd>
          </div>
        ))}
      </dl>
      {e.chiffres.length > 0 && (
        <section className={styles.chiffres} aria-label={t(TITRES_DES_CURSEURS.chiffres)}>
          <h3>{t(TITRES_DES_CURSEURS.chiffres)}</h3>
          <ul>
            {e.chiffres.map((c) => (
              <li key={c.cle}>
                <b>{t(CHIFFRES[c.cle].titre, mots(c.params))}</b>
                <span>{t(CHIFFRES[c.cle].texte, mots(c.params))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Link className={styles.lien} href="/info/risques">
        {t(TITRES_DES_CURSEURS.risques)} →
      </Link>
      <p className={styles.mention}>{t("Explication pédagogique : ni conseil, ni promesse de rendement.")}</p>
    </div>
  );
}

/** Le bouton et sa fenêtre. `className` : la forme du bouton là où il se pose (rangée de l'extension, bande de la fiche, entête). */
export function EnClairBouton({ e, titre, className }: { e: EnClair; /** Le nom de la ligne, rappelé en tête de la fenêtre. */ titre: string; className?: string }) {
  const t = useT();
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOuvert(true)} aria-haspopup="dialog" data-coach="en-clair">
        {t("En clair")}
      </button>
      <Sheet open={ouvert} onClose={() => setOuvert(false)} title={t("En clair")} centre>
        <Contenu e={e} titre={titre} />
      </Sheet>
    </>
  );
}
