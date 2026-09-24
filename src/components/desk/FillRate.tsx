import type { DeskFill, LineFill } from "@/lib/market/fill";
import { fmtDate } from "@/lib/format";
import { getT } from "@/i18n/server";
import styles from "./FillRate.module.css";

/**
 * Ce qu'une ligne a fait de ses occasions, en une cellule.
 *
 * L'ordre de lecture est celui de la décision. D'abord le marché : sur les
 * séances cotées de l'année, combien ont vu la ligne s'échanger. C'est ce qui
 * dit si un ordre a une chance, et c'est disponible dès le premier bulletin
 * dépouillé. Ensuite nos propres ordres, quand il y en a assez pour que le
 * rapport veuille dire quelque chose.
 *
 * « Jamais échangée » se dit en toutes lettres et non par un 0 %, parce que
 * zéro sur deux cent soixante-six séances n'est pas un taux bas, c'est un
 * marché absent, et les deux n'appellent pas la même conduite : sur le premier
 * on prévient le client que l'exécution prendra du temps, sur le second on lui
 * dit qu'il n'y en aura pas.
 */
export async function FillRate({ line, desk }: { line?: LineFill; desk?: DeskFill }) {
  const t = await getT();
  if (!line || !line.sessions) return <span className="muted">—</span>;
  const pct = Math.round((line.rate ?? 0) * 100);
  const never = line.traded === 0;
  return (
    <span className={styles.cell}>
      <b className={never ? styles.never : pct >= 25 ? styles.good : styles.thin}>{never ? t("jamais échangée") : `${pct} %`}</b>
      <small className="muted">
        {t("{a} séances sur {b}", { a: String(line.traded), b: String(line.sessions) })}
        {line.lastTradedOn ? ` · ${t("dernier échange le {d}", { d: fmtDate(line.lastTradedOn) })}` : ""}
      </small>
      {desk && desk.total > 0 && (
        <small className={styles.desk}>
          {/* Un taux bâti sur un ordre tranché n'est pas un taux : on montre le compte. */}
          {desk.rate != null && desk.served + desk.missed >= 5
            ? t("nos ordres : {p} % servis", { p: String(Math.round(desk.rate * 100)) })
            : t("nos ordres : {s} servis, {m} non servis, {o} en cours", { s: String(desk.served), m: String(desk.missed), o: String(desk.open) })}
        </small>
      )}
    </span>
  );
}
