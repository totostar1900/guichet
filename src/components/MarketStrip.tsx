import Link from "next/link";
import { getT } from "@/i18n/server";
import { deskSiblings } from "@/lib/market/pages";
import styles from "./MarketStrip.module.css";

/**
 * « Sur le même sujet » : les autres pages du marché BVMAC, au pied de
 * l'article. Toujours les mêmes, toujours dans le même ordre, tirées de
 * MARKET_PAGES : le lecteur apprend ce qu'elle contient et cesse de la lire.
 *
 * Elle ne remplace pas les liens du texte, elle les complète : un lien dans
 * une phrase porte sa raison, une bande de pied porte la famille.
 *
 * ELLE NE PARAÎT PLUS QU'AU DESK, et sa propre raison dit pourquoi. Elle a été
 * écrite pour le téléphone, « qui n'a pas la place d'une colonne » : les
 * pastilles ont été posées depuis, et le téléphone a donc sa liste en haut,
 * comme l'écran large a son rail. Mesuré le 5 octobre 2026 : chaque page du
 * marché portait sa famille deux fois, soit treize liens pour sept pages, dont
 * 109 px de bande au pied d'un téléphone.
 *
 * Le desk, lui, n'a ni rail ni pastilles : il lit les mêmes corps de page sous
 * sa propre barre, et la bande y reste sa seule porte vers la famille.
 */
export async function MarketStrip({ current, mode = "client" }: { current?: string; mode?: "client" | "desk" }) {
  const t = await getT();
  if (mode !== "desk") return null;
  const pages = deskSiblings(current);
  if (pages.length === 0) return null;
  return (
    <nav className={styles.strip} aria-label={t("Sur le même sujet")}>
      <b>{t("Sur le même sujet")}</b>
      {pages.map((p) => (
        <Link key={p.key} href={p.href} title={t(p.hint)}>
          {t(p.label)}
        </Link>
      ))}
    </nav>
  );
}
