import Link from "next/link";
import { COMPANY } from "@/lib/config";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";

/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("À propos") };
}

/**
 * À PROPOS : qui nous sommes, ce que l'agrément oblige, et pour qui ce n'est
 * pas le bon moment.
 *
 * LA SECTION QUI COMPTE EST « POUR QUI, ET POUR QUI PAS ». Une page « à
 * propos » qui ne sait que se vanter n'apprend rien à personne, et sur le site
 * d'une société agréée elle est pire qu'inutile : elle laisse entrer des gens
 * à qui le produit ne convient pas, que le questionnaire écartera dix minutes
 * plus tard. Le dire ici fait gagner ce temps aux deux parties, et c'est la
 * seule page de la vitrine où le dire ne gâche rien.
 *
 * LES QUATRE RÈGLES NE SONT PAS UNE PROMESSE COMMERCIALE : chacune est écrite
 * dans la plateforme et se vérifie, et chacune s'applique à nous avant de
 * s'appliquer au client.
 */
export default async function AProposPage() {
  const t = await getT();

  const regles = [
    /* DIRE CE QU'ON FAIT, ET NON CE QU'ON NE PEUT PAS FAIRE. La première
       version disait « personne au bureau ne peut acheter ou vendre à votre
       place » : juste, honnête, et c'était une justification déguisée en
       règle. Le cliquet du ton l'a nommée. L'ordre part de votre main : c'est
       la même chose, dite à l'endroit. */
    { titre: t("Vous seul donnez les ordres"), dit: t("L'ordre part de votre main, et d'aucune autre. Le conseiller explique et propose ; la signature est la vôtre.") },
    { titre: t("Le même prix pour tous"), dit: t("Deux clients devant la même ligne lisent les mêmes conditions. Nous choisissons qui prévenir d'une occasion, jamais à quel prix la lui offrir.") },
    { titre: t("Un chiffre dit d'où il vient"), dit: t("Chaque cours, chaque valeur, chaque date provient d'un document officiel que nous nommons. Quand nous ne savons pas, l'écran le dit au lieu d'afficher zéro.") },
    { titre: t("Deux regards sur ce qui engage"), dit: t("Les gestes qui touchent à vos droits ou à votre argent demandent deux personnes, pas une. Et tout geste laisse une trace datée.") },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.tete}>
        <span className="eyebrow">{t("À propos")}</span>
        <h1>{t("Le marché de l'Afrique centrale existe. Il manquait une porte d'entrée.")}</h1>
        <p>
          {t("Six États y empruntent chaque mois, une bourse régionale y cote des sociétés et des obligations, des fonds agréés y sont gérés. Jusqu'ici, il fallait connaître quelqu'un pour y accéder. Purpose Capital ouvre ce marché à toute personne qui a une épargne et l'envie de la faire travailler près de chez elle.")}
        </p>
      </header>

      <div className={styles.deux}>
        <section className="panel">
          <div className="panel-h">
            <h2>{t("Ce que nous sommes")}</h2>
          </div>
          <div className={styles.prose}>
            <p>
              {t("Purpose Capital est une société de bourse agréée par la COSUMAF, le régulateur du marché financier de l'Afrique centrale. Cet agrément nous autorise à recevoir vos ordres, à les porter sur le marché et à conserver vos titres. Il nous impose aussi des règles : connaître nos clients, séparer leur argent du nôtre, rendre compte, et nous laisser contrôler.")}
            </p>
            <p>
              {t("Guichet est le nom de la plateforme par laquelle vous nous parlez. Elle a été construite pour que tout ce que fait le bureau soit visible du client : l'ordre, son exécution, ce qui a été attribué, et la date de valeur de chaque somme.")}
            </p>
          </div>
        </section>

        <section className={styles.agrement}>
          <span className={styles.etiquette}>{t("L'agrément")}</span>
          <b>{t(COMPANY.licence)}</b>
          <p>{t("La COSUMAF publie la liste des sociétés agréées. Vous pouvez y vérifier la nôtre : c'est le premier réflexe à avoir avant de confier son argent à qui que ce soit.")}</p>
          <p className={styles.adresse}>
            {COMPANY.legalName}
            <br />
            {COMPANY.address}
            <br />
            {COMPANY.phone} · {COMPANY.email}
          </p>
        </section>
      </div>

      <section className={styles.regles}>
        <div className={styles.reglesTete}>
          <h2>{t("Quatre règles que nous nous imposons.")}</h2>
          <p>{t("Elles ne sont pas une promesse commerciale : elles sont écrites dans la plateforme, et elles s'appliquent à nous avant de s'appliquer à vous.")}</p>
        </div>
        <div className={styles.reglesListe}>
          {regles.map((r) => (
            <div key={r.titre}>
              <b>{r.titre}</b>
              <p>{r.dit}</p>
            </div>
          ))}
        </div>
      </section>

      {/* POUR QUI, ET POUR QUI PAS. La seconde colonne est la raison d'être de
          cette page : elle fait gagner dix minutes à qui n'aurait pas dû
          ouvrir un compte, et elle dit ce que le questionnaire dira. */}
      <section className="panel">
        <div className="panel-h">
          <h2>{t("Pour qui, et pour qui pas")}</h2>
        </div>
        <div className={styles.pourQui}>
          <div className={styles.oui}>
            <b>{t("Guichet est fait pour vous si")}</b>
            <ul>
              <li>{t("Vous avez une épargne, même modeste, qui dort")}</li>
              <li>{t("Vous voulez la placer dans la région où vous vivez")}</li>
              <li>{t("Vous acceptez de ne pas disposer de la somme avant une échéance")}</li>
              <li>{t("Vous préférez comprendre avant de signer")}</li>
            </ul>
          </div>
          <div className={styles.nonPas}>
            <b>{t("Ce n'est pas le bon moment si")}</b>
            <ul>
              <li>{t("Vous pourriez avoir besoin de cette somme d'un jour à l'autre")}</li>
              <li>{t("Vous cherchez un gain rapide et garanti : cela n'existe pas ici")}</li>
              <li>{t("Vous placeriez de l'argent emprunté")}</li>
            </ul>
            <small>{t("Nous le disons avant l'ouverture du compte, et le questionnaire de connaissance sert exactement à cela.")}</small>
          </div>
        </div>
      </section>

      <section className={styles.final}>
        <div>
          <h2>{t("Regardez d'abord, décidez ensuite.")}</h2>
          <p>{t("Créer votre compte ne vous engage à rien et ne demande aucun document.")}</p>
        </div>
        <div className={styles.boutons}>
          <Link className="btn primary" href="/connexion?creer=1">
            {t("Créer mon compte")}
          </Link>
          <Link className="btn" href="/placements">
            {t("Nos placements")}
          </Link>
        </div>
      </section>

      <p className={styles.avertissement}>
        {t("Tout placement comporte un risque de perte en capital. Les performances passées ne préjugent pas des performances futures. Purpose Capital ne fournit pas de conseil en investissement personnalisé au sens réglementaire, sauf dans le cadre d'une convention qui le prévoit expressément.")}{" "}
        <Link href="/info/risques">{t("Ce qu'il faut savoir sur les risques")}</Link>
      </p>
    </div>
  );
}
