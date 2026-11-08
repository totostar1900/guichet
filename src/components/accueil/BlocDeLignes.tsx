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
import { cadenceDuSuivi } from "@/lib/domain/sections";
import { SwipeActions } from "@/components/mobile/SwipeActions";
import { fmtDate } from "@/lib/format";
import { coursEtRevenus, sousLigne } from "@/lib/domain/ligne-titre";
import { aUnRond, joursRestants } from "@/lib/domain/accueil";
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
  /** Une séance se rappelle chaque jour jusqu'à sa clôture, une ligne cotée se suit à chaque mouvement : la cadence du glissement. */
  cadence: "evenement" | "quotidien";
  /** Le rond (drapeau) devant le nom : les adjudications seulement. */
  rond?: boolean;
  nom: string;
  meta?: string;
  valeur: string;
  libelle?: string;
  /** Une ligne de titre : le cours en tête (le chiffre le plus visible), et sous lui ses revenus abrégés. */
  cours?: { texte: string; unite?: string };
  revenus?: { etiquette: string; texte: string; unite?: string }[];
  variation?: { v: number; titre: string; periode?: string };
  etat?: { texte: string; ton: TonDEtat };
}

/** Les lignes d'un bloc, tirées des offres déjà en main : les mêmes mots et les mêmes chiffres que la fiche et la liste. */
export async function lignesDeBloc(offres: Offer[], mode: "cote" | "fonds" | "adjudications" | "prevues", now = new Date()): Promise<LigneDeBloc[]> {
  const t = await getT();
  const actions = mode === "cote" ? await variationsDesActions(offres) : new Map();
  return offres.map((o) => {
    const s = summarize(o, now);
    const base: LigneDeBloc = { id: o.id, href: `/offres/${o.id}`, offre: o, cadence: cadenceDuSuivi(o), rond: aUnRond(o), nom: t(o.title), meta: sousLigne(o, t(s.subtitle)), valeur: s.hero, libelle: s.heroUnit ? t(s.heroUnit) : undefined };
    if (mode === "adjudications") {
      const j = joursRestants(o.deadlineAt, now);
      const q = joursEnMots(j);
      return { ...base, etat: { texte: t(q.key, q.params), ton: j <= 7 ? "attention" : "neutre" } };
    }
    if (mode === "prevues") return { ...base, etat: { texte: t("ouvre le {d}", { d: fmtDate(o.opensAt.slice(0, 10), false) }), ton: "neutre" } };
    if (mode === "cote") return { ...base, ...coursEtRevenus(o, s.hero, t), variation: variationAffichee(o, actions, t) };
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
export async function BlocDeLignes({ id, titre, href, tout, lignes, plat = false, fort = false, glisser = false }: { /** Au tiré vers la gauche, une rangée découvre « Déclarer », « Contacter » et « Suivre » ou « Alerte » (téléphone seulement), comme les cartes des listes. */ glisser?: boolean; id: string; titre: string; href: string; tout?: string; lignes: LigneDeBloc[]; /** Le titre d'une section de la fiche, pas l'étiquette en capitales de l'Accueil. */ fort?: boolean; /** À plat : les rangées sans carte autour (un filet entre deux rangées), pour une page qui n'a pas d'encadré, comme la fiche. */ plat?: boolean }) {
  if (!lignes.length) return null;
  /* Le bandeau est celui de l'Accueil (8 novembre 2026) ; la fiche, qui lit ce bloc « fort » ou « à plat », garde son titre à plat. */
  const enBandeau = !fort && !plat;
  return (
    <section className={`${styles.bloc} ${enBandeau ? styles.enBandeau : ""}`} aria-labelledby={id}>
      <TitreDeBloc id={id} titre={titre} href={href} tout={tout} fort={fort} bandeau={enBandeau} />
      <ul className={`${styles.carte} ${plat ? styles.plat : ""}`}>
        {lignes.map((l) => (
          <li key={l.id}>
            <Enveloppe glisser={glisser} id={l.id} cadence={l.cadence}>
            <Link href={l.href} className={styles.ligne}>
              {l.rond && <Avatar offre={l.offre} />}
              <span className={styles.qui}>
                <b>{l.nom}</b>
                {l.meta && <small>{l.meta}</small>}
              </span>
              <span className={styles.quoi}>
                {l.cours ? (
                  <b className={styles.cours}>
                    {l.cours.texte}
                    {l.cours.unite && <i className={styles.unite}>{l.cours.unite}</i>}
                  </b>
                ) : (
                  <b>{l.valeur}</b>
                )}
                {!l.cours && l.libelle && <small>{l.libelle}</small>}
                {l.variation && <PastilleVariation v={l.variation.v} titre={l.variation.titre} periode={l.variation.periode} />}
                {l.etat && <PastilleEtat ton={l.etat.ton}>{l.etat.texte}</PastilleEtat>}
                {l.revenus?.map((r) => (
                  <small key={r.etiquette} className={styles.revenu}>
                    {r.etiquette} <b>{r.texte}</b>
                    {r.unite && <i className={styles.unite}>{r.unite}</i>}
                  </small>
                ))}
              </span>
            </Link>
            </Enveloppe>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Pour tests de lecture : le nombre de lignes qu'un bloc montre au plus. */
export const NB_LIGNES_PAR_BLOC = 3;

/** La rangée, avec ou sans glissement : le glissement n'enveloppe que ce qui le demande. */
function Enveloppe({ glisser, id, cadence, children }: { glisser: boolean; id: string; cadence: "evenement" | "quotidien"; children: React.ReactNode }) {
  return glisser ? (
    <SwipeActions id={id} cadence={cadence} ligne>
      {children}
    </SwipeActions>
  ) : (
    <>{children}</>
  );
}
