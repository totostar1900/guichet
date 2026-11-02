import Link from "next/link";
import { getT } from "@/i18n/server";
import { repo } from "@/lib/data";
import { variationAffichee, variationsDesActions } from "@/lib/market/variations";
import { summarize } from "@/lib/domain/summary";
import type { Offer } from "@/lib/domain/types";
import { Avatar } from "@/components/Avatar";
import { PastilleVariation } from "@/components/PastilleVariation";
import { TitreDeBloc } from "@/components/TitreDeBloc";
import styles from "./SelectionDuDesk.module.css";

/**
 * Ce que le desk met en avant, sous ce qui attend le lecteur.
 *
 * L'ORDRE DE LA PAGE EST L'ORDRE DES DEVOIRS, PUIS DES OCCASIONS. Un client
 * qui revient après une semaine veut deux choses, dans cet ordre : ce qu'on
 * attend de lui, et ce qui s'est ouvert pendant son absence. Le reste de la
 * page est un constat, qui se consulte à loisir.
 *
 * LES LIGNES SONT CELLES QUE LE DESK A CHOISIES, et le choix porte son motif.
 * « Sélection du desk » sans raison serait de la réclame ; avec la raison,
 * c'est une information qui se vérifie sur la fiche. Le motif vient du
 * référentiel (voir desk › Mise en avant), jamais d'un calcul d'ici.
 *
 * LA MÊME RÈGLE QU'À LA UNE DES LISTES, littéralement : mise en avant non
 * périmée, ligne encore actionnable, trois au plus. Une quatrième ligne n'est
 * plus une sélection, et une ligne close dans un cadre « à saisir » est un
 * mensonge que la date suffit à éviter.
 *
 * VIDE, ELLE N'EST PAS LÀ. Pas de cadre vide, pas de « rien en ce moment » :
 * c'est la règle de la bande voisine, pour la même raison, un emplacement qui
 * dit « rien » apprend à l'oeil à sauter cet endroit.
 */
/** Les lignes que le desk met en avant : la règle, écrite une fois, que la page et son chapitre lisent tous deux. */
export function lignesDuDesk(offers: Offer[], now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return offers
    .filter((o) => !o.hidden && o.featured && o.featured.until >= today)
    .map((o) => ({ o, s: summarize(o, now) }))
    .filter(({ s }) => !s.past)
    .slice(0, 3);
}

export async function SelectionDuDesk({ offres, sobre = false }: { /** Le titre sobre (chevron, « Tout voir »), les lignes en une carte, des ronds : l'allure de l'Accueil. */ sobre?: boolean; /** Les offres déjà en main : la page d'arrivée les lit pour ses positions, les relire serait une seconde lecture du même objet. */ offres?: Offer[] } = {}) {
  const t = await getT();
  const now = new Date();
  const offers =
    offres ??
    (await repo()
      .listOffers()
      .catch(() => []));
  const picks = lignesDuDesk(offers, now);
  if (!picks.length) return null;
  const actions = sobre ? await variationsDesActions(picks.map((p) => p.o)) : new Map();
  return (
    <section className={`${styles.bande} ${sobre ? styles.sobre : ""}`} aria-label={t("La sélection du desk")}>
      {sobre ? <TitreDeBloc titre="La sélection du desk" href="/titres" /> : <h2 className={styles.titre}>{t("La sélection du desk")}</h2>}
      <ul className={`${styles.liste} ${sobre ? styles.groupe : ""}`}>
        {picks.map(({ o, s }) => (
          <li key={o.id}>
            <Link className={styles.lien} href={`/offres/${o.id}`}>
              {sobre && <Avatar offre={o} />}
              <span className={styles.nom}>
                {t(o.title)}
                <small>{t(s.subtitle)}</small>
              </span>
              <span className={styles.chiffre}>
                <b>{s.hero}</b>
                {s.heroUnit ? <small>{t(s.heroUnit)}</small> : null}
                {sobre && <PastilleVariation v={variationAffichee(o, actions, t)?.v} titre={variationAffichee(o, actions, t)?.titre} />}
              </span>
              <span className={styles.motif}>{t(o.featured!.reason)}</span>
              <span className={styles.quand}>{t(s.status)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
