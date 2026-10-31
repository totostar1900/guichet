import Link from "next/link";
import { repo } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { indexSeries, indexStats } from "@/lib/market/index";
import { getT } from "@/i18n/server";
import styles from "./IndexPulse.module.css";

const signed = (v?: number, d = 1) => (v == null ? "—" : `${v > 0 ? "+" : ""}${v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d })} %`);
const tone = (v?: number) => (v == null || Math.abs(v) < 0.005 ? styles.flat : v > 0 ? styles.up : styles.down);

/**
 * The pulse of the equity market: the BVMAC All Share Index as the last
 * bulletin printed it, the session, the month, the year to date and twelve
 * months, sixty sessions in a line. A price index, and a link to the lesson
 * that says how to read it. Quiet when no bulletin carried the index yet.
 */
export async function IndexPulse({
  compact,
  entete,
  liens = true,
}: {
  compact?: boolean;
  /** Le titre de section et son lien, quand la page en veut un : voir la note. */
  entete?: { titre: string; lien: { href: string; mot: string } };
  /**
   * LES DEUX SORTIES DU BAS DE LA CARTE, et la page qui peut s'en passer.
   *
   * RELEVÉ LE 1er NOVEMBRE 2026 par le dirigeant, sur « /marche » : quatre
   * sections y portaient leur lien en haut à droite et celle-ci les portait
   * EN BAS, au milieu de ses chiffres. Deux grammaires sur une page de cinq
   * cartes.
   *
   * La page du marché prend donc l'en-tête de la maison et éteint ces deux
   * liens : « voir l'indice » y redirait le lien de l'en-tête, et « comment
   * le lire » a sa propre section, qui dit ce qu'on y apprend.
   *
   * ELLES RESTENT ALLUMÉES PARTOUT AILLEURS, et le tableau de bord en est la
   * raison : son en-tête mène à « /marche », la famille, et ces deux liens
   * sont ses seules portes vers l'indice et vers la leçon. Les éteindre pour
   * tout le monde fermerait deux portes pour en aligner une.
   */
  liens?: boolean;
}) {
  const t = await getT();
  const bulletins = await repo().listBulletins(400).catch(() => []);
  const stats = indexStats(indexSeries(bulletins));
  if (!stats.last) return null;
  /**
   * LA SÉANCE PLATE EST LA RÈGLE, ET ELLE DOIT LE DIRE.
   *
   * L'indice bouge sur 70 des 271 séances lues depuis le 1er septembre 2025.
   * Un « 0,00 % » seul se lit « rien ne se passe », ou pire, « la page est
   * cassée » ; daté, il se lit « au repos depuis le 30 septembre ». Le seuil
   * est celui de l'affichage : une variation arrondie à zéro à l'écran n'est
   * pas un mouvement pour le lecteur.
   */
  const plat = stats.day == null || Math.abs(stats.day) < 0.005;
  const bouge = plat ? [...stats.points].reverse().find((x) => x.variationPct != null && Math.abs(x.variationPct) >= 0.005) : undefined;
  const pts = stats.points.slice(-60);
  const min = Math.min(...pts.map((p) => p.value));
  const max = Math.max(...pts.map((p) => p.value));
  const span = max - min || 1;
  const line = pts.map((p, i) => `${((i / Math.max(1, pts.length - 1)) * 416 + 2).toFixed(1)},${(56 - ((p.value - min) / span) * 50).toFixed(1)}`).join(" ");
  return (
    <>
      {/* LE TITRE S'EN VA AVEC LA PIÈCE, OU IL NE VIENT PAS.
          La page d'arrivée l'écrivait de son côté, dans une section à elle :
          « LE MARCHÉ · La place → », puis l'indice en dessous. Or l'indice
          rend « null » quand aucun bulletin ne le porte — c'est la règle qu'on
          lui demande — et ce jour-là il ne restait qu'un titre suivi de rien.
          Mesuré sur le dépôt mémoire, qui n'a aucun bulletin : la série du BOC
          est ingérée, jamais semée, donc c'était l'état de TOUTE page
          d'arrivée en développement.
          Le titre se passe donc en propriété, et il est rendu ici, après le
          seul endroit qui sait s'il y a quelque chose à montrer. Les deux
          pages du marché n'en demandent pas : elles ont leur propre en-tête,
          et elles n'arrivent jamais là par hasard. */}
      {entete && (
        <div className={styles.entete}>
          <h2>{entete.titre}</h2>
          <Link href={entete.lien.href}>{entete.lien.mot} →</Link>
        </div>
      )}
      <section className={`${styles.pulse} ${compact ? styles.compact : ""}`} aria-label="BVMAC All Share Index" data-coach="indice">
      <div className={styles.level}>
        <small>BVMAC All Share</small>
        <b>{stats.last.value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
        <span className={styles.date}>{fmtDate(stats.last.date)}</span>
      </div>
      <div className={styles.body}>
        <svg viewBox="0 0 420 60" role="img" aria-label={t("Soixante dernières séances de l'indice")} className={styles.spark}>
          <title>{t("Soixante dernières séances de l'indice")}</title>
          <line x1="0" y1="59" x2="420" y2="59" className={styles.axis} />
          {pts.length >= 2 && <polyline points={line} className={styles.line} />}
        </svg>
        <div className={styles.stats}>
          <span>
            {t("séance")} <b className={tone(stats.day)}>{signed(stats.day, 2)}</b>
          </span>
          <span>
            {t("un mois")} <b className={tone(stats.month)}>{signed(stats.month)}</b>
          </span>
          <span>
            {t("depuis le 1er janvier")} <b className={tone(stats.ytd)}>{signed(stats.ytd)}</b>
          </span>
          <span>
            {t("douze mois")} <b className={tone(stats.year)}>{signed(stats.year)}</b>
          </span>
          {plat && bouge && <span className={styles.calme}>{t("dernier mouvement le {d}, {v}", { d: fmtDate(bouge.date, false), v: signed(bouge.variationPct, 2) })}</span>}
          {plat && !bouge && stats.points.length > 1 && <span className={styles.calme}>{t("aucun mouvement depuis la première séance lue, le {d}", { d: fmtDate(stats.points[0].date) })}</span>}
          {liens && (
            <>
              <Link href="/indice" className={styles.how}>
                {t("voir l'indice")} →
              </Link>
              <Link href="/info/indice-bvmac" className={styles.how}>
                {t("comment le lire")} →
              </Link>
            </>
          )}
        </div>
      </div>
      <span className={styles.tag} title={t("Les dividendes ne sont pas comptés dans l'indice")}>
        {t("indice de prix")}
      </span>
      </section>
    </>
  );
}
