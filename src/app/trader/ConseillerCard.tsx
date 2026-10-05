import { conseillerDe, lienWhatsApp, type Conseiller } from "@/lib/domain/conseiller";
import type { StaffMember } from "@/lib/domain/types";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";

/**
 * « Votre conseiller » : une personne, et le message déjà écrit.
 *
 * LE TROU QUE CETTE CARTE BOUCHE. Joindre la maison demandait de passer par
 * l'aide ou par le menu « ⋮ », deux endroits où l'on va chercher quand on sait
 * déjà qu'on a un problème. Rien ne présentait la personne qui répond, et un
 * client qui ne sait pas qui l'écoute n'écrit pas.
 *
 * LE MESSAGE DIT CE QU'IL EMPORTE, et c'est le point qui a décidé du dessin.
 * Un lien `wa.me` préremplit le texte : il part donc avec le nom du client, son
 * compte et sa dernière référence, pour que personne n'ait à demander « qui
 * êtes-vous ». Transporter ces éléments sans les montrer serait une fuite sous
 * couvert de confort, alors la carte les affiche et dit que le client les relit
 * avant d'envoyer. C'est le navigateur qui lui présente le brouillon : ce qui
 * part est ce qu'il a accepté.
 *
 * Le repli n'est pas un cas dégradé : sans rattachement, le desk répond, et la
 * carte le dit sans s'excuser. Voir `domain/conseiller.ts` pour la règle du nom
 * sans numéro.
 */
export async function ConseillerCard({ advisor, client }: { advisor: StaffMember | undefined; client: { nom: string; compte?: string; lignes: number; derniere?: string } }) {
  const t = await getT();
  const c: Conseiller = conseillerDe(advisor);

  /* Chaque morceau porte sa clef et la ponctuation qui les joint est du texte :
     une phrase assemblée puis traduite ne trouve aucune clef. */
  const bouts = [client.compte ? t("Bonjour, je suis {nom}, compte {compte}.", { nom: client.nom, compte: client.compte }) : t("Bonjour, je suis {nom}.", { nom: client.nom })];
  if (client.derniere) bouts.push(t("Ma dernière intention porte la référence {ref}.", { ref: client.derniere }));
  const texte = bouts.join(" ");

  /* Ce que le lien emporte, dit au client dans ses propres termes. */
  const emporte = [client.compte ? t("compte {compte}", { compte: client.compte }) : undefined, client.lignes ? t("{n} lignes au dépositaire", { n: client.lignes }) : undefined, client.derniere ? t("dernière intention {ref}", { ref: client.derniere }) : undefined].filter(Boolean);

  return (
    <section className={styles.conseiller} aria-labelledby="conseiller-nom">
      <div className={styles.cTete}>
        {c.initiales ? (
          <span className={styles.cAvatar} aria-hidden="true">
            {c.initiales}
          </span>
        ) : (
          <span className={styles.cMarque} aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="8" r="3.2" />
              <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
              <path d="M16 5.6a3.2 3.2 0 0 1 0 6.3" />
              <path d="M17.5 14.6a5.5 5.5 0 0 1 3 4.9" />
            </svg>
          </span>
        )}
        <span className={styles.cQui}>
          <small className={styles.cEtiquette}>{c.nomme ? t("Votre conseiller") : t("Le desk du Guichet")}</small>
          <b id="conseiller-nom">{c.nom}</b>
          <span className={styles.cDispo}>{t("Écrivez sur WhatsApp, appelez, ou envoyez un e-mail : le desk répond en journée, du lundi au vendredi.")}</span>
        </span>
      </div>

      {emporte.length > 0 && (
        <p className={styles.cEmporte}>
          <small className={styles.cEtiquette}>{t("Le message part avec")}</small>
          <span>{emporte.join(" · ")}</span>
          <em>{t("Vous le relisez et le modifiez avant d'envoyer.")}</em>
        </p>
      )}

      <div className={styles.cGestes}>
        <a className={`btn primary ${styles.cWa}`} href={lienWhatsApp(c.telephone, texte)} target="_blank" rel="noopener noreferrer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 20.5l1.7-5.4A8.4 8.4 0 1 1 21 11.5Z" />
          </svg>
          {t("Écrire sur WhatsApp")}
        </a>
        <a className="btn" href={`tel:${c.telephone.replace(/\s/g, "")}`}>
          {/* Le numéro se dit quand c'est celui de la maison : il est déjà
              public. Celui d'un conseiller reste dans le lien. */}
          {c.nomme ? t("Appeler") : t("Appeler le {tel}", { tel: c.telephone })}
        </a>
        {c.email && (
          <a className={styles.cMail} href={`mailto:${c.email}`}>
            {t("Écrire un e-mail")}
          </a>
        )}
      </div>
    </section>
  );
}
