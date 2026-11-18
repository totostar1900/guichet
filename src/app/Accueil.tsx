import Link from "next/link";
import { getT } from "@/i18n/server";
import { tirerLesMessages } from "@/lib/domain/vitrine-messages";
import styles from "./Accueil.module.css";

/**
 * L'accueil d'un visiteur qui n'est pas connecté : QUATRE ÉCRANS PLEIN ÉCRAN (18 novembre 2026, planche « Accueil en quatre écrans », un mélange de 1A et de 1B).
 *
 * Avant : neuf sections, 7 037 px de haut à 390 px, 1 033 mots, « Créer mon compte » écrit trois fois, trois listes qui disaient « comment ça marche ». Le client : « très fouillie ».
 * Maintenant : un écran, un message. Le hub (ce qu'on trouve ici, produits et services nommés), investir, la région, vous.
 * LES MESSAGES CHANGENT À CHAQUE VISITE : trois variantes par écran, une tirée côté serveur (`vitrine-messages.ts`).
 * LES BOUTONS D'ENTRÉE NE SONT PLUS DANS LA PAGE : la bande basse (PorteVitrine) porte « Créer mon compte » et « Se connecter », collée au pouce ; au large, la pastille du haut. Un seul endroit pour entrer.
 *
 * LE DESIGN (18 novembre 2026, le client : « un design qui glow, fonds et contenus comme Revolut ») : fond nuit, halos dorés qui respirent, cartes en verre, gros titres. On reprend le PRINCIPE (un fond sombre, une lueur derrière ce qui compte, des cartes sans bord dur), jamais leur marque, leurs textes ni leurs illustrations.
 *
 * CE QUI NE CHANGE PAS : aucun chiffre, aucun taux, aucun rendement, aucune promesse ; « Communication à caractère promotionnel » (au pied du gabarit) et la phrase sur le risque restent visibles ; la ligne d'agrément COSUMAF ouvre la page.
 * Le mouvement vient du moteur de la maison (`Mouvement`) : chaque pièce marquée « data-anim » arrive à son tour, d'un effet tiré au hasard, à l'ouverture et à chaque entrée dans l'écran en descendant.
 */
