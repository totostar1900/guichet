import Link from "next/link";
import { fmt, fmtPct, money } from "@/lib/format";
import type { SocieteCompare } from "@/lib/market/index-period";
import { GRAPHE_L } from "@/lib/ui/graphe";
import { getT } from "@/i18n/server";
import { Profondeur } from "./Profondeur";
import styles from "./periode.module.css";

/**
 * LES SOCIÉTÉS COMPARÉES, EN QUATRE GRAPHIQUES (8 novembre 2026, planche « Sociétés de la cote », 4A : ils remplacent les deux tableaux).
 *
 * Même ordre de sociétés partout (le poids de fin), pour que l'œil passe d'un graphique à l'autre sur la même ligne. Trois dessins : le poids (début → fin, et le flottant), la paire
 * variation du cours / part des échanges qui partage ses noms de sociétés (un seul axe vertical), et le montant moyen d'une transaction. Dans la boîte de 320 unités de la maison :
 * le texte se lit au jeton, les axes sont écrits. Les chiffres exacts restent dans « Voir les chiffres ».
 */
const TXT = { fontSize: "var(--graphe-texte)" } as const;
const TXT_B = { fontSize: "var(--graphe-texte)", fontWeight: 700 } as const;
const W = GRAPHE_L;
const RH = 24;
const T = 34;
const LAB = 46;

