"use client";

import Link from "next/link";
import { useT } from "@/i18n/client";
import { ICONE_SERVICE } from "@/components/nav/IconesServices";
import type { ServiceVu } from "@/lib/domain/services";
import styles from "./page.module.css";
import type { Apercu } from "@/lib/domain/apercus";

/**
 * CE QU'UN SERVICE DIT DE LUI-MÊME, ET DANS QUEL ORDRE.
 *
 * Quatre choses, du général au particulier, et l'ordre est la seule décision
 * qui compte ici.
 *
 *   LA RAISON. À quoi ça sert, sans un chiffre. Elle manquait, et son absence
 *   ne se voyait pas sur l'écran large où dix lignes se comparent d'un coup
 *   d'œil. Sur un téléphone, où le service occupe l'écran entier, commencer
 *   par « 50 000 FCFA partent le 5 » parle à celui qui l'a déjà et ne dit
 *   rien à celui qui ouvre la page pour savoir si ça le concerne.
 *
 *   LA PHRASE, avec ses chiffres à lui : ce que ça donne pour CE client.
 *
 *   LES ÉTAPES, qui disent ce qu'il va falloir faire. Numérotées, et c'est le
 *   seul endroit de la maison où un numéro est légitime : il y a une vraie
 *   séquence, chaque étape attend la précédente.
 *
 *   LE GESTE, qui emmène.
 *
 * UN SEUL COMPOSANT POUR LES DEUX ÉCRANS, et c'est tout le point de
 * l'harmonisation : le large le pose dans un pli, le téléphone lui donne une
 * page, mais ce qui se lit est le même texte dans le même ordre. Deux rendus
 * d'un même contenu finissent toujours par diverger, et c'est ainsi qu'une
 * phrase se corrige sur un écran et pas sur l'autre.
 */
export function Fiche({ sv, raison, etapes, titre, apercus }: { sv: ServiceVu; raison?: string; etapes?: string[]; titre?: boolean; apercus?: Apercu[] }) {
  const t = useT();
  return (
    <div className={styles.fiche}>
      {titre && (
        <div className={styles.ficheTete}>
          <span className={styles.ico}>{ICONE_SERVICE[sv.cle]}</span>
          <b>{t(sv.nom)}</b>
        </div>
      )}
      {raison && <p className={styles.raison}>{t(raison)}</p>}
      <p>{t(sv.phrase.key, sv.phrase.params)}</p>
      {/* Ce qu'il faut avoir d'abord, dit ici et pas dans la liste. */}
      {sv.porte && <p className={styles.porte}>{t(sv.porte.key, sv.porte.params)}</p>}
      {/* CE QUI ATTEND DERRIÈRE, et c'est le même aperçu que la tuile du
          téléphone : les deux écrans rendent la même donnée, seule la façon de
          s'y déplacer change. Vide — aucune ligne cotée, aucun fonds ouvert —
          il ne rend rien plutôt qu'une excuse. */}
      {apercus && apercus.length > 0 && (
        <ul className={styles.apercus}>
          {apercus.map((a) => (
            <li key={a.nom}>
              <em>{a.nom}</em>
              <b>{t(a.dit.key, a.dit.params)}</b>
            </li>
          ))}
        </ul>
      )}
      {etapes && (
        <ol className={styles.etapes}>
          {etapes.map((e) => (
            <li key={e}>{t(e)}</li>
          ))}
        </ol>
      )}
      <Link href={sv.href} className={styles.cta}>
        {t(sv.geste.key, sv.geste.params)}
      </Link>
    </div>
  );
}
