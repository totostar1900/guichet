import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { fmt, fmtDate } from "@/lib/format";
import { lireLeReinvestissement } from "./donnees";
import styles from "./page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { EnBref } from "@/components/EnBref";

export const dynamic = "force-dynamic";
export const metadata = { title: "Réinvestir mes coupons" };

/**
 * RÉINVESTIR EST UN SOMMAIRE DE QUATRE PAGES (décision du 15 novembre 2026, « même geste partout »).
 *
 * Replacer ses coupons sans y penser : c'est la décision qu'on oublie entre l'achat et le remboursement. L'instruction ne porte pas de montant,
 * et c'est ce qui la distingue d'une épargne programmée : ce qui se place est ce qui est encaissé, constaté par une personne au journal des espèces.
 *
 * Chaque tuile dit son état sans qu'on l'ouvre. Un sommaire ne cache jamais un devoir : la tuile qui attend un geste le porte sur elle, et un usage
 * déjà couvert (une instruction active) n'est plus proposé ; une instruction à regarder n'est proposée que s'il y en a une.
 */
export default async function ReinvestirPage() {
  const s = await requireSession("/moi/reinvestir");
  const t = await getT();
  const { b, poche, enPlace, active, prochains } = await lireLeReinvestissement(s.userId);

  const tuiles: { href: string; nom: string; dit: string; attend?: string }[] = [
    {
      href: "/moi/reinvestir/solde",
      nom: t("Ce que vous avez aujourd'hui"),
      dit: `${t("{m} FCFA disponibles", { m: fmt(Math.round(poche.idle)) })}${
        b.nbAttendus ? ` · ${t("{n} échéances, la plus ancienne depuis {j} jours", { n: b.nbAttendus, j: b.retardMax })}` : prochains[0] ? ` · ${t("le prochain le {d}", { d: fmtDate(prochains[0].date) })}` : ""
      }`,
    },
  ];
  if (enPlace.length > 0) {
    tuiles.push({
      href: "/moi/reinvestir/instruction",
      nom: t("Mon instruction"),
      dit: t(enPlace.length > 1 ? "{n} instructions" : "1 instruction", { n: String(enPlace.length) }),
    });
  }
  if (!active) {
    tuiles.push({
      href: "/moi/reinvestir/mettre",
      nom: t("Mettre le réinvestissement en place"),
      dit: t("La ligne se choisit maintenant ; le montant sera celui du coupon."),
      attend: t("rien en place"),
    });
  }
  tuiles.push({ href: "/moi/reinvestir/fonctionnement", nom: t("Comment cela marche"), dit: t("Quatre temps, de l'arrivée du coupon à l'avis d'opéré.") });

  return (
    <Glissement>
      <div className={styles.page}>
        <EnTete
          titre={t("Réinvestir mes coupons")}
          phrase={t(
            "Un coupon qui dort sur un compte en banque cesse de rapporter pendant que la ligne qui l'a versé continue. Cette instruction replace ce qui vous revient, dès qu'il arrive, sur la ligne que vous choisissez maintenant.",
          )}
          aCote={<EnBref brief="reinvestissement" />}
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
