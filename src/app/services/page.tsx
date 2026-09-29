import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Les services" };

/**
 * Les neuf services, présentés avant toute connexion.
 *
 * C'est la moitié publique de la réponse au défaut de fond : neuf services
 * construits, et aucune surface qui les porte. Celle-ci les présente à qui
 * n'a pas de compte ; « Mon espace › Services » les montre avec l'état de
 * chacun à qui en a un.
 *
 * DEUX RÈGLES, et la seconde est la plus importante.
 *
 * Chaque service dit CE QU'IL FAIT, en une phrase, sans superlatif ni
 * promesse de rendement.
 *
 * Et chacun porte SA LIMITE, dite sans s'excuser : « une intention n'est pas
 * une garantie d'allocation », « nous distribuons, nous ne gérons pas ». Un
 * client qui lit la limite avant d'ouvrir un compte fait plus confiance, pas
 * moins, et c'est le seul argument qu'un concurrent ne peut pas copier.
 *
 * La frontière du bas dit ce qui demande un compte. Elle n'est pas entre nos
 * produits et nos services : elle est entre savoir et faire.
 */
export default async function ServicesPage() {
  const t = await getT();
  const session = await getSession();

  const familles = [
    {
      titre: t("Placer"),
      sous: t("entrer sur le marché, par le primaire ou par la cote"),
      services: [
        {
          n: "01",
          nom: t("Placement primaire"),
          quoi: t("Votre demande part au Trésor avec celles des autres, puis l'allocation vous revient à votre nom. Vous voyez le prix servi et ce qu'il rapporte."),
          limite: t("Une intention n'est pas une garantie d'allocation : le Trésor sert qui il veut, au prix qu'il retient."),
        },
        {
          n: "02",
          nom: t("Intermédiation sur les fonds"),
          quoi: t("Souscription et rachat des fonds de la zone, avec la valeur liquidative, ses frais et sa date, comparés honnêtement entre eux."),
          limite: t("Nous distribuons, nous ne gérons pas : le choix du fonds reste le vôtre."),
        },
        {
          n: "05",
          nom: t("Courtage sur actions cotées"),
          quoi: t("Achat et vente sur la BVMAC, avec le dernier cours publié, sa date, et le fait qu'une ligne ait traité ou non."),
          limite: t("Une ligne qui n'a jamais traité n'a pas de prix de marché : son cours affiché est un prix de référence reporté."),
        },
      ],
    },
    {
      titre: t("Faire vivre"),
      sous: t("ce qui revient ne doit pas dormir"),
      services: [
        {
          n: "06",
          nom: t("Réinvestissement"),
          quoi: t("Dès qu'un coupon ou un remboursement arrive réellement sur le compte, il repart sur la ligne que vous avez choisie d'avance."),
          limite: t("Il ne part que sur de l'argent constaté reçu, jamais sur une échéance simplement passée."),
        },
        {
          n: "03",
          nom: t("Épargne programmée"),
          quoi: t("Un montant, un jour du mois, une destination fixée à la signature. La maison exécute sans jamais rien choisir."),
          limite: t("La destination est une ligne précise, pas une catégorie : choisir chaque mois serait de la gestion."),
        },
        {
          n: "08",
          nom: t("Passage d'un fonds à l'autre"),
          quoi: t("Le rachat et la souscription tenus ensemble, pour que le produit de l'un finance l'autre sans passer par votre banque."),
          limite: t("Les deux restent deux ordres : le délai de règlement du rachat commande la date d'entrée."),
        },
      ],
    },
    {
      titre: t("Tenir"),
      sous: t("savoir ce que vous avez, et ce qu'il a rapporté"),
      services: [
        {
          n: "07",
          nom: t("Conservation et tenue de compte"),
          quoi: t("Vos titres sont inscrits à votre nom au dépositaire. Le relevé porte chaque ligne, son échéancier et ce qui reste à venir."),
          limite: t("Les droits de garde sont calculés et détaillés ligne à ligne avant tout prélèvement."),
        },
        {
          n: "09",
          nom: t("Sondage avant adjudication"),
          quoi: t("Vous dites ce que vous seriez prêt à payer sur une séance à venir. L'émetteur voit une demande chiffrée, jamais un nom."),
          limite: t("Un sondage n'engage personne, et ne vous réserve rien."),
        },
        {
          n: "04",
          nom: t("Appariement des intentions"),
          quoi: t("Quand une intention inverse existe en interne, la maison le détecte et vous le signale plutôt que de sortir sur le marché."),
          limite: t("L'exécution d'un appariement attend une décision de la maison : aujourd'hui, le signal seul."),
        },
      ],
    },
  ];

  const ouvert = [
    t("Les titres et les fonds, avec leur fiche complète"),
    t("La courbe des taux et l'indice de la BVMAC"),
    t("Le calendrier des adjudications à venir"),
    t("Le guide, le glossaire et les parcours"),
    t("Les actualités et les notes de marché publiques"),
  ];
  const ferme = [
    t("Passer une intention ou un ordre"),
    t("Le portefeuille, ses positions et ses échéances"),
    t("Le rapport de performance et les documents"),
    t("Le réinvestissement et l'épargne programmée"),
    t("Le journal des espèces et les avis de garde"),
  ];

  return (
    <div className={styles.page}>

      <header className={styles.tete}>
        <h1>{t("Neuf services, et ce que chacun fait exactement")}</h1>
        <p>
          {t(
            "Purpose Capital est société de bourse : elle exécute ce que vous décidez, elle ne décide pas à votre place. Chaque service dit donc ce qu'il fait, et la limite qu'il porte.",
          )}
        </p>
      </header>

      {familles.map((f) => (
        <section className={styles.famille} key={f.titre}>
          <div className={styles.familleTete}>
            <h2>{f.titre}</h2>
            <span>{f.sous}</span>
          </div>
          <div className={styles.trois}>
            {f.services.map((s) => (
              <article className={styles.service} key={s.n}>
                <span className={styles.numero}>
                  <i>{s.n}</i>
                  <b>{s.nom}</b>
                </span>
                <p>{s.quoi}</p>
                {/* La limite se dit sans s'excuser : c'est ce qui rend la
                    promesse d'à côté crédible. */}
                <p className={styles.limite}>
                  <b>{t("La limite.")} </b>
                  {s.limite}
                </p>
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className={styles.frontiere}>
        <div>
          <h2>{t("Ce qui demande un compte")}</h2>
          <p>{t("La frontière n'est pas entre nos produits et nos services. Elle est entre savoir et faire.")}</p>
        </div>
        <div className={`${styles.colonne} ${styles.ouvert}`}>
          <span>{t("Ouvert à tous")}</span>
          {ouvert.map((o) => (
            <em key={o}>{o}</em>
          ))}
        </div>
        <div className={`${styles.colonne} ${styles.ferme}`}>
          <span>{t("Après connexion")}</span>
          {ferme.map((f) => (
            <em key={f}>{f}</em>
          ))}
        </div>
      </section>

      <section className={styles.entrer}>
        <div>
          <h2>{session ? t("Vos services, avec leur état") : t("Entrez par où vous voulez")}</h2>
          <p>
            {session
              ? t("Chacun des neuf dit ce qu'il fait pour vous en ce moment, et ce qui se passerait si vous l'activiez.")
              : t("Par e-mail, par WhatsApp, ou par Google. C'est le même compte, et personne n'a de mot de passe à retenir.")}
          </p>
        </div>
        <Link href={session ? "/moi/services" : "/ouvrir-un-compte"}>{session ? t("Voir mes services") : t("Ouvrir un compte-titres")}</Link>
      </section>

    </div>
  );
}