const signed = (v: number, d = 1) => {
  const r = Number(v.toFixed(d));
  return `${r > 0 ? "+" : ""}${fmtPct(r === 0 ? 0 : v, d)}`;
};
const dec = (v: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const tonDe = (v: number) => (v > 0.05 ? "var(--good)" : v < -0.05 ? "var(--warn)" : "var(--ink-3)");
const haut = (max: number, pas: number) => Math.max(pas, Math.ceil(max / pas) * pas);

/** Le repère de début : un trait de la teinte `--repere`, cerné d'un liseré de la couleur du fond pour se détacher de la barre qu'il traverse comme du fond lui-même. */
function Repere({ x, y0, y1 }: { x: number; y0: number; y1: number }) {
  return (
    <>
      <line x1={x} x2={x} y1={y0} y2={y1} stroke="var(--surface)" strokeWidth={5} strokeLinecap="round" />
      <line x1={x} x2={x} y1={y0} y2={y1} stroke="var(--repere)" strokeWidth={2.5} strokeLinecap="round" />
    </>
  );
}

function Noms({ lignes, x }: { lignes: SocieteCompare[]; x: number }) {
  return (
    <>
      {lignes.map((l, i) => (
        <text key={l.mnemo} x={x} y={T + i * RH + RH / 2 + 4} textAnchor="end" fill="var(--ink)" style={TXT_B}>
          {l.mnemo}
        </text>
      ))}
    </>
  );
}

function Grille({ xs, y0, y1, etiquette }: { xs: number[]; y0: number; y1: number; etiquette: (i: number) => string }) {
  return (
    <>
      {xs.map((x, i) => (
        <g key={i}>
          <line x1={x} x2={x} y1={y0} y2={y1} stroke="var(--line)" strokeWidth={1} />
          <text x={x} y={y1 + 13} textAnchor="middle" fill="var(--ink-3)" style={TXT}>
            {etiquette(i)}
          </text>
        </g>
      ))}
    </>
  );
}

export async function Societes({ societes, capFin, capFlottantFin }: { societes: SocieteCompare[]; capFin: number; capFlottantFin: number }) {
  const t = await getT();
  if (societes.length === 0) return null;
  const n = societes.length;
  const bas = T + n * RH;
  const H = bas + 24;

  // 1 · le poids, début → fin, et ce qui se négocie
  const maxP = haut(Math.max(...societes.flatMap((s) => [s.poidsDebut, s.poidsFin, s.poidsFlottantFin])), 20);
  const p0 = LAB + 8;
  const p1 = 270;
  const xp = (v: number) => p0 + (v / maxP) * (p1 - p0);
  const gradP = [0, maxP / 2, maxP];

  // 2 · variation du cours (axe centré) | part des échanges
  const maxV = haut(Math.max(5, ...societes.map((s) => Math.abs(s.move))), 5);
  const v0 = LAB + 8;
  const v1 = 126;
  const xv = (v: number) => v0 + ((v + maxV) / (2 * maxV)) * (v1 - v0);
  const e0 = 198;
  const e1 = 270;
  const maxE = haut(Math.max(...societes.map((s) => Math.max(s.part, s.poidsFin))), 20);
  const xe = (v: number) => e0 + (v / maxE) * (e1 - e0);

  const tot = societes.reduce((a, s) => a + s.amount, 0);

  return (
    <>
      <figure className={styles.figure}>
        <div className={styles.titre}>{t("Qui pèse : le poids dans l'indice, du début à la fin de la période")}</div>
        <svg viewBox={`0 0 ${W} ${H + 12}`} className={styles.svg} role="img" aria-label={societes.map((s) => `${s.mnemo} ${fmtPct(s.poidsDebut, 1)} → ${fmtPct(s.poidsFin, 1)}`).join(", ")}>
          <text x={2} y={11} fill="var(--ink-2)" style={TXT}>
            {t("Poids dans l'indice (%)")}
          </text>
          <g transform="translate(2, 20)">
            <rect x={0} y={-4} width={12} height={8} rx={2} fill="var(--chart-out)" />
            <text x={17} y={3.5} fill="var(--ink-3)" style={TXT}>{t("fin")}</text>
            <Repere x={46} y0={-6} y1={6} />
            <text x={52} y={3.5} fill="var(--ink-3)" style={TXT}>{t("début")}</text>
            <rect x={96} y={-2} width={14} height={4} rx={2} fill="var(--chart-in)" />
            <text x={115} y={3.5} fill="var(--ink-3)" style={TXT}>{t("flottant coté, fin")}</text>
          </g>
          <Grille xs={gradP.map(xp)} y0={T} y1={bas} etiquette={(i) => `${fmt(gradP[i])} %`} />
          <Noms lignes={societes} x={LAB} />
          {societes.map((s, i) => {
            const y = T + i * RH;
            return (
              <g key={s.mnemo}>
                <rect x={p0} y={y + 3} width={Math.max(1.5, xp(s.poidsFin) - p0)} height={11} rx={2} fill="var(--chart-out)" />
                <Repere x={xp(s.poidsDebut)} y0={y} y1={y + 17} />
                <rect x={p0} y={y + 17} width={Math.max(1.5, xp(s.poidsFlottantFin) - p0)} height={4} rx={2} fill="var(--chart-in)" />
                <text x={W - 4} y={y + 12} textAnchor="end" fill="var(--ink-2)" style={{ fontSize: "var(--graphe-valeur)" }}>
                  {dec(s.poidsFin)} %
                </text>
              </g>
            );
          })}
        </svg>
        <p className={styles.legende}>{t("Barre : poids à la fin de la période. Trait : poids au début. Barre fine : poids sur le flottant coté, la part du capital qui circule en bourse et qu'on peut acheter. Calculé au premier cours de la période et au dernier, avec le dernier nombre de titres lu.")}</p>
      </figure>

      <figure className={styles.figure}>
        <div className={styles.titre}>{t("Qui a bougé, et qui s'échange : le cours et la part des échanges")}</div>
        <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img" aria-label={societes.map((s) => `${s.mnemo} ${signed(s.move)} · ${fmtPct(s.part, 0)}`).join(", ")}>
          <text x={v0} y={11} fill="var(--ink-2)" style={TXT}>
            {t("Cours (%)")}
          </text>
          <text x={e0} y={11} fill="var(--ink-2)" style={TXT}>
            {t("Part des échanges (%)")}
          </text>
          <text x={e0} y={24} fill="var(--ink-3)" style={TXT}>
            {t("trait : poids")}
          </text>
          <Grille xs={[xv(-maxV), xv(0), xv(maxV)]} y0={T} y1={bas} etiquette={(i) => (i === 1 ? "0" : `${i === 0 ? "−" : "+"}${fmt(maxV)}`)} />
          <Grille xs={[xe(0), xe(maxE / 2), xe(maxE)]} y0={T} y1={bas} etiquette={(i) => fmt((maxE / 2) * i)} />
          <Noms lignes={societes} x={LAB} />
          {societes.map((s, i) => {
            const y = T + i * RH + 5;
            const a = Math.min(xv(0), xv(s.move));
            const b = Math.max(xv(0), xv(s.move));
            return (
              <g key={s.mnemo}>
                <rect x={a} y={y} width={Math.max(1.5, b - a)} height={13} rx={2} fill={tonDe(s.move)} />
                <text x={172} y={y + 10} textAnchor="end" fill="var(--ink-2)" style={{ fontSize: "var(--graphe-valeur)" }}>
                  {signed(s.move)}
                </text>
                <rect x={e0} y={y} width={Math.max(1.5, xe(s.part) - e0)} height={13} rx={2} fill="var(--chart-out)" />
                <Repere x={xe(s.poidsFin)} y0={y - 3} y1={y + 16} />
                <text x={W - 4} y={y + 10} textAnchor="end" fill="var(--ink-2)" style={{ fontSize: "var(--graphe-valeur)" }}>
                  {fmtPct(s.part, 0)}
                </text>
              </g>
            );
          })}
        </svg>
        <p className={styles.legende}>{t("Une société qui fait une part des échanges plus petite que son poids se négocie moins que sa taille ne le laisse croire.")}</p>
      </figure>

      <Profondeur
        societes={societes.map((s) => ({ mnemo: s.mnemo, moyen: s.moyen, amount: s.amount, trades: s.trades }))}
        l={{
          titreMoyen: t("À quelle profondeur : le montant moyen d'une transaction"),
          titreTotal: t("Qui s'échange : le montant échangé sur la période"),
          titreTrans: t("Combien de fois : le nombre de transactions sur la période"),
          axeMoyen: t("Montant moyen par transaction ({u}) · nombre de transactions"),
          axeTotal: t("Montant échangé ({u}) · part des échanges"),
          axeTrans: t("Nombre de transactions"),
          moyen: t("Montant moyen"),
          total: t("Montant échangé"),
          trans: t("Transactions"),
          legMoyen: t("Chaque barre est suivie du nombre de transactions de la période : une grande transaction moyenne dit un marché qui se traite par blocs."),
          legTotal: t("Le montant échangé sur la période, suivi de la part de chaque société dans le total."),
          legTrans: t("Le nombre de transactions de la période : beaucoup de petites transactions ou peu de grosses ne disent pas la même chose."),
          groupe: t("Mesure affichée"),
        }}
      />

      <details className={styles.chiffres}>
        <summary>{t("Voir les chiffres")}</summary>
        <div className={styles.tableau}>
          <table>
            <thead>
              <tr>
                <th>{t("Société")}</th>
                <th>{t("Activité")}</th>
                <th>{t("Pays")}</th>
                <th className={styles.num}>{t("Cours")}</th>
                <th className={styles.num}>{t("Rendement")}</th>
                <th className={styles.num}>{t("Poids début")}</th>
                <th className={styles.num}>{t("Poids fin")}</th>
                <th className={styles.num}>{t("Capital global")}</th>
                <th className={styles.num}>{t("Flottant coté")}</th>
                <th className={styles.num}>{t("Poids du flottant")}</th>
                <th className={styles.num}>{t("Liquidité 3 mois")}</th>
                <th className={styles.num}>{t("Dernier dividende")}</th>
                <th className={styles.num}>{t("Variation du cours")}</th>
                <th className={styles.num}>{t("Écart avec l'indice")}</th>
                <th className={styles.num}>{t("Échangé")}</th>
                <th className={styles.num}>{t("Part")}</th>
                <th className={styles.num}>{t("Transactions")}</th>
                <th className={styles.num}>{t("Moyenne")}</th>
                <th className={styles.num}>{t("Séances avec échange")}</th>
              </tr>
            </thead>
            <tbody>
              {societes.map((s) => (
                <tr key={s.mnemo}>
                  <td>
                    <Link href={`/societes/${s.mnemo.toLowerCase()}`}>
                      <b>{s.mnemo}</b> · {s.name}
                    </Link>
                  </td>
                  <td>{t(s.sector)}</td>
                  <td>{t(s.country)}</td>
                  <td className={styles.num}>{fmt(s.price)}</td>
                  <td className={styles.num}>{s.yield != null ? fmtPct(s.yield, 1) : "—"}</td>
                  <td className={styles.num}>{fmtPct(s.poidsDebut, 1)}</td>
                  <td className={styles.num}>{fmtPct(s.poidsFin, 1)}</td>
                  <td className={styles.num}>{fmt(s.capFin / 1e6)} M</td>
                  <td className={styles.num}>{fmt(s.capFlottantFin / 1e6)} M</td>
                  <td className={styles.num}>{fmtPct(s.poidsFlottantFin, 1)}</td>
                  <td className={styles.num}>{s.liquidity3mPct != null ? fmtPct(s.liquidity3mPct, 2) : "—"}</td>
                  <td className={styles.num}>{s.dividend != null ? `${fmt(s.dividend)} FCFA` : "—"}</td>
                  <td className={`${styles.num} ${s.move > 0 ? styles.up : s.move < 0 ? styles.down : ""}`}>{signed(s.move)}</td>
                  <td className={`${styles.num} ${s.ecart > 0 ? styles.up : s.ecart < 0 ? styles.down : ""}`}>{signed(s.ecart)}</td>
                  <td className={styles.num}>{s.amount ? money(s.amount) : "—"}</td>
                  <td className={styles.num}>{tot ? fmtPct(s.part, 1) : "—"}</td>
                  <td className={styles.num}>{s.trades || "—"}</td>
                  <td className={styles.num}>{s.moyen ? money(s.moyen) : "—"}</td>
                  <td className={styles.num}>{s.seancesAvecEchange}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>{t("Ensemble")}</td>
                <td colSpan={4}>{t("flottant : {p} du capital global", { p: capFin ? fmtPct((capFlottantFin / capFin) * 100, 0) : "—" })}</td>
                <td className={styles.num}>100 %</td>
                <td className={styles.num}>100 %</td>
                <td className={styles.num}>{fmt(capFin / 1e6)} M</td>
                <td className={styles.num}>{fmt(capFlottantFin / 1e6)} M</td>
                <td className={styles.num}>100 %</td>
                <td colSpan={5} />
                <td className={styles.num}>{tot ? money(tot) : "—"}</td>
                <td className={styles.num}>100 %</td>
                <td className={styles.num}>{societes.reduce((a, s) => a + s.trades, 0) || "—"}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
        <div className={styles.definitions}>
          <p>
            <b>{t("Capital global")}</b> : {t("toutes les actions de la société × le cours, y compris les blocs de l'État ou des fondateurs. C'est la taille de la société ; une grosse société peu négociée pèse lourd.")}
          </p>
          <p>
            <b>{t("Flottant coté")}</b> : {t("seulement les titres en mains du public × le cours, ce qui peut vraiment s'acheter et se vendre. C'est le poids que le marché peut porter ; une grosse société à petit flottant pèse moins.")}
          </p>
        </div>
      </details>
    </>
  );
}
