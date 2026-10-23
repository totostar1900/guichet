import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { LEGAL_VERSION } from "@/data/legal";
import { getT } from "@/i18n/server";
import { Rubriques } from "@/components/mobile/Rubriques";
import { StatementButtons } from "../StatementButtons";
import { chargerLesRayons } from "./rayons";
import { RAYONS_DES_PAPIERS } from "./nav";
import styles from "./page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Mes documents") };
}

/**
 * LES PAPIERS DU CLIENT, EN QUATRE PAGES.
 *
 * LE PRINCIPE N'A PAS CHANGÉ, arrêté le 10 octobre 2026 : on cherche un
 * document par CE QU'IL PROUVE — ce qu'on a signé, ce qu'une opération a
 * produit, un mouvement d'argent, une démarche.
 *
 * CE QUI CHANGE, c'est que les quatre rayons étaient des PLIS. La bande d'un
 * rayon portait un chevron — elle promettait une page — et ne faisait que se
 * déplier sur place. Un niveau de plus, et le chevron dit vrai : un rayon est
 * une page, qui a une adresse, un retour, et la place de respirer.
 *
 * CETTE PAGE NE COMPTE PLUS RIEN. Elle annonçait « {n} documents » par bande
 * et une barre « Tout replier » : le compteur disait sur la page d'avant ce
 * que porte la page suivante, et il n'y a plus rien à replier. Chaque bande
 * dit ce qu'on y trouve ; c'est la page du rayon qui compte.
 *
 * « ÉDITER UN RELEVÉ » RESTE EN TÊTE, et c'est le seul bloc qui ne soit pas un
 * rayon : c'est le seul papier qui n'existe pas encore quand on arrive.
 *
 * LES TEXTES DE LA MAISON N'Y SONT PAS. Ils n'ont pas de numéro, ils ont une
 * version, et ils sont les mêmes pour tous : ils vivent à « /moi/textes ».
 */
export default async function DocumentsPage() {
  const t = await getT();
  const s = await requireSession("/moi/documents");
  const { tientQuelqueChose } = await chargerLesRayons(s.userId, t);

  return (
    <Glissement>
      <div className={styles.page}>
        <EnTete
          retour={{ href: "/", mot: t("Portefeuille") }}
          surTitre={t("Vos papiers")}
          titre={t("Mes documents")}
          phrase={t("Tout ce qui porte votre nom et un numéro : ce que vous avez signé, ce que vos opérations ont produit, et les mouvements de votre argent.")}
        />

        {/* CE QUI SE FABRIQUE OUVRE LA PAGE : c'est le seul papier qui n'existe
            pas encore quand on arrive. SANS POSITION IL N'Y A RIEN À ÉDITER :
            l'attestation sortait avec un tableau vide et une place pour le
            cachet, soit un papier signé qui ne déclare rien. */}
        <section className={styles.editer}>
          <div>
            <b>{t("Éditer un relevé")}</b>
            <small>{tientQuelqueChose ? t("Le relevé de position et l'attestation de détention se fabriquent à la date que vous choisissez.") : t("Dès votre première opération réglée, le relevé de position et l'attestation de détention s'éditent ici.")}</small>
          </div>
          {tientQuelqueChose && <StatementButtons />}
        </section>

        <Rubriques items={RAYONS_DES_PAPIERS.map((r) => ({ href: r.href, nom: t(r.nom), quoi: t(r.quoi) }))} />

        {/* LES TEXTES DE LA MAISON ONT LEUR PORTE, et ne sont pas dans la liste :
            ils n'ont pas de numéro, ils ont une version, et ils sont les mêmes
            pour tout le monde. */}
        <div className={styles.pied}>
          <span>
            <b>{t("Les textes de la maison")}</b>
            <small>{t("Mentions, risques, annexe tarifaire, règles des services : les mêmes pour tous, version par version.")}</small>
          </span>
          <Link className="btn sm" href="/moi/textes">
            {t("Textes et conditions")}
          </Link>
        </div>
        <p className={styles.version}>{t("Mentions en vigueur : version {v}.", { v: LEGAL_VERSION })}</p>
      </div>
    </Glissement>
  );
}
