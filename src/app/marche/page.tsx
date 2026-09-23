import Link from "next/link";
import { IndexPulse } from "@/components/IndexPulse";
import { MarketStrip } from "@/components/MarketStrip";
import { COMPANY } from "@/lib/config";
import { fmt, fmtDate, fmtPct, money } from "@/lib/format";
import { indexPageData } from "@/lib/market/index-data";
import { quarters } from "@/lib/market/index-quarter";
import { publishedNews } from "@/lib/news";
import { loadCompanies } from "@/lib/reference";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Le marché" };

const signed = (v?: number, d = 2) => {
  if (v == null) return "—";
  const r = Number(v.toFixed(d));
  return `${r > 0 ? "+" : ""}${fmtPct(r === 0 ? 0 : v, d)}`;
};

/**
 * Le marché : la porte d'entrée de l'environnement BVMAC.
 *
 * L'indice, les sept sociétés cotées, les notes trimestrielles, de quoi
 * comprendre, et les avis de la Bourse. Rien n'est produit ici : chaque
 * section montre ce qui existe déjà et mène à sa page. La page de l'indice
 * n'était rattachée à aucun onglet ; c'est cette porte qui manquait.
 */
export default async function MarchePage() {
  const t = await getT();
  const [data, companies, news] = await Promise.all([indexPageData(), loadCompanies().catch(() => []), publishedNews().catch(() => [])]);
  const { weights, nameOf, lastBulletin, movers } = data;
  const notes = quarters(data).slice(0, 4);
  const capTotal = weights.reduce((s, w) => s + w.capTotal, 0);
  const capFloat = weights.reduce((s, w) => s + w.capFloat, 0);
  const day = lastBulletin ? (movers.get(lastBulletin.sessionDate) ?? []) : [];
  const moveOf = (mnemo: string) => day.find((m) => m.mnemo === mnemo)?.variationPct;
  const avis = news.slice(0, 4);

  return (
    <>
      <header className={styles.head}>
        <div className="eyebrow">BVMAC · {t("Bourse des Valeurs Mobilières de l'Afrique Centrale")}</div>
        <h1 className="display">{t("Le marché")}</h1>
        <p className={styles.lead}>
          {t("Ce que la Bourse publie à chaque séance, et ce que nous en lisons : l'indice, les sociétés cotées, et les notes que nous en tirons.")}
          {lastBulletin ? ` ${t("Dernier bulletin lu : n° {n} du {d}.", { n: String(lastBulletin.number), d: fmtDate(lastBulletin.sessionDate) })}` : ""}
        </p>
      </header>

      <IndexPulse />

      {weights.length > 0 && (
        <section className="panel" id="societes">
          <div className="panel-h">
            <h2>{t("Les sociétés cotées")}</h2>
            <Link className="btn sm ghost" href="/societes">
              {t("Chaque société")} →
            </Link>
          </div>
          <div className="scroll-x">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("Société")}</th>
                  <th>{t("Activité")}</th>
                  <th className={styles.num}>{t("Cours")}</th>
                  <th className={styles.num}>{t("Séance")}</th>
                  <th className={styles.num}>{t("Poids")}</th>
                </tr>
              </thead>
              <tbody>
                {weights.map((w) => {
                  const c = companies.find((x) => x.mnemo === w.mnemo);
                  const mv = moveOf(w.mnemo);
                  return (
                    <tr key={w.mnemo}>
                      <td>
                        <Link href={`/societes/${w.mnemo.toLowerCase()}`}>
                          <b>{w.mnemo}</b> · {c?.shortName ?? nameOf(w.mnemo)}
                        </Link>
                      </td>
                      <td className="muted">{c?.sector ? t(c.sector) : "—"}</td>
                      <td className={styles.num}>{fmt(w.close)}</td>
                      <td className={`${styles.num} ${mv && mv > 0 ? styles.up : mv && mv < 0 ? styles.down : ""}`}>{signed(mv ?? 0)}</td>
                      <td className={styles.num}>{fmtPct(w.weightTotal, 1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className={styles.note}>
            {t("Capitalisation {c} FCFA · flottant coté {f} ({p}).", { c: money(capTotal), f: money(capFloat), p: capTotal ? fmtPct((capFloat / capTotal) * 100, 1) : "—" })}{" "}
            {t("Le poids est celui du capital global ; la page de l'indice donne aussi la lecture en flottant.")}
          </p>
        </section>
      )}

      <div className={styles.cols}>
        <section className="panel" id="notes">
          <div className="panel-h">
            <h2>{t("Les notes de marché")}</h2>
            <Link className="btn sm ghost" href="/indice#notes">
              {t("Toutes les notes")} →
            </Link>
          </div>
          {notes.length === 0 ? (
            <div className="empty">{t("La première note paraîtra à la fin du premier trimestre entièrement lu.")}</div>
          ) : (
            <div className={styles.chips}>
              {notes.map((q) => (
                <Link key={q.key} className="btn sm" href={`/indice/note/${q.key.toLowerCase()}`}>
                  {t(q.q === 1 ? "1er trimestre {y}" : "{n}e trimestre {y}", { n: q.q, y: q.year })} →
                </Link>
              ))}
            </div>
          )}
          <p className={styles.note}>{t("Une note par trimestre : ce que le trimestre a fait, les sociétés derrière le chiffre, ce qui s'est échangé, et ce que l'indice ne dit pas. Publique, et en PDF.")}</p>
        </section>

        <section className="panel" id="comprendre">
          <div className="panel-h">
            <h2>{t("Comprendre")}</h2>
          </div>
          <div className={styles.chips}>
            <Link className="btn sm" href="/info/indice-bvmac">
              {t("La leçon : comment lire l'indice")} →
            </Link>
            <Link className="btn sm" href="/comparer">
              {t("Comparer deux lignes")} →
            </Link>
            <Link className="btn sm" href="/indice#donnees">
              {t("Ce que publie le bulletin")} →
            </Link>
          </div>
          <p className={styles.note}>{t("L'indice se lit dans le bulletin officiel de la cote, séance après séance. Le Guichet le montre tel qu'il est publié ; il n'en construit pas et ne mesure personne contre lui.")}</p>
        </section>
      </div>

      <section className="panel" id="avis">
        <div className="panel-h">
          <h2>{t("Les avis de la Bourse")}</h2>
          {avis.length > 0 && (
            <Link className="btn sm ghost" href="/actualites">
              {t("Toutes les actualités")} →
            </Link>
          )}
        </div>
        {avis.length === 0 ? (
          <div className="empty">{t("Aucun avis publié pour l'instant. Les avis reçus de la Bourse sont relus par le desk avant de paraître ici.")}</div>
        ) : (
          <ul className={styles.avis}>
            {avis.map((n) => (
              <li key={n.id}>
                <a href={n.url} target="_blank" rel="noreferrer">
                  {n.title}
                </a>
                <small>
                  {n.source} · {fmtDate(n.publishedAt)}
                </small>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className={styles.source}>
        {t("Source : bulletin officiel de la cote de la BVMAC, lu à chaque parution ; calculs {c}.", { c: COMPANY.legalName })}
      </p>

      <MarketStrip current="marche" />
    </>
  );
}
