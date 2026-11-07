import Link from "next/link";
import { getT } from "@/i18n/server";
import { fondsOuverts, lignesActives, seancesOuvertes, seancesPrevues } from "@/lib/domain/accueil";
import type { Offer } from "@/lib/domain/types";
import { INSTRUMENTS_PAGES } from "@/lib/nav-groups";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { FournisseurDeSuivis } from "./FournisseurDeSuivis";
import { BlocDeLignes, lignesDeBloc, NB_LIGNES_PAR_BLOC } from "./BlocDeLignes";
import styles from "./GrilleInvestir.module.css";

/**
 * « INVESTIR » : TROIS BLOCS PLEINE LARGEUR, DONT CHAQUE LIGNE MÈNE À SA FICHE (2 novembre 2026).
 *
 * Titres, Fonds et Adjudications étaient des demi-tuiles de 170 px : une ligne de tête,
 * deux lignes, des noms coupés sur une seule ligne et un chiffre sans libellé, sous un
 * lien unique vers la liste. La référence donne à chaque famille sa propre carte, des
 * rangées hautes, et fait de chaque rangée un lien : le titre du bloc et « Tout voir »
 * mènent à la liste complète, la rangée à la fiche.
 *
 * L'ADJUDICATION N'A SA PLACE QUE S'IL Y A DU CONTENU. Les séances ouvertes d'abord ;
 * à défaut, les séances annoncées ; à défaut des deux, le bloc disparaît (pas de carte
 * qui dirait « rien ») et l'invitation à proposer une adjudication passe dans « Vous
 * pouvez aussi » (voir `gestesProposables`, fait « sansAdjudication »).
 *
 * LE PIED MÈNE AU CATALOGUE ENTIER, sous les blocs.
 */
export async function GrilleInvestir({ offres }: { offres: Offer[] }) {
  const t = await getT();
  const now = new Date();
  const page = (cle: string) => INSTRUMENTS_PAGES.find((p) => p.key === cle)!;
  const ouvertes = seancesOuvertes(offres, now).slice(0, NB_LIGNES_PAR_BLOC);
  const prevues = ouvertes.length ? [] : seancesPrevues(offres, now, NB_LIGNES_PAR_BLOC);
  const session = await getSession();
  /* Les lignes que ce lecteur suit : un glissement sans elles dirait « Suivre » sur une ligne déjà suivie. Une lecture qui échoue ne fait pas tomber l'accueil. */
  const veilles = session ? await repo().listWatches(session.userId).catch(() => []) : [];
  const [titres, fonds, adjudications] = await Promise.all([
    lignesDeBloc(lignesActives(offres, now).slice(0, NB_LIGNES_PAR_BLOC), "cote", now),
    lignesDeBloc(fondsOuverts(offres).slice(0, NB_LIGNES_PAR_BLOC), "fonds", now),
    lignesDeBloc(ouvertes.length ? ouvertes : prevues, ouvertes.length ? "adjudications" : "prevues", now),
  ]);
  return (
    <FournisseurDeSuivis ids={veilles.map((w) => w.offerId)}>
    <section className="pile" aria-label={t("Investir")}>
      <BlocDeLignes id="investir-titres" titre={page("titres").label} href={page("titres").href} lignes={titres} glisser />
      <BlocDeLignes id="investir-fonds" titre={page("fonds").label} href={page("fonds").href} lignes={fonds} glisser />
      <BlocDeLignes id="investir-adjudications" titre={page("calendrier").label} href={page("calendrier").href} lignes={adjudications} glisser />
      <Link href="/trader" className={styles.tous}>
        {t("Tous vos services")} →
      </Link>
    </section>
    </FournisseurDeSuivis>
  );
}
