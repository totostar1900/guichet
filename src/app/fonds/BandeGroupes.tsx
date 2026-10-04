"use client";

import { useRef } from "react";
import { useT } from "@/i18n/client";
import { useSommaire } from "@/lib/ui/sommaire";
import styles from "@/components/SectionChips.module.css";

/**
 * LE SOMMAIRE DES GROUPES, QUI NE PARAÎT QUE SI L'ON EST GROUPÉ.
 *
 * Une liste de quarante-cinq fonds groupée par société de gestion fait treize
 * blocs et plusieurs écrans : sans sommaire, atteindre le dernier demande de
 * traverser les douze autres, et revenir au premier de tout remonter. Avec,
 * on y va. Non groupée, la liste n'a pas de blocs et la bande n'aurait rien à
 * désigner : elle n'existe alors pas, plutôt que d'exister vide.
 *
 * C'est la bande des titres, au comportement près — « useSommaire » — et à
 * l'allure près : elle emprunte ses règles plutôt que d'en écrire d'autres,
 * pour que deux sommaires de la même maison se ressemblent.
 */
export function BandeGroupes({ groupes, quoi }: { groupes: { clef: string; nom: string; n: number }[]; quoi: string }) {
  const t = useT();
  const bar = useRef<HTMLDivElement>(null);
  const { enVue, conduire } = useSommaire(
    groupes.map((g) => g.clef),
    bar,
  );
  return (
    <div ref={bar} className={styles.bar} role="group" aria-label={t(quoi)}>
      {groupes.map((g) => (
        <button key={g.clef} type="button" data-section={g.clef} aria-current={enVue === g.clef ? "true" : undefined} className={enVue === g.clef ? styles.ici : undefined} onClick={() => conduire(g.clef)}>
          {g.nom} <b>{g.n}</b>
        </button>
      ))}
    </div>
  );
}
