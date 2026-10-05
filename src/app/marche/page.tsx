import Link from "next/link";
import { IndexPulse } from "@/components/IndexPulse";
import { MarketStrip } from "@/components/MarketStrip";
import { COMPANY } from "@/lib/config";
import { fmt, fmtDate, fmtPct, money } from "@/lib/format";
import { dernierMouvement, echangesDeLaSeance } from "@/lib/market/echanges";
import { indexPageData } from "@/lib/market/index-data";
import { quarters } from "@/lib/market/index-quarter";
import { loadCompanies } from "@/lib/reference";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";
import { OngletsMarche } from "@/components/market/OngletsMarche";

export const dynamic = "force-dynamic";
export const metadata = { title: "Le marché" };

/**
 * Le marché : la porte d'entrée de l'environnement BVMAC.
 *
 * L'indice, les sept sociétés cotées, les notes trimestrielles et de quoi
 * comprendre. Les actualités n'y sont pas : elles couvrent cinq rubriques,
 * dont la BVMAC n'est qu'une, et gardent leur propre page. Rien n'est
 * produit ici : chaque
 * section montre ce qui existe déjà et mène à sa page. La page de l'indice
 * n'était rattachée à aucun onglet ; c'est cette porte qui manquait.
 */
export default async function MarchePage() {
  const t = await getT();
  const [data, companies] = await Promise.all([indexPageData(), loadCompanies().catch(() => [])]);
  const { weights, nameOf, lastBulletin, histories, trading } = data;
  const notes = quarters(data).slice(0, 4);
  const capTotal = weights.reduce((s, w) => s + w.capTotal, 0);
  const capFloat = weights.reduce((s, w) => s + w.capFloat, 0);
  /**
   * CE QUI S'EST ÉCHANGÉ, ET QUAND CHAQUE LIGNE A BOUGÉ.
   *
   * L'indice bouge sur 70 des 271 séances lues, et une action garde son cours
   * dans 95 % d'entre elles : une page qui ne montre que la variation du jour
   * n'affiche que des zéros, trois fois sur quatre. Les deux lectures qui
   * suivent sont dans la base depuis le premier jour et ne paraissaient nulle
   * part. Elles ne coûtent aucune lecture de plus : « indexPageData » les
   * portait déjà.
   */
  const ech = lastBulletin ? echangesDeLaSeance(trading, lastBulletin.sessionDate, weights.length) : undefined;
  const bougeLe = (mnemo: string) => dernierMouvement(histories.find((h) => h.w.mnemo === mnemo)?.quotes ?? []);

  return (
    <>
      <OngletsMarche />
      <header className={styles.head}>
        <div className="eyebrow">BVMAC · {t("Bourse des Valeurs Mobilières de l'Afrique Centrale")}</div>
        <h1 className="display">{t("Le marché")}</h1>
        <p className={styles.lead}>
          {t("Ce que la Bourse publie à chaque séance, et ce que nous en lisons : l'indice, les sociétés cotées, et les notes que nous en tirons.")}
          {lastBulletin ? ` ${t("Dernier bulletin lu : n° {n} du {d}.", { n: String(lastBulletin.number), d: fmtDate(lastBulletin.sessionDate) })}` : ""}
        </p>
      </header>

      <IndexPulse />

      {ech && lastBulletin && (
        <section className="panel" id="echanges">
          <div className="panel-h">
            <h2>{t("Ce qui s'est échangé")}</h2>
            <Link className="btn sm ghost" href="/indice">
              {t("Séance par séance")} →
            </Link>
          </div>
          <div className={styles.ech}>
            <div>
              <b>
                {ech.lignes}
                <small> / {ech.cotees}</small>
              </b>
              <span>{t("lignes servies le {d}", { d: fmtDate(lastBulletin.sessionDate, false) })}</span>
            </div>
            <div>
              <b>{fmt(ech.transactions)}</b>
              <span>{t("transactions")}</span>
            </div>
            <div>
              <b>{money(ech.montant)}</b>
              <span>{t("FCFA échangés")}</span>
            </div>
          </div>
          <p className={styles.note}>
            {ech.servies.length > 0 ? `${ech.servies.map((x) => `${x.mnemo} ${fmt(x.titres)}`).join(" · ")}. ` : `${t("Aucun titre n'a changé de mains ce jour-là.")} `}
            {ech.part != null &&
              t("Cette séance pèse {p} des trente derniers jours, qui ont vu {m} FCFA s'échanger en {n} séances.", {
                p: fmtPct(ech.part, 0),
                m: money(ech.fenetreMontant),
                n: ech.fenetreSeances,
              })}
          </p>
        </section>
      )}

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
                  <th className={styles.num}>{t("Poids")}</th>
                  <th className={styles.num}>{t("Dernier mouvement")}</th>
                </tr>
              </thead>
              <tbody>
                {weights.map((w) => {
                  const c = companies.find((x) => x.mnemo === w.mnemo);
                  const bouge = bougeLe(w.mnemo);
                  return (
                    <tr key={w.mnemo}>
                      <td>
                        <Link href={`/societes/${w.mnemo.toLowerCase()}`}>
                          <b>{w.mnemo}</b> · {c?.shortName ?? nameOf(w.mnemo)}
                        </Link>
                      </td>
                      <td className="muted">{c?.sector ? t(c.sector) : "—"}</td>
                      <td className={styles.num}>{fmt(w.close)}</td>
                      <td className={styles.num}>{fmtPct(w.weightTotal, 1)}</td>
                      {/* La date, et non la variation du jour : sept zéros ne
                          disaient rien que l'indice n'ait déjà dit. */}
                      <td className={styles.num}>{bouge ? fmtDate(bouge, false) : "—"}</td>
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

      {/* TROIS LIENS NE FONT PAS UN PANNEAU. « Comprendre » en occupait un
          quart de page, pour trois destinations dont la pulsation portait déjà
          l'une. Ils tiennent au pied, avec la source. */}
      <p className={styles.source}>
        <Link href="/info/indice-bvmac">{t("Comment lire l'indice")}</Link> · <Link href="/comparer">{t("Comparer deux lignes")}</Link> · <Link href="/indice#donnees">{t("Ce que publie le bulletin")}</Link>
        <br />
        {t("L'indice se lit dans le bulletin officiel de la cote, séance après séance. Le Guichet le montre tel qu'il est publié ; il n'en construit pas et ne mesure personne contre lui.")}{" "}
        {t("Source : bulletin officiel de la cote de la BVMAC, lu à chaque parution ; calculs {c}.", { c: COMPANY.legalName })}
      </p>

      <MarketStrip current="marche" />
    </>
  );
}
