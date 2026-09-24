import Link from "next/link";
import type { Position } from "@/lib/positions";
import { fmt, fmtDate } from "@/lib/format";
import { getT } from "@/i18n/server";
import styles from "./Reinvest.module.css";

/**
 * Ce qui est revenu récemment, et l'occasion de le replacer.
 *
 * Un coupon échu s'oublie. Il tombe sur un compte en banque, se mêle au reste
 * et cesse de rapporter, alors que la ligne qui l'a versé, elle, continue. Sur
 * un portefeuille obligataire tenu jusqu'à l'échéance, c'est la seule décision
 * que le client ait à prendre entre l'achat et le remboursement, et rien ne la
 * lui rappelait.
 *
 * Deux précautions de langage, parce qu'elles disent ce que l'application sait.
 *
 * Elle connaît la date d'échéance d'un flux, pas son arrivée : il n'y a pas
 * encore de journal des espèces. Le texte dit donc « échu », qui est vérifié,
 * jamais « reçu », qui ne l'est pas.
 *
 * Et elle ne recommande aucune ligne. Elle rappelle une somme et une date, puis
 * ouvre les listes. Choisir pour le client demanderait un agrément que la
 * maison n'a pas.
 */
export async function Reinvest({ positions, days = 120, now = new Date() }: { positions: Position[]; days?: number; now?: Date }) {
  const t = await getT();
  const flows = recentlyPaid(positions, days, now);
  if (!flows.length) return null;
  const total = flows.reduce((s, f) => s + f.amount, 0);
  const since = flows.map((f) => f.date).sort()[0];
  return (
    <div className={styles.strip}>
      <div>
        <b>{t("{m} FCFA échus depuis le {d}", { m: fmt(Math.round(total)), d: fmtDate(since) })}</b>
        <small>
          {flows
            .slice(0, 3)
            .map((f) => `${t(f.label)} · ${f.title} · ${fmtDate(f.date, false)}`)
            .join(" · ")}
          {flows.length > 3 ? ` · ${t("et {n} autres", { n: String(flows.length - 3) })}` : ""}
        </small>
      </div>
      <div className={styles.acts}>
        <Link className="btn sm primary" href="/">
          {t("Replacer cette somme")}
        </Link>
        <Link className="btn sm" href="/fonds">
          {t("Voir les fonds")}
        </Link>
      </div>
    </div>
  );
}

/** Les flux échus depuis moins de `days` jours, le plus récent d'abord. */
export function recentlyPaid(positions: Position[], days: number, now = new Date()): { date: string; amount: number; label: string; title: string }[] {
  const floor = new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  return positions
    .flatMap((p) => p.paid.map((f) => ({ ...f, title: p.offer.title })))
    // Un flux daté d'aujourd'hui ou d'hier n'a pas encore atteint le compte du
    // client : le rappeler le jour même ferait passer l'application pour mal
    // informée, ce qu'elle serait.
    .filter((f) => f.date >= floor && f.date < today && f.amount > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
}
