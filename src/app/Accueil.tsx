import Link from "next/link";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { BandeInstruments, type LigneVitrine } from "@/components/accueil/BandeInstruments";
import { familleDe, identite } from "./offres/[id]/identite";
import type { Offer } from "@/lib/domain/types";
import styles from "./Accueil.module.css";

/**
 * L'accueil d'un visiteur qui n'est pas connecté.
 *
 * REFONTE DU 12 OCTOBRE 2026, décidée sur maquette. La page d'avant parlait à
 * quelqu'un qui savait déjà ce que veulent dire « marché primaire », « cote »,
 * « valeur liquidative » et « allocation ». Dans la zone, cela fait quelques
 * centaines de personnes. Celle-ci parle à qui a une épargne.
 *
 * CE QUI A CHANGÉ, ET POURQUOI.
 *
 *   LE TITRE NOMME LA MAISON. « Le marché primaire et la cote, dans un seul
 *   compte » posait deux mots de métier dans la première phrase lue. « La
 *   porte d'entrée des marchés financiers d'Afrique centrale » se comprend
 *   sans cours, et le mot « porte » fait rimer la vitrine avec la doctrine du
 *   produit : trois portes, celle qu'on crée, celle qu'on ouvre, celle par où
 *   l'on revient.
 *
 *   CINQ VERBES DEVIENNENT TROIS GESTES. Souscrire, négocier, placer, épargner
 *   et suivre étaient un inventaire rangé par instrument. Épargner, financer,
 *   investir est un ordre : du plus tranquille au plus engagé. « Fructifier »
 *   n'est pas un geste, c'est le résultat, et il reste donc hors de la liste.
 *
 *   « VOTRE ÉCRAN S'OUVRE SUR CE QUI VOUS ATTEND » EST RETIRÉ. C'est un écran
 *   qu'on apprécie une fois client ; il ne décide personne à le devenir. À sa
 *   place, les trois temps de l'entrée.
 *
 *   L'ACCOMPAGNEMENT DEVIENT UNE SECTION. Suivre une courbe n'est pas une
 *   raison d'ouvrir un compte ; qu'une personne réponde en est une, et c'est
 *   ce qui nous distingue d'une application.
 *
 * CE QUI N'A PAS CHANGÉ, ET NE DOIT PAS.
 *
 *   AUCUN CHIFFRE, NULLE PART. Une bande de preuve chiffrée (six États, trente-
 *   deux obligations…) a été dessinée puis retirée le 12 octobre : des comptes
 *   d'instruments restent des chiffres. La bande qui défile dit que le marché
 *   existe en le NOMMANT, et c'est la preuve la moins discutable des deux.
 *
 *   NI PROMESSE NI URGENCE. Pas de rendement en accroche, pas de compteur
 *   d'investisseurs, pas de compte à rebours. La figure financière du haut est
 *   une illustration sans échelle, et sa légende dit que les marchés
 *   descendent aussi.
 *
 *   CE QUI PARAÎT EST LU AU DÉPÔT. Quand le dépôt ne rend rien, la bande ne
 *   paraît pas : elle ne se remplit pas d'exemples.
 */

/** Ce que la bande peut porter avant de devenir une liste qu'on ne lit plus. */
const MAX_BANDE = 12;

