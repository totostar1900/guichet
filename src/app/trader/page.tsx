import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { ETAPES, servicesDuClient } from "@/lib/domain/services";
import { contexteDuClient } from "@/lib/domain/contexte-client";
import { getT } from "@/i18n/server";
import { ConseillerCard } from "./ConseillerCard";
import { CeQuiVousAttend } from "@/components/CeQuiVousAttend";
import { ServicesBande } from "./ServicesBande";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agir" };

/**
 * Trader : ce que vous pouvez faire, et par où chaque geste commence.
 *
 * LE TROU QUE CETTE PAGE BOUCHE. Le portefeuille suppose qu'on possède déjà, le
 * marché suppose qu'on sait quel instrument on cherche. Personne ne répondait à
 * « j'ai de l'argent, qu'est-ce que je peux en faire ». Les neuf services
 * vivaient sous « Mon espace », où l'on ne va pas chercher ce qu'on ne sait pas
 * offert.
 *
 * Elle absorbe l'ancienne page « Mes services » : l'état de marche et la porte
 * d'entrée étaient deux vues de la même chose. Chaque service porte donc trois
 * choses, et il en fallait trois : son ÉTAT, ce qu'il fait pour VOUS avec vos
 * chiffres, et ses ÉTAPES dans l'ordre. L'état dit où l'on en est, la phrase
 * dit ce que ça donne, les étapes disent ce qu'il va falloir faire.
 *
 * Un service se présente par son état, jamais par sa description : la règle vit
 * dans domain/services.ts, et les étapes avec elle.
 *
 * Le tableau du bas dit la chose que cette page ne peut pas faire seule : une
 * page de services ne suffit jamais, parce que personne ne va la chercher. Le
 * geste doit se présenter au moment où il sert, sur la ligne concernée. La
 * page l'annonce pour qu'on sache où le retrouver.
 */
export default async function TraderPage() {
  const s = await requireSession("/trader");
  const t = await getT();
  const r = repo();

  /* UN SEUL ASSEMBLAGE, ET C'EST CELUI DE contexte-client.
     Cette page en refaisait un deuxième, ligne pour ligne, pendant que la
     bande « Ce qui vous attend » lisait le premier : deux lectures du même
     client dans la même requête, donc deux occasions de diverger. C'est
     exactement ce que le dossier vient de prouver : le champ compteOuvert
     n'était rempli qu'ici, et la bande supposait partout le compte ouvert. */
  const [ctx, intents, advisor, dossier] = await Promise.all([
    contexteDuClient(s.userId),
    r.listIntents(),
    r.findAdvisor(s.userId).catch(() => undefined),
    r.getClientFileByUser(s.userId).catch(() => undefined),
  ]);

  // La dernière intention par la date, pas par l'ordre de la table : une
  // lecture qui suppose un tri que personne ne garantit finit par mentir.
  const derniere = [...intents.filter((i) => i.clientId === s.userId)].sort((a, b2) => b2.createdAt.localeCompare(a.createdAt))[0]?.ref;

  const services = servicesDuClient(ctx);

  /**
   * UN SEUL ÉTAT SE DIT, ET C'EST LE BON.
   *
   * Chaque service portait son état en toutes lettres, « en place », « à
   * activer », « indisponible », avec un numéro à côté et trois compteurs au-
   * dessus. Un service qui s'annonce indisponible ferme une porte que rien ne
   * ferme vraiment : il demande seulement qu'on ait commencé par autre chose,
   * et c'est cela qu'il faut dire.
   *
   * Reste donc la seule marque qui apprend quelque chose : ce qui tourne déjà.
   * Le reste se lit dans la phrase du service, qui dit par quoi commencer.
   */
  return (
    <div className={styles.page}>

      <header className={styles.tete}>
        <h1>{t("Agir")}</h1>
        <p>{t("Ce que Guichet peut faire pour vous, et par où chaque geste commence.")}</p>
      </header>

      {/* CE QUI DEMANDE LA MAIN D'ABORD. Un bulletin à signer, un coupon qui
          dort, une séance qui se ferme : ce sont les seules lignes de cette
          page qui ont une échéance, et elles étaient au bas d'un mur. */}
      <CeQuiVousAttend userId={s.userId} />

      <div className={styles.deuxColonnes}>
        <ServicesBande services={services} etapes={ETAPES} />

        {/* CE QUI SE LIT ET NE SE PREND PAS. La courbe, l'indice, les fiches
            et les leçons ne sont pas des services : rien ne s'y active, rien
            ne s'y signe. Les mêler aux rayons aurait fait croire à des gestes
            à faire, et c'est la seule raison pour laquelle ils sont ici et
            non dedans. */}
        <section className={styles.comprendre}>
          <h3>{t("Avant de placer, comprendre")}</h3>
          <p>{t("Ceux-là ne se prennent pas, ils se lisent : la courbe des taux de la zone, l'indice de la BVMAC et ses notes, les fiches des émetteurs, les leçons.")}</p>
          <div className={styles.comprendreLiens}>
            <Link href="/marche">{t("Le marché")}</Link>
            <Link href="/indice">{t("L'indice BVMAC")}</Link>
            <Link href="/emetteurs">{t("Les émetteurs")}</Link>
            <Link href="/info/aide">{t("Les leçons")}</Link>
          </div>
        </section>
        <ConseillerCard advisor={advisor} client={{ nom: s.name, compte: dossier?.review.custodianAccount, lignes: ctx.lignes, derniere }} />
      </div>


    </div>
  );
}
