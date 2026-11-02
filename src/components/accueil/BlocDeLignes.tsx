import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { PastilleEtat } from "@/components/PastilleEtat";
import { PastilleVariation } from "@/components/PastilleVariation";
import { TitreDeBloc } from "@/components/TitreDeBloc";
import { getT } from "@/i18n/server";
import type { TonDEtat } from "@/lib/domain/accueil";
import type { Offer } from "@/lib/domain/types";
import { summarize } from "@/lib/domain/summary";
import { joursEnMots } from "@/lib/domain/echeances";
import { fmtDate } from "@/lib/format";
import { joursRestants } from "@/lib/domain/accueil";
import { variationAffichee, variationsDesActions } from "@/lib/market/variations";
import styles from "./BlocDeLignes.module.css";

/**
 * UNE LIGNE D'UN BLOC : TOUTE LA RANGÉE EST UN LIEN VERS SA FICHE (2 novembre 2026).
 *
 * La rangée dit l'essentiel sans qu'on l'ouvre : le nom (jusqu'à deux lignes, jamais
 * tronqué sur une seule), sa méta (l'émetteur, l'échéance), à droite le chiffre de
 * tête avec SON LIBELLÉ dessous — un chiffre sans libellé ne se lit pas — et, quand
 * la maison la connaît, la variation ou l'état.
 */
export interface LigneDeBloc {
  id: string;
  href: string;
  offre: Pick<Offer, "issuer" | "country" | "title">;
  nom: string;
  meta?: string;
  valeur: string;
  libelle?: string;
  variation?: { v: number; titre: string };
  etat?: { texte: string; ton: TonDEtat };
}

/** Les lignes d'un bloc, tirées des offres déjà en main : les mêmes mots et les mêmes chiffres que la fiche et la liste. */
export async function lignesDeBloc(offres: Offer[], mode: "cote" | "fonds" | "adjudications" | "prevues", now = new Date()): Promise<LigneDeBloc[]> {
  const t = await getT();
  const actions = mode === "cote" ? await variationsDesActions(offres) : new Map();
  return offres.map((o) => {
    const s = summarize(o, now);
    const base: LigneDeBloc = { id: o.id, href: `/offres/${o.id}`, offre: o, nom: t(o.title), meta: t(s.subtitle), valeur: s.hero, libelle: s.heroUnit ? t(s.heroUnit) : undefined };
    if (mode === "adjudications") {
      const j = joursRestants(o.deadlineAt, now);
      const q = joursEnMots(j);
      return { ...base, etat: { texte: t(q.key, q.params), ton: j <= 7 ? "attention" : "neutre" } };
    }
    if (mode === "prevues") return { ...base, etat: { texte: t("ouvre le {d}", { d: fmtDate(o.opensAt.slice(0, 10), false) }), ton: "neutre" } };
    return { ...base, variation: variationAffichee(o, actions, t) };
  });
}

/**
 * UN BLOC : UN TITRE QUI MÈNE À LA LISTE, DES RANGÉES QUI MÈNENT AUX FICHES.
 *
 * Le conteneur n'est PAS un lien : un lien ne peut pas en contenir d'autres. Le titre
 * (avec « Tout voir ») est le lien vers la liste complète, chaque rangée est son
 * propre lien, et la cible d'une rangée fait au moins 64 px de haut.
 */
export async function BlocDeLignes({ id, titre, href, tout, lignes }: { id: string; titre: string; href: string; tout?: string; lignes: LigneDeBloc[] }) {
  if (!lignes.length) return null;
  return (
    <section className={styles.bloc} aria-labelledby={id}>
      <TitreDeBloc id={id} titre={titre} href={href} tout={tout} />
      <ul className={styles.carte}>
        {lignes.map((l) => (
          <li key={l.id}>
            <Link href={l.href} className={styles.ligne}>
              <Avatar offre={l.offre} />
              <span className={styles.qui}>
                <b>{l.nom}</b>
                {l.meta && <small>{l.meta}</small>}
              </span>
              <span className={styles.quoi}>
                <b>{l.valeur}</b>
                {l.libelle && <small>{l.libelle}</small>}
                {l.variation && <PastilleVariation v={l.variation.v} titre={l.variation.titre} />}
                {l.etat && <PastilleEtat ton={l.etat.ton}>{l.etat.texte}</PastilleEtat>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Pour tests de lecture : le nombre de lignes qu'un bloc montre au plus. */
export const NB_LIGNES_PAR_BLOC = 3;
