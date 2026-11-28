"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useT } from "@/i18n/client";
import { cleDeLaPhrase, type EnClair } from "@/lib/domain/en-clair";
import { GAGNER, PHRASE, RECUPERER, RISQUER, TITRES_DES_CURSEURS } from "@/lib/domain/en-clair-textes";
import styles from "./EnClair.module.css";

/**
 * « EN CLAIR », LES TROIS CURSEURS DE LA PRÉSENTATION, DANS LA CARTE ET DANS LA FICHE (28 novembre 2026).
 * La phrase dit ce qu'on fait en achetant ; les trois lignes disent ce qu'on peut gagner, quand on récupère son argent, ce qui peut mal tourner. Les mots sont dans `en-clair-textes.ts`.
 */
export function PhraseEnClair({ e }: { e: EnClair }) {
  const t = useT();
  return (
    <p className={styles.phrase}>
      <b>{t(TITRES_DES_CURSEURS.enClair)}</b> {t(PHRASE[cleDeLaPhrase(e)], e.params)}
    </p>
  );
}

/** Un titre à plat, et ce qu'il range : l'écart du titre à son contenu est celui de la maison (`--titre-gap`). */
export function Curseur({ titre, children }: { titre: string; children: ReactNode }) {
  const t = useT();
  return (
    <section className={styles.curseur}>
      <h4>{t(titre)}</h4>
      {children}
    </section>
  );
}

export function TexteDuCurseur({ e, curseur }: { e: EnClair; curseur: "gagner" | "recuperer" | "risquer" }) {
  const t = useT();
  const table = curseur === "gagner" ? GAGNER : curseur === "recuperer" ? RECUPERER : RISQUER;
  return <p className={styles.texte}>{t(table[e.famille])}</p>;
}

/** Le lien vers le texte opposable : un seul, au pied du curseur du risque. */
export function LienDesRisques() {
  const t = useT();
  return (
    <Link className={styles.lien} href="/info/risques">
      {t(TITRES_DES_CURSEURS.risques)} →
    </Link>
  );
}

/** « EN BREF » EN TÊTE DE FICHE : trois lignes, une par curseur, sans rien retirer à la fiche. */
export function EnBrefDeLaFiche({ e }: { e: EnClair }) {
  const t = useT();
  const lignes = [
    ["gagner", TITRES_DES_CURSEURS.gagner, GAGNER[e.famille]],
    ["recuperer", TITRES_DES_CURSEURS.recuperer, RECUPERER[e.famille]],
    ["risquer", TITRES_DES_CURSEURS.risquer, RISQUER[e.famille]],
  ] as const;
  return (
    <section className={styles.enBref} aria-label={t("En bref")}>
      <PhraseEnClair e={e} />
      <dl>
        {lignes.map(([cle, titre, texte]) => (
          <div key={cle}>
            <dt>{t(titre)}</dt>
            <dd>{t(texte)}</dd>
          </div>
        ))}
      </dl>
      <LienDesRisques />
    </section>
  );
}
