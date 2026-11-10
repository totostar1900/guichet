import Link from "next/link";
import { getT } from "@/i18n/server";
import { lignesActives, seancesOuvertes, seancesPrevues } from "@/lib/domain/accueil";
import { fondsListes } from "@/lib/domain/listes";
import type { Offer } from "@/lib/domain/types";
import { INSTRUMENTS_PAGES } from "@/lib/nav-groups";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { echantillonner } from "@/lib/domain/fund-curve";
import { performanceSur } from "@/lib/market/performe";
import { ligneDeFonds } from "@/app/fonds/ligne-de-fonds";
import { FournisseurDeSuivis } from "./FournisseurDeSuivis";
import { BlocDeCartes, type CarteDeBloc } from "./BlocDeCartes";
import styles from "./GrilleInvestir.module.css";

/** Le nombre de cartes qu'un bloc montre au plus. */
export const NB_CARTES_PAR_BLOC = 3;

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
 * LES LIGNES SONT LES CARTES DES LISTES (10 novembre 2026, planche 1A) : la carte compacte de Titres, de Fonds et d'Adjudications, sans extension. Voir « BlocDeCartes ».
 *
 * LE PIED MÈNE AUX SERVICES, sous les blocs : « Tous vos services » ouvre le rayon de l'Activité.
 */
export async function GrilleInvestir({ offres }: { offres: Offer[] }) {
  const t = await getT();
  const now = new Date();
  const page = (cle: string) => INSTRUMENTS_PAGES.find((p) => p.key === cle)!;
  const ouvertes = seancesOuvertes(offres, now).slice(0, NB_CARTES_PAR_BLOC);
  const prevues = ouvertes.length ? [] : seancesPrevues(offres, now, NB_CARTES_PAR_BLOC);
  const session = await getSession();
  const r = repo();
  /* Les lignes que ce lecteur suit : un glissement sans elles dirait « Suivre » sur une ligne déjà suivie. Une lecture qui échoue ne fait pas tomber l'accueil. */
  const [veilles, trois] = await Promise.all([session ? r.listWatches(session.userId).catch(() => []) : Promise.resolve([]), performanceSur().catch(() => undefined)]);
  const suivis = new Set(veilles.map((w) => w.offerId));
  /* Les petits graphes des actions : les trois mois de « Ce qui performe », lus en UNE requête, comme la page des titres. */
  const courbes = new Map((trois?.lignes ?? []).map((l) => [l.isin, { serie: l.serie, variationPct: l.variationPct }] as const));
  const actions: CarteDeBloc[] = lignesActives(offres, now)
    .slice(0, NB_CARTES_PAR_BLOC)
    .map((o) => ({ type: "offre", o, courbe: o.isin ? courbes.get(o.isin) : undefined }));
  const lesFonds = fondsListes(offres)
    .filter((o) => o.status !== "withdrawn")
    .slice(0, NB_CARTES_PAR_BLOC);
  const curves = new Map([...(await r.listFundCurves(lesFonds.map((o) => o.fund.key)))].map(([k, c]) => [k, echantillonner(c)] as const));
  const fonds: CarteDeBloc[] = lesFonds.map((o) => ({ type: "fonds", r: ligneDeFonds(o, curves.get(o.fund.key), now) }));
  const seances: CarteDeBloc[] = (ouvertes.length ? ouvertes : prevues).map((o) => ({ type: "offre", o }));
  return (
    <FournisseurDeSuivis ids={[...suivis]}>
      <section className="pile" aria-label={t("Investir")}>
        <BlocDeCartes id="investir-titres" titre={page("titres").label} href={page("titres").href} cartes={actions} suivis={suivis} now={now} />
        <BlocDeCartes id="investir-fonds" titre={page("fonds").label} href={page("fonds").href} cartes={fonds} suivis={suivis} now={now} />
        <BlocDeCartes id="investir-adjudications" titre={page("calendrier").label} href={page("calendrier").href} cartes={seances} suivis={suivis} now={now} />
        <Link href="/activite#services" className={styles.tous}>
          {t("Tous vos services")} →
        </Link>
      </section>
    </FournisseurDeSuivis>
  );
}
