import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { Glissement } from "@/components/mobile/Glissement";
import { Rubriques } from "@/components/mobile/Rubriques";
import { Deconnexion } from "./Deconnexion";
import styles from "@/components/Feuillet.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Votre compte" };

/**
 * LE COMPTE DEVIENT UN SIÈGE, ET LA FEUILLE SE VIDE.
 *
 * La pastille d'identité portait onze blocs et deux écrans de défilement :
 * recherche, statut, canaux, huit tuiles, « Revoir », « Nous joindre »,
 * couleurs, quatre préférences, déconnexion, pied légal. Inventaire fait le
 * 24 octobre 2026 : SIX de ces onze blocs étaient de la navigation qui avait
 * trouvé sa porte ailleurs dans la semaine.
 *
 *   « Portefeuille » est un siège du dock ET un groupe du rail.
 *   « Le Guide · Aide · Risques · Mentions » : le siège « Aide » les porte.
 *   « Nous joindre » : la page « Nous contacter », où le message part déjà
 *   rempli du compte et de la dernière référence.
 *   « Revoir » : une section de ce même siège « Aide ».
 *
 * La feuille les gardait parce qu'elle avait été écrite quand elle était le
 * seul endroit où aller.
 *
 * LE CRITÈRE QUI RESTE : la pastille garde ce qui parle de VOUS ou de CET
 * APPAREIL ; tout ce qui est une destination s'en va. Ce qui reste tient en
 * cinq rubriques et une sortie, et trois des cinq mènent à des pages qui
 * existaient déjà — la feuille les atteignait par des tuiles de trois mots,
 * le sommaire les atteint par des lignes qui portent leur phrase.
 *
 * « SE DÉCONNECTER » EST LA SEULE LIGNE QUI N'EST PAS UNE DESTINATION, et
 * c'est assumé : on ne fait pas une page pour sortir. Elle se distingue donc
 * des cinq autres au lieu de se ranger parmi elles.
 */
export default async function ComptePage() {
  const s = await requireSession("/moi/compte");
  const t = await getT();
  const r = repo();

  const [fiche, canaux, appareils] = await Promise.all([
    r.getClientFileByUser(s.userId).catch(() => undefined),
    r.getChannelStatus(s.userId).catch(() => undefined),
    r.listDevices(s.userId).catch(() => []),
  ]);

  /* Chaque rubrique dit son état, et c'est ce qui épargne le détour : « 1
     canal · 0 appareil » répond avant qu'on ouvre la page. */
  const prouves = [canaux?.emailVerifiedAt, canaux?.phoneVerifiedAt].filter(Boolean).length;

  return (
    <Glissement>
      <div className={styles.page}>
        <header className={styles.tete}>
          <h1>{t("Votre compte")}</h1>
          <p>{t("Qui vous êtes, ce que la maison détient de vous, et ce que fait cet appareil-ci.")}</p>
        </header>

        <Rubriques
          items={[
            { href: "/moi/identite", nom: t("Qui vous êtes"), quoi: t("nom, ville, e-mail, WhatsApp"), etiquette: prouves ? t(prouves > 1 ? "{n} canaux prouvés" : "1 canal prouvé", { n: String(prouves) }) : t("aucun canal prouvé") },
            { href: "/ouvrir-un-compte", nom: t("Mes pièces"), quoi: t("votre dossier d'ouverture et les pièces qui le composent"), etiquette: fiche?.status === "approuve" ? t("approuvé") : undefined },
            { href: "/moi/profil", nom: t("Mon profil"), quoi: t("votre horizon, votre tolérance au risque, et ce que la maison en déduit") },
            { href: "/moi/securite", nom: t("Sécurité"), quoi: t("vos clés d'accès, les appareils reconnus, et comment les retirer"), etiquette: appareils.length ? t(appareils.length > 1 ? "{n} appareils" : "1 appareil", { n: String(appareils.length) }) : undefined },
            { href: "/moi/appareil", nom: t("Cet appareil"), quoi: t("alertes, couleurs, et par quel canal on vous joint d'abord") },
          ]}
        />

        <Deconnexion />
      </div>
    </Glissement>
  );
}
