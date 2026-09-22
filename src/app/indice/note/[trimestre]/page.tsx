import Link from "next/link";
import { notFound } from "next/navigation";
import { COMPANY } from "@/lib/config";
import { fmt, fmtDate, fmtPct, money } from "@/lib/format";
import { indexPageData } from "@/lib/market/index-data";
import { quarterNote, quarters } from "@/lib/market/index-quarter";
import { getT } from "@/i18n/server";
import styles from "./note.module.css";

export const dynamic = "force-dynamic";

const signed = (v?: number, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);
const pts = (v: number) => `${v > 0 ? "+" : ""}${fmtPct(v, 2).replace(" %", " pt")}`;

export async function generateMetadata({ params }: { params: Promise<{ trimestre: string }> }) {
  const { trimestre } = await params;
  const note = await quarterNote(trimestre.toUpperCase());
  return { title: note ? `L'indice BVMAC au ${note.quarter.label}` : "Note trimestrielle" };
}

/**
 * The quarterly note on the index, public and written for a client: what the
 * quarter did, the seven companies behind the number, what the index measures
 * and what it does not. Computed from that quarter's sessions only, so a
 * published quarter reads the same a year later.
 */
export default async function QuarterNotePage({ params }: { params: Promise<{ trimestre: string }> }) {
  const [{ trimestre }, t] = await Promise.all([params, getT()]);
  const data = await indexPageData();
  const list = quarters(data, true);
  const note = await quarterNote(trimestre.toUpperCase(), data);
  if (!note) notFound();
  const n = note;
  const traded = n.lines.filter((l) => l.trades > 0);
  const top = n.lines.reduce((a, l) => (Math.abs(l.points) > Math.abs(a.points) ? l : a), n.lines[0]);
  const share = (pct: number) => `${Math.max(0, Math.min(100, pct))}%`;
  /** The note writes its sentences as keys and values: they read in the visitor's language. */
  const say = (ss: { key: string; vars?: Record<string, string | number> }[]) => ss.map((x) => t(x.key, x.vars)).join(" ");
  const qlabel = (q: { q: number; year: number }) => t(q.q === 1 ? "1er trimestre {y}" : "{n}e trimestre {y}", { n: q.q, y: q.year });
  const others = list.filter((q) => q.key !== n.quarter.key).slice(0, 4);

  return (
    <article className={styles.sheet}>
      <header className={styles.masthead}>
        <span className={styles.house}>{COMPANY.name} · {t("Note de marché")}</span>
        <span className={styles.meta}>
          {n.number} · {t("trimestriel")} · {t("séances du {a} au {b}", { a: fmtDate(n.quarter.from), b: fmtDate(n.quarter.to) })}
        </span>
      </header>

      <h1 className={styles.title}>{t("L'indice BVMAC All Share au {q}", { q: qlabel(n.quarter) })}</h1>
      <p className={styles.stand}>{say(n.headline)}</p>
      <p className={styles.byline}>
        {t("Lecture des bulletins officiels de la cote ; calculs {c}", { c: COMPANY.legalName })} · <Link href="/indice">{t("la page de l'indice, mise à jour à chaque séance")}</Link>
      </p>

      <dl className={styles.fiche}>
        <div>
          <dt>{t("Niveau")}</dt>
          <dd>{fmt(n.level)}</dd>
          <small>{t("au {d}", { d: fmtDate(n.quarter.to) })}</small>
        </div>
        <div>
          <dt>{t("Le trimestre")}</dt>
          <dd className={n.ret > 0 ? styles.up : n.ret < 0 ? styles.down : ""}>{signed(n.ret)}</dd>
          <small>{t("douze mois")} {signed(n.year, 1)}</small>
        </div>
        <div>
          <dt>{t("Séances avec mouvement")}</dt>
          <dd>
            {n.moved} / {n.sessions}
          </dd>
          <small>{n.up} {t("hausses")} · {n.down} {t("baisses")}</small>
        </div>
        <div>
          <dt>{t("Échangé")}</dt>
          <dd>{money(n.amount)}</dd>
          <small>FCFA · {n.trades} {t("transactions")}</small>
        </div>
        <div>
          <dt>{t("Capitalisation")}</dt>
          <dd>{money(n.capTotal)}</dd>
          <small>{t("flottant coté")} {money(n.capFloat)}</small>
        </div>
      </dl>

      <section>
        <h2>
          <span className={styles.n}>01</span> {t("Ce que le trimestre a fait")}
        </h2>
        <p>{say(n.reading)}</p>
        <figure className={styles.figure}>
          <div className={styles.figtitle}>{t("Niveau de l'indice, fin de mois")}</div>
          <div className={styles.bars}>
            {n.monthly.map((m) => {
              const lo = Math.min(n.low.value, n.levelBefore) * 0.995;
              const hi = Math.max(n.high.value, n.levelBefore) * 1.005;
              const h = ((m.value - lo) / Math.max(1, hi - lo)) * 100;
              return (
                <div key={m.label} className={styles.bar}>
                  <b>{fmt(m.value)}</b>
                  <i style={{ height: `${Math.max(6, h)}%` }} className={m.ret > 0 ? styles.barUp : m.ret < 0 ? styles.barDown : ""} />
                  <span>{t(m.label)}</span>
                  <em className={m.ret > 0 ? styles.up : m.ret < 0 ? styles.down : ""}>{signed(m.ret, 1)}</em>
                </div>
              );
            })}
          </div>
          <figcaption>
            {t("Plus haut {h} le {hd} · plus bas {l} le {ld} · {m} séances lues, {x} sans bulletin", { h: fmt(n.high.value), hd: fmtDate(n.high.date), l: fmt(n.low.value), ld: fmtDate(n.low.date), m: String(n.sessions), x: String(n.missing) })}
          </figcaption>
        </figure>
        {n.movedSessions.length > 0 && (
          <div className={styles.tw}>
            <table>
              <caption className={styles.figtitle}>{t("Les séances où l'indice a bougé")}</caption>
              <thead>
                <tr>
                  <th>{t("Séance")}</th>
                  <th className={styles.num}>{t("Variation")}</th>
                  <th>{t("Ce qui a traité")}</th>
                </tr>
              </thead>
              <tbody>
                {n.movedSessions.slice(0, 12).map((s) => (
                  <tr key={s.date}>
                    <td>{fmtDate(s.date)}</td>
                    <td className={`${styles.num} ${s.variationPct > 0 ? styles.up : styles.down}`}>{signed(s.variationPct)}</td>
                    <td>{s.movers || t("aucun cours d'action modifié dans nos lectures")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2>
          <span className={styles.n}>02</span> {t("Les sept sociétés derrière le chiffre")}
        </h2>
        <p>{t("Un indice de sept lignes se lit d'abord comme une liste d'entreprises : des sociétés d'exploitation qui emploient, produisent et distribuent des dividendes dans la région.")}</p>
        <div className={styles.tw}>
          <table>
            <thead>
              <tr>
                <th>{t("Société")}</th>
                <th>{t("Activité")}</th>
                <th>{t("Pays")}</th>
                <th className={styles.num}>{t("Cours")}</th>
                <th className={styles.num}>{t("Rendement")}</th>
                <th className={styles.num}>{t("Poids")}</th>
                <th className={styles.num}>{t("Flottant")}</th>
                <th className={styles.num}>{t("Trimestre")}</th>
              </tr>
            </thead>
            <tbody>
              {n.lines.map((l) => (
                <tr key={l.mnemo}>
                  <td>
                    <Link href={`/societes/${l.mnemo.toLowerCase()}`}>
                      <b>{l.mnemo}</b> · {l.name}
                    </Link>
                  </td>
                  <td>{t(l.sector)}</td>
                  <td>{t(l.country)}</td>
                  <td className={styles.num}>{fmt(l.price)}</td>
                  <td className={styles.num}>{l.yield != null ? fmtPct(l.yield, 1) : "—"}</td>
                  <td className={styles.num}>{fmtPct(l.weight, 1)}</td>
                  <td className={styles.num}>{fmtPct(l.floatShare, 0)}</td>
                  <td className={`${styles.num} ${l.move > 0 ? styles.up : l.move < 0 ? styles.down : ""}`}>{signed(l.move, 1)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5}>{t("Ensemble de la cote")}</td>
                <td className={styles.num}>100 %</td>
                <td className={styles.num}>{n.capTotal ? fmtPct((n.capFloat / n.capTotal) * 100, 0) : "—"}</td>
                <td className={`${styles.num} ${n.ret > 0 ? styles.up : n.ret < 0 ? styles.down : ""}`}>{signed(n.ret, 1)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className={styles.splits}>
          <div>
            <div className={styles.figtitle}>{t("Par secteur")}</div>
            {n.bySector.map((g) => (
              <div key={g.label} className={styles.split}>
                <span>{t(g.label)}</span>
                <i style={{ width: share(g.pct) }} />
                <b>{fmtPct(g.pct, 1)}</b>
              </div>
            ))}
          </div>
          <div>
            <div className={styles.figtitle}>{t("Par pays")}</div>
            {n.byCountry.map((g) => (
              <div key={g.label} className={styles.split}>
                <span>{t(g.label)}</span>
                <i style={{ width: share(g.pct) }} />
                <b>{fmtPct(g.pct, 1)}</b>
              </div>
            ))}
          </div>
        </div>
        {top && (
          <p>
            {t("La concentration est le trait principal de cette cote : {m} représente {w} de la capitalisation. Dire « le marché monte » revient, le plus souvent, à dire « {m} monte ».", { m: top.weight >= n.lines[0].weight ? n.lines[0].name : top.name, w: fmtPct(n.lines[0].weight, 1) })}
          </p>
        )}
      </section>

      <section>
        <h2>
          <span className={styles.n}>03</span> {t("Ce qui s'est échangé, et ce que cela change pour vous")}
        </h2>
        <p>{say(n.caution)}</p>
        {traded.length > 0 && (
          <div className={styles.tw}>
            <table>
              <thead>
                <tr>
                  <th>{t("Société")}</th>
                  <th className={styles.num}>{t("Échangé")}</th>
                  <th className={styles.num}>{t("Transactions")}</th>
                  <th className={styles.num}>{t("Rotation du flottant, 12 mois")}</th>
                </tr>
              </thead>
              <tbody>
                {traded.map((l) => (
                  <tr key={l.mnemo}>
                    <td>
                      <b>{l.mnemo}</b> · {l.name}
                    </td>
                    <td className={styles.num}>{money(l.amount)}</td>
                    <td className={styles.num}>{l.trades}</td>
                    <td className={styles.num}>{l.rotation != null ? fmtPct(l.rotation, l.rotation < 10 ? 1 : 0) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p>
          {t("La rotation du flottant mesure la part des titres disponibles qui a changé de mains en un an. Sur l'ensemble de la cote elle ressort à {r} : c'est le trait d'un marché jeune, où les actionnaires sont des porteurs de long terme, et c'est la contrainte à connaître avant d'acheter.", { r: n.rotation != null ? fmtPct(n.rotation, 1) : "—" })}
        </p>
      </section>

      <section>
        <h2>
          <span className={styles.n}>04</span> {t("Ce que l'indice mesure, et ce qu'il ne mesure pas")}
        </h2>
        <ul className={styles.list}>
          <li>
            <b>{t("C'est un indice de prix")}</b> : {t("les dividendes n'y sont pas. Sur cette cote ils font une part importante du rendement d'un porteur ; comparer sa performance à l'indice, c'est se sous-estimer.")}
          </li>
          <li>
            <b>{t("Ce n'est pas une mesure d'activité")}</b> : {t("{f} séances du trimestre n'ont enregistré aucun mouvement. Sans transaction, le cours de référence ne bouge pas et l'indice non plus.", { f: String(n.sessions - n.moved) })}
          </li>
          <li>
            <b>{t("Ce n'est pas un portefeuille")}</b> : {t("reproduire sa composition supposerait d'acheter une proportion de la première valeur que le flottant disponible ne permet pas.")}
          </li>
          <li>
            <b>{t("Ce n'est pas un baromètre de l'économie régionale")}</b> : {t("sept sociétés, dont quatre financières, ne décrivent pas la croissance d'une zone. Pour cela, le marché des titres publics et les valeurs liquidatives des OPCVM portent un signal plus solide.")}
          </li>
        </ul>
      </section>

      <div className={styles.actions}>
        <a className="btn primary" href={`/indice/note/${n.quarter.key.toLowerCase()}/pdf`} target="_blank" rel="noreferrer">
          {t("Télécharger en PDF")}
        </a>
        <Link className="btn ghost" href="/indice">
          {t("La page de l'indice")}
        </Link>
        <Link className="btn ghost" href="/info/indice-bvmac">
          {t("Comment lire l'indice")}
        </Link>
      </div>

      {others.length > 0 && (
        <nav className={styles.others}>
          <span>{t("Les autres trimestres")}</span>
          {others.map((q) => (
            <Link key={q.key} href={`/indice/note/${q.key.toLowerCase()}`}>
              {qlabel(q)}
            </Link>
          ))}
        </nav>
      )}

      <footer className={styles.footer}>
        <b>{t("Source")}</b> · {t("Bulletin officiel de la cote de la BVMAC, séances lues à chaque parution ; calculs {c}.", { c: COMPANY.legalName })}{" "}
        {n.methodOpen ? t("La méthodologie de l'indice (base, date de base, règle de pondération) est en cours de confirmation auprès de la BVMAC.") : t("Les variations publiées se reconstituent avec les cours et les poids du même bulletin.")}{" "}
        <b>{t("Avertissement")}</b> · {t("ce document présente une information de marché ; il ne constitue ni un conseil en investissement, ni une recommandation personnalisée, ni une offre. Les performances passées ne préjugent pas des performances futures.")}
      </footer>
    </article>
  );
}
