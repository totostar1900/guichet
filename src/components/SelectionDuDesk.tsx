import Link from "next/link";
import { getT } from "@/i18n/server";
import { repo } from "@/lib/data";
import { summarize } from "@/lib/domain/summary";
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
export async function SelectionDuDesk() {
  const t = await getT();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const offers = await repo()
    .listOffers()
    .catch(() => []);
  const picks = offers
    .filter((o) => !o.hidden && o.featured && o.featured.until >= today)
    .map((o) => ({ o, s: summarize(o, now) }))
    .filter(({ s }) => !s.past)
    .slice(0, 3);
  if (!picks.length) return null;
  return (
    <section className={styles.bande} aria-label={t("La sélection du desk")}>
      <h2 className={styles.titre}>{t("La sélection du desk")}</h2>
      <ul className={styles.liste}>
        {picks.map(({ o, s }) => (
          <li key={o.id} className={styles.ligne}>
            <Link className={styles.lien} href={`/offres/${o.id}`}>
              <span className={styles.nom}>
                {o.title}
                <small>{t(s.subtitle)}</small>
              </span>
              <span className={styles.chiffre}>
                <b>{s.hero}</b>
                {s.heroUnit ? <small>{t(s.heroUnit)}</small> : null}
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
