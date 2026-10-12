import Link from "next/link";
import { repo } from "@/lib/data";
import { emptyClientFile } from "@/lib/domain/kyc";
import { etapesDuDossier, missingForSubmission } from "@/lib/kyc/checklist";
import type { Session } from "@/lib/auth/types";
import { getT } from "@/i18n/server";
import styles from "./Dossier.module.css";

/**
 * L'ÉCRAN DE QUELQU'UN DONT LE COMPTE EST CRÉÉ ET LE DOSSIER PAS ENCORE PASSÉ.
 *
 * CE QU'IL VOYAIT AVANT. La console du client : « Bonjour Amina », un
 * portefeuille à zéro, un rendement vide, un relevé de rien, et au milieu une
 * pastille grise « Dossier à compléter ». L'écran lui montrait donc, en grand,
 * tout ce qu'il n'avait pas. Un portefeuille vide ressemble à un portefeuille,
 * et c'est la confusion qu'il fallait éviter en premier : un compte créé n'est
 * pas un client.
 *
 * LA RÈGLE DE CETTE PAGE, et elle tient en une phrase : ce qu'il n'a pas
 * encore, il ne le voit pas ; ce qui lui manque, il le lit en une ligne.
 *
 * TROIS BLOCS, ET PAS UN DE PLUS.
 *
 *   OÙ EN EST VOTRE DOSSIER   l'état, les étapes faites, et ce qui manque.
 *                             C'est la seule chose qui demande un geste, donc
 *                             c'est la seule qui porte un bouton plein.
 *   CE QUE VOUS POUVEZ DÉJÀ   le marché, les instruments, les publications.
 *                             Ces pages sont ouvertes à tout compte créé : ce
 *                             ne sont pas des promesses, ce sont des liens.
 *   CE QUI S'OUVRIRA          dit en toutes lettres, jamais grisé. Un bouton
 *                             grisé fait croire à une panne ; une phrase dit
 *                             une condition.
 *
 * AUCUN CHIFFRE DE PORTEFEUILLE ICI, pas même un zéro : il n'y a rien à
 * compter, et un zéro affirmerait qu'on a compté.
 */
