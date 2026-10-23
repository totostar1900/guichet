import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { Glissement } from "@/components/mobile/Glissement";
import { Rubriques } from "@/components/mobile/Rubriques";
import { CeQuiVousAttend } from "@/components/CeQuiVousAttend";
import { PORTEFEUILLE_PAGES } from "@/lib/nav-groups";
import styles from "@/components/Feuillet.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Portefeuille" };

/**
 * LE SOMMAIRE DU PORTEFEUILLE, UNE PAGE ET NON UNE FEUILLE.
 *
 * Le siège ouvrait un tiroir par le bas : une grille de tuiles, trois mots
 * chacune, posée par-dessus la page qu'on regardait. Elle coûtait déjà le
 * même nombre de gestes qu'une page — toucher le siège, choisir — mais elle
 * les coûtait sans rien offrir en échange : pas d'adresse à partager, pas de
 * retour système, et une phrase amputée à trois mots parce qu'une tuile n'a
 * pas la place.
 *
 * Une page a l'adresse, le retour, et la place d'une phrase entière. C'est
 * elle qui épargne le détour : sur un téléphone, ouvrir une destination pour
 * découvrir qu'on s'est trompé coûte deux gestes et une attente.
 *
 * ELLE PORTE CE QUI ATTEND. Un sommaire qui tairait un bulletin à signer
 * ferait exactement ce qu'un pli ne doit jamais faire : cacher un devoir
 * derrière un chemin. La bande vient donc avant les rubriques.
 *
 * LE TABLEAU DE BORD EST LA PREMIÈRE RUBRIQUE, et c'est voulu : c'est
 * l'ancienne racine du siège, et la déplacer sans la nommer l'aurait rendue
 * introuvable.
 */
export default async function PortefeuilleSommaire() {
  const s = await requireSession("/portefeuille");
  const t = await getT();

  return (
    <Glissement>
      <div className={styles.page}>
        <header className={styles.tete}>
          <h1>{t("Portefeuille")}</h1>
          <p>{t("Ce que vous avez, ce qui vous est dû, et ce que vos lignes ont rendu.")}</p>
        </header>

        <CeQuiVousAttend userId={s.userId} />

        <Rubriques items={PORTEFEUILLE_PAGES.map((p) => ({ href: p.href, nom: t(p.label), quoi: t(p.hint) }))} />
      </div>
    </Glissement>
  );
}
