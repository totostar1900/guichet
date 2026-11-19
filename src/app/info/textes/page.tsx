import Link from "next/link";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { COMPANY } from "@/lib/config";
import { CONVENTION_VERSION, LEGAL_VERSION } from "@/data/legal";
import { RISQUES_VERSION } from "@/data/risques";
import { conventionAJour } from "@/lib/kyc/checklist";
import { fmtDate } from "@/lib/format";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Textes et conditions") };
}

/**
 * LA PORTE PUBLIQUE DES TEXTES (18 novembre 2026, le client : « une page similaire à celle de Bamboo, où l'on range tous les textes que les clients signent… le meilleur des deux mondes, sans afficher de grille ou de politique tarifaire au public »).
 *
 * LES DEUX MONDES. De Bamboo, la liste à plat : un texte, une phrase, une porte, sans carte. De Revolut, la version et la date de chaque texte, et la ligne qui dit de quoi le contrat se compose.
 * CE QUE GUICHET A DE PLUS, GARDÉ : la version levée à la main, et pour chaque signataire le PDF du texte en vigueur ce jour-là (les exemplaires signés restent dans « Mes documents »).
 *
 * UN SUJET, UN DOMICILE (la règle de « /moi/textes ») : cette page est un SOMMAIRE, pas une copie. Chaque texte vit ailleurs ; ici, on dit où il est, quelle version est en vigueur, et, pour un client connecté, où il en est.
 * SIGNER NE SE FAIT PAS ICI : une page publique n'a pas d'identité, donc pas de signature. Les mentions s'acceptent à la connexion, la convention se signe sur sa page, après l'approbation du dossier.
 *
 * AUCUNE GRILLE, AUCUNE TARIFICATION EN PUBLIC (le client, le même jour) : ni l'annexe tarifaire ni les règles de chaque service (qui disent leur tarif) ne sont listées ici ; elles restent dans « /moi/textes », derrière la connexion. La convention, elle, EST publiée en lecture seule à « /info/convention », article 6 compris (le client, le lendemain) : cet article ne contient aucune grille, il renvoie à l'annexe tarifaire remise par le conseiller, comme les conditions de Revolut renvoient à leur page des frais. La ligne sur la composition du contrat nomme « les conditions tarifaires remises par votre conseiller », sans en dire le contenu.
 * L'ADRESSE n'est pas répétée ici (le client l'a retirée de la présentation) : le nom de la maison et son agrément, et le renvoi aux mentions, qui portent l'identité complète.
 */
