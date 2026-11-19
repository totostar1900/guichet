import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { CONVENTION_VERSION, LEGAL_VERSION } from "@/data/legal";
import { RISQUES_VERSION } from "@/data/risques";
import { conventionAJour } from "@/lib/kyc/checklist";
import { fmtDate } from "@/lib/format";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Textes et conditions") };
}

/**
 * LES TEXTES DE LA MAISON, QUI NE SONT PAS VOS DOCUMENTS.
 *
 * La ligne de partage, arrêtée le 10 octobre 2026 : vos documents portent
 * VOTRE NOM ET UN NUMÉRO, ils sont produits pour vous et datés une fois ; les
 * textes sont les mêmes pour tout le monde et n'ont pas de numéro, ils ont
 * une VERSION. Les mélanger ferait grossir la page des documents de papiers
 * qui ne sont pas les vôtres.
 *
 * CETTE PAGE EST UN SOMMAIRE, PAS UNE COPIE. Chaque texte vit déjà quelque
 * part (les mentions à /info/mentions, les risques à /info/risques, l'annexe
 * à /moi/tarifs, la convention sur sa page) : on ne le recopie pas ici, on
 * dit où il est et où vous en êtes. Un sujet, un domicile.
 *
 * LE PONT AVEC VOS DOCUMENTS : un texte accepté prend une date et une
 * version, et reparaît dans « Ce que vous avez signé ». Ce qui n'a jamais été
 * signé reste ici seulement.
 */
export default async function TextesPage() {
  const t = await getT();
  const s = await requireSession("/moi/textes");
  const r = repo();
  const [consent, file] = await Promise.all([r.getConsent(s.userId).catch(() => ({}) as { version?: string; at?: string }), r.getClientFileByUser(s.userId).catch(() => undefined)]);
  const conventionOk = file ? conventionAJour(file) : false;

  /* Un seul geste d'acceptation couvre le texte de `legal.ts`, lu section par section sur quatre pages. */
  const etatDesMentions = consent.version === LEGAL_VERSION ? (consent.at ? t("acceptées le {d}", { d: fmtDate(consent.at, false) }) : t("acceptées")) : t("à accepter à votre prochaine connexion");
  const textes = [
    {
      cle: "mentions",
      titre: t("Mentions légales"),
      quoi: t("Qui est Purpose Capital, sous quel agrément, et qui le contrôle."),
      version: LEGAL_VERSION,
      etat: etatDesMentions,
      ok: consent.version === LEGAL_VERSION,
      href: "/info/mentions",
      geste: t("Lire"),
    },
    {
      cle: "conditions",
      titre: t("Conditions d'utilisation"),
      quoi: t("Le rôle de Guichet, de l'intention au titre inscrit, et la protection de votre argent."),
      version: LEGAL_VERSION,
      etat: etatDesMentions,
      ok: consent.version === LEGAL_VERSION,
      href: "/info/conditions",
      geste: t("Lire"),
    },
    {
      cle: "donnees",
      titre: t("Vos données personnelles"),
      quoi: t("Ce que nous gardons, à quoi cela sert, et comment les consulter ou les corriger."),
      version: LEGAL_VERSION,
      etat: etatDesMentions,
      ok: consent.version === LEGAL_VERSION,
      href: "/info/donnees",
      geste: t("Lire"),
    },
    {
      cle: "reclamation",
      titre: t("Réclamations"),
      quoi: t("À qui s'adresser d'abord, et la COSUMAF à défaut d'accord."),
      version: LEGAL_VERSION,
      etat: etatDesMentions,
      ok: consent.version === LEGAL_VERSION,
      href: "/info/reclamations",
      geste: t("Lire"),
    },
    {
      cle: "convention",
      titre: t("Convention de compte-titres"),
      quoi: t("Le contrat entre vous et Purpose Capital : ce que vous nous confiez, ce que nous vous devons."),
      version: CONVENTION_VERSION,
      etat: conventionOk && file?.consents.conventionAt ? t("signée le {d}", { d: fmtDate(file.consents.conventionAt, false) }) : file?.consents.conventionAt ? t("à reprendre : le texte a changé") : t("se signe après l'approbation de votre dossier"),
      ok: conventionOk,
      href: "/ouvrir-un-compte/convention",
      geste: conventionOk ? t("Lire") : t("Ouvrir"),
    },
    {
      cle: "tarifs",
      titre: t("Annexe tarifaire"),
      quoi: t("Ce qui se facture, et ce qui ne se facture pas. C'est elle que cite l'article 6 de votre convention."),
      etat: t("en vigueur"),
      href: "/moi/tarifs",
      geste: t("Lire"),
    },
    {
      cle: "risques",
      titre: t("Les risques que vous portez"),
      quoi: t("Capital, liquidité, taux, allocation : ce que chaque instrument peut vous coûter."),
      version: RISQUES_VERSION,
      etat: t("en vigueur"),
      href: "/info/risques",
      geste: t("Lire"),
    },
    {
      cle: "services",
      titre: t("Les règles de chaque service"),
      quoi: t("Garde, espèces, prélèvement, encaissement : chaque service dit sa règle, son tarif et son état."),
      etat: t("au cas par cas"),
      href: "/moi/services",
      geste: t("Vos services"),
    },
  ];

  return (
    <Glissement>
      <div className={styles.page}>
        <EnTete
          surTitre={t("La maison")}
          titre={t("Textes et conditions")}
          phrase={t("Les mêmes pour tout le monde. Ils n'ont pas de numéro : ils ont une version, et vous lisez toujours celle qui est en vigueur. Ceux que vous avez acceptés portent leur date, et se retrouvent aussi dans vos documents.")}
        />

        <ul className={styles.liste}>
          {textes.map((x) => (
            <li key={x.cle}>
              <Link href={x.href}>
                <span className={styles.quoi}>
                  <b>{x.titre}</b>
                  <small>{x.quoi}</small>
                </span>
                <span className={styles.etat}>
                  <span className={x.ok ? styles.ok : undefined}>{x.etat}</span>
                  {x.version && <small className="mono">{t("version {v}", { v: x.version })}</small>}
                </span>
                <span className="btn sm">{x.geste}</span>
              </Link>
            </li>
          ))}
        </ul>

        <p className={styles.pied}>{t("Un texte qui change vous est présenté à votre connexion suivante, et la version acceptée reste lisible dans vos documents.")}</p>
      </div>
    </Glissement>
  );
}