export async function Dossier({ session }: { session: Session }) {
  const t = await getT();
  const r = repo();
  const enregistre = await r.getClientFileByUser(session.userId).catch(() => undefined);
  /* Le dossier naît à la première sauvegarde, pas au premier regard : sans
     ligne en base, une fiche d'affichage suffit, et son état est « brouillon ». */
  const file = enregistre ?? { id: "", ...emptyClientFile(session.userId, "physique", session.name, { phone: session.phone, email: session.email }) };

  const etapes = etapesDuDossier(file);
  const faites = etapes.filter((e) => e.fait).length;
  const manque = missingForSubmission(file);
  const aLaMain = file.status === "brouillon" || file.status === "complements";

  /* CE QUE L'ÉTAT VEUT DIRE POUR CELUI QUI LE LIT, et non pour la base. Le mot
     « brouillon » décrit une ébauche ; son dossier, lui, est simplement en
     cours. Et « approuvé » ne veut pas encore dire « compte actif » tant que
     la convention n'est pas acceptée. */
  const dit =
    file.status === "complements"
      ? { titre: t("Le bureau a besoin d'une précision"), corps: t("Nous avons examiné votre dossier et il manque peu de chose. Reprenez-le, le détail y est indiqué.") }
      : file.status === "soumis" || file.status === "en_revue"
        ? { titre: t("Votre dossier est entre nos mains"), corps: t("Le bureau l'examine. Vous n'avez rien à faire : nous revenons vers vous dès qu'il est instruit, et tout de suite si une pièce manque.") }
        : file.status === "approuve"
          ? { titre: t("Votre dossier est approuvé"), corps: t("Il reste la convention à accepter. C'est le dernier geste avant que votre compte ne s'ouvre.") }
          : file.status === "refuse"
            ? { titre: t("Votre dossier n'a pas pu être accepté"), corps: t("Écrivez-nous : nous vous dirons ce qui peut être repris.") }
            : enregistre
              ? { titre: t("Votre dossier est en cours"), corps: t("Vous le reprenez quand vous voulez, il vous attend tel que vous l'avez laissé.") }
              : { titre: t("Votre compte est créé"), corps: t("Il reste à ouvrir votre compte-titres pour pouvoir verser et placer. Dix minutes, à votre rythme, et vous pouvez vous arrêter en chemin.") };

  const geste =
    file.status === "approuve"
      ? { href: "/ouvrir-un-compte/convention", mot: t("Accepter la convention") }
      : aLaMain
        ? { href: "/ouvrir-un-compte", mot: enregistre ? t("Reprendre mon dossier") : t("Ouvrir mon compte-titres") }
        : undefined;

  return (
    <div className={styles.page}>
      <header className={styles.tete}>
        <span className="eyebrow">{t("Bonjour {p}", { p: session.name.split(" ")[0] })}</span>
        <h1>{dit.titre}</h1>
        <p>{dit.corps}</p>
        {geste && (
          <div className={styles.gestes}>
            <Link className="btn primary" href={geste.href}>
              {geste.mot}
            </Link>
            {aLaMain && <span className={styles.murmure}>{t("{n} étape(s) sur {total}", { n: faites, total: etapes.length })}</span>}
          </div>
        )}
      </header>

      {/* LES ÉTAPES, ET CE QUI MANQUE. Une barre qui avance sans dire de quoi
          elle est faite ne renseigne personne : chaque étape se nomme. */}
      {aLaMain && (
        <section className="panel">
          <div className="panel-h">
            <h2>{t("Où en est votre dossier")}</h2>
          </div>
          <ol className={styles.etapes}>
            {etapes.map((e) => (
              <li key={e.clef} className={e.fait ? styles.faite : undefined}>
                <span className={styles.marque} aria-hidden="true">
                  {e.fait ? (
                    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8.5l3.5 3.5L13 4.5" />
                    </svg>
                  ) : null}
                </span>
                <span>{t(e.clef)}</span>
              </li>
            ))}
          </ol>
          {manque.length > 0 && (
            <div className={styles.manque}>
              <b>{t("Ce qui manque pour l'envoyer")}</b>
              <ul>
                {manque.map((m) => (
                  <li key={m}>{t(m)}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* CE QUI EST DÉJÀ OUVERT. Des liens, pas des promesses : ces pages
          répondent à tout compte créé. */}
      <section className="panel">
        <div className="panel-h">
          <h2>{t("Ce que vous pouvez déjà faire")}</h2>
          <span className="muted">{t("sans attendre l'ouverture de votre compte-titres")}</span>
        </div>
        <div className={styles.portes}>
          <Link href="/marche" className={styles.porte}>
            <b>{t("Le marché")}</b>
            <span>{t("La courbe des taux de la zone, l'indice de la bourse régionale, et les séances annoncées.")}</span>
          </Link>
          <Link href="/titres" className={styles.porte}>
            <b>{t("Les instruments")}</b>
            <span>{t("Les emprunts d'État, les obligations, les actions cotées et les fonds agréés, avec leurs conditions.")}</span>
          </Link>
          <Link href="/indice/notes" className={styles.porte}>
            <b>{t("Nos publications")}</b>
            <span>{t("Ce que le bureau retient du marché, daté et référencé.")}</span>
          </Link>
        </div>
      </section>

      {/* CE QUI N'EST PAS ENCORE OUVERT : dit, jamais grisé. */}
      <section className="panel">
        <div className="panel-h">
          <h2>{t("Ce qui s'ouvrira")}</h2>
          <span className="muted">{t("quand votre dossier sera approuvé et la convention acceptée")}</span>
        </div>
        <ul className={styles.plusTard}>
          <li>{t("Un compte espèces ouvert à votre nom, que vous alimentez par virement")}</li>
          <li>{t("Vos ordres, sur les séances annoncées comme sur la cote")}</li>
          <li>{t("Votre portefeuille et l'échéancier de chaque ligne")}</li>
          <li>{t("Un conseiller attitré, dont le nom et le numéro figureront ici")}</li>
        </ul>
        <p className={styles.note}>{t("Rien ne part et rien n'est prélevé avant cela. Créer un compte ne vous engage à rien.")}</p>
      </section>

      <p className={styles.aide}>
        {t("Une question avant d'aller plus loin ?")} <Link href="/info">{t("le guide")}</Link>
        {" · "}
        <Link href="/info/risques">{t("les risques et les limites")}</Link>
      </p>
    </div>
  );
}