export async function Accueil() {
  const t = await getT();
  const m = tirerLesMessages();

  const produits = [
    { clef: "tresor", d: "M4 21h20 M6 21V10l8-5 8 5v11 M10 21v-6h8v6", titre: t("Titres du Trésor"), dit: t("Les obligations et les bons des États de la zone.") },
    { clef: "actions", d: "M3 22l7-8 5 4 9-11 M24 7h-6 M24 7v6", titre: t("Actions cotées"), dit: t("Les sociétés de la bourse régionale.") },
    { clef: "fonds", d: "M14 4v10h10a10 10 0 1 1-10-10z M17 3a10 10 0 0 1 8 8h-8z", titre: t("Fonds agréés"), dit: t("Des placements gérés pour vous, agréés par la COSUMAF.") },
    { clef: "adjudications", d: "M5 7h18v16H5z M5 12h18 M10 4v5 M18 4v5", titre: t("Adjudications"), dit: t("Le calendrier des séances d'emprunt des États.") },
  ];

  const etapes = [
    { n: "1", titre: t("Vous créez votre compte"), dit: t("Une adresse ou un numéro, un code reçu dans l'instant. Vous voyez alors le marché et vous recevez les avis de séance. Aucun document, aucun engagement.") },
    { n: "2", titre: t("Vous faites ouvrir votre compte-titres"), dit: t("Une pièce d'identité, un justificatif de domicile et le questionnaire de connaissance. Dix minutes, à votre rythme, et le desk vous rappelle si une pièce manque.") },
    { n: "3", titre: t("Vous approvisionnez et vous placez"), dit: t("Par virement, vers le compte espèces ouvert à votre nom. Vous choisissez une séance annoncée ou une ligne de la cote, et vous suivez votre allocation.") },
  ];

  return (
    <div className={styles.page} data-vitrine="">
      {/* ÉCRAN 1 · LE HUB : ce qu'on trouve ici, nommé, sans un chiffre. */}
      <section className={`${styles.ecran} ${styles.hub}`}>
        <span className={styles.halo} aria-hidden="true" />
        <div className={styles.col}>
          <span className={styles.agrement} data-anim="">
            {t("Société de bourse agréée COSUMAF · n° COSUMAF-SDB-01/2026")}
          </span>
          <h1 data-anim="">{t(m.hub)}</h1>
          <p className={styles.chapeau} data-anim="">
            {t("Voici ce que vous y trouvez, depuis un seul compte.")}
          </p>
          <div className={styles.produits} data-anim="">
            {produits.map((p) => (
              <article className={styles.produit} key={p.clef}>
                <span className={styles.icone}>
                  <svg viewBox="0 0 28 28" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={p.d} />
                  </svg>
                </span>
                <h3>{p.titre}</h3>
                <p>{p.dit}</p>
              </article>
            ))}
          </div>
          <p className={styles.services} data-anim="">
            {t("Et aussi : l'épargne programmée, les notes de marché, un conseiller qui répond.")}
          </p>
        </div>
      </section>

      {/* ÉCRAN 2 · INVESTIR : le futur et le financement, avec le risque à côté. */}
      <section className={`${styles.ecran} ${styles.investir}`}>
        <span className={styles.halo} aria-hidden="true" />
        <div className={styles.col}>
          <span className={styles.etiquette} data-anim="">
            {t("Investir")}
          </span>
          <h2 data-anim="">{t(m.investir)}</h2>
          <p className={styles.chapeau} data-anim="">
            {t("Prêtez aux États et aux institutions de la zone, prenez part au capital des sociétés cotées, placez dans des fonds agréés par la COSUMAF.")}
          </p>
          <div className={styles.cartes} data-anim="">
            <article className={styles.carte}>
              <span className={styles.rang}>1</span>
              <h3>{t("Où va votre argent")}</h3>
              <p>{t("Chez les États de la zone, la banque de développement de la région et des entreprises cotées d'ici.")}</p>
            </article>
            <article className={styles.carte}>
              <span className={styles.rang}>2</span>
              <h3>{t("Ce que vous risquez")}</h3>
              <p>{t("Un placement peut perdre de la valeur. Le risque est écrit en clair avant chaque décision.")}</p>
            </article>
          </div>
        </div>
      </section>

      {/* ÉCRAN 3 · LA RÉGION : un seul message, le plus fort. */}
      <section className={`${styles.ecran} ${styles.region}`}>
        <span className={styles.halo} aria-hidden="true" />
        <span className={styles.anneaux} aria-hidden="true" />
        <div className={styles.col}>
          <span className={styles.etiquette} data-anim="">
            {t("La région")}
          </span>
          <h2 data-anim="">{t(m.region)}</h2>
          <p className={styles.chapeau} data-anim="">
            {t("Les fonds levés sur ce marché financent des projets de la région : le marché existe pour les rendre possibles.")}
          </p>
        </div>
      </section>

      {/* ÉCRAN 4 · VOUS : la main, le risque écrit, les trois pas, et ce qui protège. */}
      <section className={`${styles.ecran} ${styles.vous}`}>
        <span className={styles.halo} aria-hidden="true" />
        <div className={styles.col}>
          <span className={styles.etiquette} data-anim="">
            {t("Vous")}
          </span>
          <h2 data-anim="">{t(m.vous)}</h2>
          <h3 className={styles.sousTitre} data-anim="">
            {t("Trois pas, à votre rythme.")}
          </h3>
          <ol className={styles.pas} data-anim="">
            {etapes.map((e) => (
              <li key={e.n}>
                <span className={styles.rang}>{e.n}</span>
                <div>
                  <b>{e.titre}</b>
                  <p>{e.dit}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className={styles.confiance} data-anim="">
            {t("Société de bourse agréée par la COSUMAF. Vos titres sont inscrits à votre nom et vos espèces sont séparées.")}
          </p>
          <p className={styles.avertissement} data-anim="">
            {t("Tout placement comporte un risque de perte en capital. Les performances passées ne préjugent pas des performances futures. Les conditions de chaque placement vous sont remises avant toute décision.")}{" "}
            <Link href="/info/risques">{t("Ce qu'il faut savoir sur les risques")}</Link>
            {" · "}
            <Link href="/info/aide">{t("Nous joindre")}</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