export async function Accueil() {
  const t = await getT();
  const offres = await repo()
    .listOffers()
    .catch(() => [] as Offer[]);

  /**
   * La bande : ce qui existe, sans un chiffre. Les trois familles alternent au
   * lieu de se suivre par paquets, pour qu'un lecteur qui regarde trois
   * secondes voie les trois.
   */
  const vivantes = offres.filter((o) => !o.hidden && o.status !== "draft" && !o.isExample);
  const par = (f: LigneVitrine["famille"]): LigneVitrine[] =>
    vivantes
      .filter((o) => familleDe(o) === f)
      .map((o) => {
        // Une ligne d'État se nomme par son pays : « Trésor public de la
        // République centrafricaine » ne tient pas dans une colonne et se
        // répète à chaque ligne. Un émetteur privé, lui, garde son nom.
        const q = identite(o);
        return { emetteur: (f === "tresor" ? o.countryName : q.emetteur) || q.emetteur, nature: q.nature, duree: q.duree, marche: q.marche, famille: f };
      });
  const paquets = [par("tresor"), par("cote"), par("fonds")];
  const lignes: LigneVitrine[] = [];
  for (let i = 0; lignes.length < MAX_BANDE && paquets.some((p) => p[i]); i++) {
    for (const p of [paquets[0], paquets[1], paquets[0], paquets[2]]) {
      if (p[i] && lignes.length < MAX_BANDE && !lignes.includes(p[i])) lignes.push(p[i]);
    }
  }

  /**
   * LES TROIS GESTES, du plus tranquille au plus engagé.
   *
   * Chacun recouvre une part de l'offre sans empiéter sur les autres.
   *
   * ILS SONT NUMÉROTÉS, ET C'EST NOUVEAU. La version d'avant s'y refusait,
   * à raison : une liste numérotée promet un ordre, et les cinq verbes
   * d'alors n'en avaient aucun. Ces trois-là en ont un, écrit juste au-
   * dessus : du plus tranquille au plus engagé. Le numéro dit donc quelque
   * chose de vrai, et il donne à la rangée l'assise qui lui manquait.
   */
  const gestes = [
    {
      clef: "epargner",
      n: "01",
      d: "M24 14a10 10 0 1 1-3.2-7.3 M24.5 3.5v6h-6",
      titre: t("Épargner"),
      dit: t("Vous arrêtez un montant et un jour du mois, et le prélèvement s'exécute de lui-même. Ce qui vous est remboursé repart vers la ligne que vous avez désignée d'avance."),
    },
    {
      clef: "financer",
      n: "02",
      d: "M3 25h22 M6 25V11l8-6 8 6v14 M11 25v-7h6v7",
      titre: t("Financer"),
      dit: t("Vous prêtez aux six États de la zone, à la banque de développement de la région et aux grandes entreprises d'ici. Ils vous versent un intérêt et vous remboursent à une échéance connue d'avance."),
    },
    {
      clef: "investir",
      n: "03",
      d: "M3 23l7-7 5 4 9.5-11 M25 5h-6 M25 5v6",
      titre: t("Investir"),
      dit: t("Vous prenez part au capital des sociétés cotées de la région, ou vous placez dans des fonds agréés par la COSUMAF. Votre gain n'y est plafonné par aucun taux, et c'est la contrepartie du risque que vous acceptez."),
    },
  ];

  /**
   * TROIS TEMPS, ET LE PREMIER NE DEMANDE RIEN.
   *
   * La page n'en montrait que deux et les confondait : « Ouvrir un compte »
   * réclamait une pièce d'identité à quelqu'un qui venait d'arriver. Créer son
   * compte et faire ouvrir son compte-titres sont deux gestes, séparés par le
   * temps que le visiteur veut bien y mettre, et la plateforme le savait déjà
   * faire sans jamais le dire.
   */
  const etapes = [
    { d: "M21 25a10 10 0 1 1 0-20 M25 9v6h-6 M25 15a10 10 0 0 1-4 8", titre: t("Vous créez votre compte"), dit: t("Une adresse ou un numéro, un code reçu dans l'instant. Vous voyez alors le marché et vous recevez les avis de séance. Aucun document, aucun engagement.") },
    { d: "M6 3h11l5 5v17H6z M17 3v6h5 M10 16h9 M10 20h6", titre: t("Vous faites ouvrir votre compte-titres"), dit: t("Une pièce d'identité, un justificatif de domicile et le questionnaire de connaissance. Dix minutes, à votre rythme, et le desk vous rappelle si une pièce manque.") },
    { d: "M14 4v13 M8.5 11.5L14 17l5.5-5.5 M3 21v4h22v-4", titre: t("Vous approvisionnez et vous placez"), dit: t("Par virement, vers le compte espèces ouvert à votre nom. Vous choisissez une séance annoncée ou une ligne de la cote, et vous suivez votre allocation.") },
  ];

  const publications = [
    { quand: t("Chaque mois"), titre: t("Le point de marché"), dit: t("Les séances tenues, les emprunts servis, et ce que les taux ont fait.") },
    { quand: t("Chaque trimestre"), titre: t("La note publiée"), dit: t("Un document daté et référencé, que vous pouvez citer et transmettre.") },
    { quand: t("En continu"), titre: t("La courbe et l'indice"), dit: t("La courbe des taux de la zone et l'indice de la bourse régionale, tenus à jour séance après séance.") },
  ];

  const garanties = [
    { titre: t("Une société agréée"), dit: t("Purpose Capital est agréée en qualité de société de bourse par la COSUMAF, régulateur du marché financier de l'Afrique centrale.") },
    { titre: t("Vos titres à votre nom"), dit: t("Les titres acquis sont inscrits à votre nom, et le demeurent si vous nous quittez.") },
    { titre: t("Vos espèces séparées"), dit: t("Votre compte espèces est ouvert à votre nom. Chaque mouvement porte sa date de valeur.") },
    { titre: t("Vous seul donnez les ordres"), dit: t("Aucun ordre ne part sans vous. Le conseiller éclaire et propose ; la décision vous appartient.") },
  ];

  return (
    <div className={styles.page}>
      <section className={styles.ouverture}>
        <div className={styles.dire}>
          <span className={styles.agrement}>{t("Société de bourse agréée COSUMAF · n° COSUMAF-SDB-01/2026")}</span>
          <h1>{t("La porte d'entrée des marchés financiers d'Afrique centrale.")}</h1>
          <p className={styles.chapeau}>
            {t("Prêtez aux États et aux institutions de la zone, prenez part au capital des sociétés cotées, placez dans des fonds agréés par la COSUMAF. Votre compte se crée en quelques instants, et un conseiller reste joignable.")}
          </p>
          {/* UN SEUL GESTE PROPOSÉ, ET RIEN À CÔTÉ.
              L'ouverture portait un second bouton, « Visite guidée », et une
              mention « gratuit, sans document, sans engagement ». Trois
              propositions dans le même souffle en font zéro : le lecteur
              arbitre au lieu d'agir, et la mention répondait d'avance à une
              objection qu'il n'avait pas encore formée. Les trois temps, plus
              bas, disent déjà qu'il n'y a ni document ni engagement, et ils le
              disent au moment où la question se pose.

              LA FIGURE FINANCIÈRE EST RETIRÉE AVEC EUX. Elle disait « ceci est
              de la finance » à une page qui le dit déjà en toutes lettres, et
              un dessin sans échelle à côté d'un titre reste un ornement. La
              page tient sur sa phrase. */}
          <div className={styles.gestesBoutons}>
            <Link className={styles.principal} href="/connexion?creer=1">
              {t("Créer mon compte")}
            </Link>
          </div>
        </div>
      </section>

      {lignes.length > 0 && <BandeInstruments lignes={lignes} />}

      <section className={styles.troisGestes}>
        <div className={styles.tete}>
          <h2>{t("Épargner, financer, investir.")}</h2>
          <p>{t("Trois gestes, du plus tranquille au plus engagé. Ils se tiennent dans le même compte, et vous passez de l'un à l'autre sans rien rouvrir.")}</p>
        </div>
        <div className={styles.gestesListe}>
          {gestes.map((g) => (
            <article className={`${styles.geste} ${styles[g.clef]}`} key={g.clef}>
              <span className={styles.rang}>{g.n}</span>
              <span className={styles.figurine}>
                <svg viewBox="0 0 28 28" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={g.d} />
                </svg>
              </span>
              <h3>{g.titre}</h3>
              <p>{g.dit}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.publications}>
        <div className={styles.publieDire}>
          <span className={styles.etiquetteOr}>{t("Analyses et publications")}</span>
          <h2>{t("Le marché de la zone, lu et commenté.")}</h2>
          <p>
            {t("Le bureau suit les séances de la bourse régionale et les adjudications des Trésors, et publie ce qu'il en retient. Les chiffres et l'échelle s'ouvrent avec votre compte.")}
          </p>
        </div>
        <ul className={styles.publieListe}>
          {publications.map((p) => (
            <li key={p.titre}>
              <span>{p.quand}</span>
              <b>{p.titre}</b>
              <small>{p.dit}</small>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.entrer}>
        <div className={styles.entrerTete}>
          <h2>{t("Créer votre compte, puis l'ouvrir")}</h2>
          <span>{t("En ligne, et le desk vous rappelle si un document manque.")}</span>
        </div>
        <div className={styles.etapes}>
          {etapes.map((e) => (
            <div className={styles.etape} key={e.titre}>
              <span className={styles.figurine}>
                <svg viewBox="0 0 28 28" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={e.d} />
                </svg>
              </span>
              <b>{e.titre}</b>
              <p>{e.dit}</p>
            </div>
          ))}
        </div>
        <div className={styles.portes}>
          <div>
            <b>{t("Entrez par où vous voulez.")}</b>
            <span>{t("Par e-mail, par WhatsApp ou avec Google : c'est le même compte, et personne n'a de mot de passe à retenir.")}</span>
          </div>
          {/* LES TROIS PASTILLES SONT PARTIES. « E-mail · WhatsApp · Google »
              ressemblaient à trois boutons et n'en étaient pas : elles ne
              menaient nulle part, et un lecteur qui clique sans effet conclut
              que le site est cassé. La phrase juste au-dessus dit déjà les
              trois canaux, mieux qu'elles ne le faisaient, et le seul geste
              qui compte reste seul. */}
          <Link className={styles.principal} href="/connexion?creer=1">
            {t("Créer mon compte")}
          </Link>
        </div>
      </section>

      {/* La seule surface pleine de la page : l'accompagnement, qui est ce qui
          nous distingue d'une application. */}
      <section className={styles.accompagnement}>
        <div className={styles.accDire}>
          <span className={styles.etiquetteClaire}>{t("Vous n'êtes jamais seul devant l'écran")}</span>
          <h2>{t("Un conseiller vous répond.")}</h2>
          <p>{t("Une question sur un emprunt d'État, sur un taux, sur la date d'un remboursement ? Vous écrivez par WhatsApp ou par courriel, et un membre du bureau vous répond, en français et sans jargon.")}</p>
          <div>
            <Link className={styles.orBouton} href="/info/aide">
              {t("Nous joindre")}
            </Link>
          </div>
        </div>
        <ul className={styles.accListe}>
          <li>
            <b>{t("Des guides pour débuter")}</b>
            <small>{t("Ce qu'est une obligation, un coupon, un fonds. Trois minutes de lecture, sans vocabulaire de métier.")}</small>
          </li>
          <li>
            <b>{t("Un conseiller attitré")}</b>
            <small>{t("Son nom et son numéro figurent sur votre compte dès l'ouverture.")}</small>
          </li>
        </ul>
      </section>

      <section className={styles.confiance}>
        <h2>{t("Ce qui protège votre argent.")}</h2>
        <div className={styles.garanties}>
          {garanties.map((g) => (
            <div key={g.titre}>
              <b>{g.titre}</b>
              <p>{g.dit}</p>
            </div>
          ))}
        </div>
        <p className={styles.avertissement}>
          {t("Tout placement comporte un risque de perte en capital. Les performances passées ne préjugent pas des performances futures. Les conditions de chaque placement vous sont remises avant toute décision.")}{" "}
          <Link href="/info/risques">{t("Ce qu'il faut savoir sur les risques")}</Link>
        </p>
      </section>

      <section className={styles.final}>
        <div>
          <h2>{t("Le marché de la zone, à portée de main.")}</h2>
          <p>{t("Créez votre compte et regardez. Vous déciderez ensuite.")}</p>
        </div>
        <div className={styles.gestesBoutons}>
          <Link className={styles.principal} href="/connexion?creer=1">
            {t("Créer mon compte")}
          </Link>
          <Link className={styles.second} href="/info/aide">
            {t("Poser une question")}
          </Link>
        </div>
      </section>
    </div>
  );
}
