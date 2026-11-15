import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { fmt, fmtDate } from "@/lib/format";
import { lireLEpargne } from "./donnees";
import styles from "./page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { EnBref } from "@/components/EnBref";

export const dynamic = "force-dynamic";
export const metadata = { title: "Épargne programmée" };

/**
 * L'ÉPARGNE PROGRAMMÉE EST UN SOMMAIRE DE TROIS PAGES (décision du 15 novembre 2026, planche « tuiles-liens »).
 *
 * Elle empilait trois plis à chevron : ce qui est en place, le formulaire (939 px dépliés à 390 px) et l'explication. Chaque tuile mène désormais à sa page,
 * et dit son état sans qu'on l'ouvre : « 2 actifs · prochain versement le 5 déc. », « rien en place ». Un sommaire ne cache jamais un devoir : la tuile
 * qui attend un geste le porte sur elle.
 *
 * PLACER CHAQUE MOIS N'EST PAS AUTORISER UN PRÉLÈVEMENT : ce sont deux décisions. L'épargne dit COMBIEN part, QUAND et VERS QUOI (un ordre debout) ;
 * le mandat dit seulement que la maison peut débiter un compte, sous un plafond. L'un peut vivre sans l'autre, et chacun nomme l'autre plutôt que de le contenir.
 */
export default async function EpargnePage() {
  const s = await requireSession("/moi/epargne");
  const t = await getT();
  const { actifs, prochain } = await lireLEpargne(s.userId);
  const parMois = actifs.reduce((somme, x) => somme + (x.amount ?? 0), 0);

  const tuiles: { href: string; nom: string; dit: string; attend?: string }[] = [
    {
      href: "/moi/epargne/en-place",
      nom: t("Mes épargnes programmées"),
      dit: actifs.length
        ? `${t(actifs.length > 1 ? "{n} actifs" : "1 actif", { n: String(actifs.length) })} · ${t("{m} FCFA par mois", { m: fmt(parMois) })}${prochain ? ` · ${t("prochain versement le {d}", { d: fmtDate(prochain, false) })}` : ""}`
        : t("Ce qui part chaque mois, et que vous arrêtez quand vous voulez. Rien n'est en place pour l'instant."),
    },
    {
      href: "/moi/epargne/nouvelle",
      nom: t("Mettre une épargne en place"),
      dit: t("Le fonds, la somme et le jour se choisissent ici."),
      attend: actifs.length === 0 ? t("rien en place") : undefined,
    },
    { href: "/moi/epargne/fonctionnement", nom: t("Comment cela marche"), dit: t("Ce qui part, comment c'est payé, et comment cela s'arrête.") },
  ];

  return (
    <Glissement>
      <div className={styles.page}>
        <EnTete
          titre={t("Épargne programmée")}
          phrase={t("Une somme fixe, un jour du mois, une destination choisie maintenant : le versement part tout seul, et vous l'arrêtez quand vous voulez. C'est un placement qui se répète, pas une autorisation de débit.")}
          aCote={<EnBref brief="epargne" />}
        />
        <div className={styles.tuiles}>
          {tuiles.map((x) => (
            <Link key={x.href} href={x.href} className={styles.tuile}>
              <span>
                <b>{x.nom}</b>
                <small>{x.dit}</small>
              </span>
              {x.attend && <em className={styles.attend}>{x.attend}</em>}
              <i aria-hidden="true">›</i>
            </Link>
          ))}
        </div>
      </div>
    </Glissement>
  );
}
