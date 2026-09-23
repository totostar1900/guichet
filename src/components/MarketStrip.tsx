import Link from "next/link";
import { getT } from "@/i18n/server";
import { marketSiblings } from "@/lib/market/pages";
import styles from "./MarketStrip.module.css";

/**
 * « Sur le même sujet » : les autres pages du marché BVMAC, au pied de
 * l'article. Toujours les mêmes, toujours dans le même ordre, tirées de
 * MARKET_PAGES : le lecteur apprend ce qu'elle contient et cesse de la lire.
 *
 * Elle ne remplace pas les liens du texte, elle les complète : un lien dans
 * une phrase porte sa raison, une bande de pied porte la famille.
 */
export async function MarketStrip({ current }: { current?: string }) {
  const t = await getT();
  const pages = marketSiblings(current);
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