export default async function TextesPublicsPage() {
  const t = await getT();
  const s = await getSession().catch(() => null);
  const client = s && s.role === "client" ? s : null;
  const r = repo();
  const [consent, file] = client ? await Promise.all([r.getConsent(client.userId).catch(() => ({}) as { version?: string; at?: string }), r.getClientFileByUser(client.userId).catch(() => undefined)]) : [undefined, undefined];
  const conventionOk = file ? conventionAJour(file) : false;

  /* UN SEUL GESTE D'ACCEPTATION couvre le texte de `legal.ts`, lu section par section sur quatre pages : chacune dit l'état de cette acceptation. */
  const etatDesMentions = client ? (consent?.version === LEGAL_VERSION ? (consent.at ? t("acceptées le {d}", { d: fmtDate(consent.at, false) }) : t("acceptées")) : t("à accepter à votre prochaine connexion")) : undefined;
  type Texte = { cle: string; titre: string; quoi: string; version: string; href?: string; etat?: string; ok?: boolean; geste?: string };
  const textes: Texte[] = [
    {
      cle: "mentions",
      titre: t("Mentions légales"),
      quoi: t("Qui est Purpose Capital, sous quel agrément, et qui le contrôle."),
      version: LEGAL_VERSION,
      href: "/info/mentions",
      etat: etatDesMentions,
      ok: client ? consent?.version === LEGAL_VERSION : undefined,
    },
    {
      cle: "conditions",
      titre: t("Conditions d'utilisation"),
      quoi: t("Le rôle de Guichet, de l'intention au titre inscrit, et la protection de votre argent."),
      version: LEGAL_VERSION,
      href: "/info/conditions",
      etat: etatDesMentions,
      ok: client ? consent?.version === LEGAL_VERSION : undefined,
    },
    {
      cle: "risques",
      titre: t("Les risques que vous portez"),
      quoi: t("Capital, liquidité, taux, allocation : ce que chaque instrument peut vous coûter."),
      version: RISQUES_VERSION,
      href: "/info/risques",
    },
    {
      cle: "donnees",
      titre: t("Vos données personnelles"),
      quoi: t("Ce que nous gardons, à quoi cela sert, et comment les consulter ou les corriger."),
      version: LEGAL_VERSION,
      href: "/info/donnees",
      etat: etatDesMentions,
      ok: client ? consent?.version === LEGAL_VERSION : undefined,
    },
    {
      cle: "reclamation",
      titre: t("Réclamations"),
      quoi: t("À qui s'adresser d'abord, et la COSUMAF à défaut d'accord."),
      version: LEGAL_VERSION,
      href: "/info/reclamations",
      etat: etatDesMentions,
      ok: client ? consent?.version === LEGAL_VERSION : undefined,
    },
    {
      cle: "convention",
      titre: t("Convention de compte-titres"),
      quoi: t("Le contrat entre vous et Purpose Capital : ce que vous nous confiez, ce que nous vous devons."),
      version: CONVENTION_VERSION,
      /* Publiée en lecture seule, article 6 compris (le client, le 19 novembre) ; un client connecté va à SA convention, qui se signe. */
      href: client ? "/ouvrir-un-compte/convention" : "/info/convention",
      etat: conventionOk && file?.consents.conventionAt ? t("signée le {d}", { d: fmtDate(file.consents.conventionAt, false) }) : file?.consents.conventionAt ? t("à reprendre : le texte a changé") : t("se signe après l'approbation de votre dossier"),
      ok: client ? conventionOk : undefined,
      geste: client ? (conventionOk ? t("Lire") : t("Ouvrir")) : t("Lire"),
    },
  ];

  return (
    <Glissement>
      <div className={styles.page}>
        <EnTete
          surTitre={t("La maison")}
          titre={t("Textes et conditions")}
          phrase={t("Les mêmes pour tout le monde. Chaque texte porte sa version, et vous lisez toujours celle qui est en vigueur.")}
        />

        <ul className={styles.liste}>
          {textes.map((x) => {
            const corps = (
              <>
                <span className={styles.quoi}>
                  <b>{x.titre}</b>
                  <small>{x.quoi}</small>
                </span>
                <span className={styles.etat}>
                  {x.etat && <span className={x.ok ? styles.ok : undefined}>{x.etat}</span>}
                  <small className="mono">{t("version du {d}", { d: fmtDate(x.version) })}</small>
                </span>
                <span className={styles.geste} aria-hidden="true">
                  {x.href ? "→" : ""}
                </span>
              </>
            );
            return <li key={x.cle}>{x.href ? <Link href={x.href} aria-label={`${x.titre} · ${x.geste ?? t("Lire")}`}>{corps}</Link> : <div className={styles.sansPorte}>{corps}</div>}</li>;
          })}
        </ul>

        <p className={styles.contrat}>{t("Votre contrat se compose de la convention de compte-titres, des mentions légales, des conditions d'utilisation et des conditions tarifaires que remet votre conseiller.")}</p>
        <p className={styles.pied}>
          {t("Un texte qui change vous est présenté à votre connexion suivante ; la version que vous avez acceptée reste lisible dans vos documents.")}
          {client && (
            <>
              {" "}
              <Link href="/moi/textes">{t("Vos textes et conditions")}</Link>
            </>
          )}
        </p>
        <p className={styles.maison}>
          <b>{COMPANY.legalName}</b>, {t(COMPANY.licence)}
        </p>
      </div>
    </Glissement>
  );
}
