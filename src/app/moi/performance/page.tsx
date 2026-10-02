import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { buildPerformance } from "@/lib/performance-report";
import { fmt, fmtDate, fmtPct, localIso } from "@/lib/format";
import { getT } from "@/i18n/server";
import { positionsFrom } from "@/lib/positions";
import { famillesDuPortefeuille } from "@/lib/domain/familles-actifs";
import { echeancier } from "@/lib/domain/echeancier";
import { RailSections } from "@/components/RailSections";
import { Echeancier } from "./Echeancier";
import { Repartition } from "./Repartition";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Analyse de votre portefeuille") };
}

/**
 * Le rapport de performance d'un épargnant.
 *
 * Il répond à la seule question qu'un relevé laisse ouverte : ai-je gagné, et
 * combien. La performance qu'une société de gestion publie est celle d'un
 * porteur imaginaire entré le premier jour ; celle-ci est la sienne, pondérée
 * par ce qu'il a versé et par le temps où chaque versement a couru.
 *
 * Trois choses que cette page ne fait pas, et qui tiennent sa tenue.
 *
 * Elle ne conseille pas. Pas de « vous devriez », pas de comparaison qui
 * orienterait vers une ligne plutôt qu'une autre : la maison mesure et rapporte,
 * elle n'a pas l'agrément qui permettrait d'orienter une allocation.
 *
 * Elle ne cache pas ce qu'elle ignore. Les coupons sont comptés à leur échéance,
 * faute de rapprochement bancaire, et la page le dit au lieu de laisser croire à
 * un encaissement constaté.
 *
 * Elle ne remplit pas le vide. Sans ordre réglé, il n'y a pas de rendement, et
 * un zéro s'y lirait comme une performance nulle plutôt que comme une absence.
 */
export default async function PerformancePage() {
  const t = await getT();
  const s = await requireSession("/moi/performance");
  const r = repo();
  const [intents, offers, cash] = await Promise.all([r.listIntents(), r.listOffers(), r.listCash(s.userId).catch(() => [])]);
  const mine = intents.filter((i) => i.clientId === s.userId);
  const p = buildPerformance(mine, offers);
  /* Les trois sections ajoutées tirent des mêmes ordres que le rapport : la
     répartition des lignes du rapport, l'échéancier des flux à venir des
     positions, et les opérations du journal des espèces. Rien n'est recalculé
     d'un autre côté, donc rien ne peut diverger. */
  const positions = positionsFrom(mine, offers);
  const familles = famillesDuPortefeuille(p.lines, new Map(offers.map((o) => [o.id, o])), 0);
  const aVenir = echeancier(positions.flatMap((x) => x.flows), localIso(new Date()));
  const operations = [...cash].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40);

  // Aucune ligne valorisable : le tableau garde son sens, le chapeau n'en a plus.
  const totalsMakeSense = p.lines.some((l) => l.valuable);
  if (!p.lines.length) {
    return (
      <div className={styles.page}>
        <Link href="/" className={styles.back}>
          ← {t("Portefeuille")}
        </Link>
        <h1 className="display">{t("Ce que votre épargne a rapporté")}</h1>
        <p className="muted">{t("Ce rapport paraît dès votre première opération réglée : il se calcule sur ce que vous avez versé et sur ce que vous détenez.")}</p>
      </div>
    );
  }

  const sign = (v: number) => (v > 0 ? "+" : "");
  const tone = (v: number) => (v > 0 ? styles.up : v < 0 ? styles.down : "");

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.back}>
        ← {t("Portefeuille")}
      </Link>
      <h1 className="display">{t("Analyse de votre portefeuille")}</h1>
      <p className={styles.lead}>
        {t("Depuis le {d}, sur ce que vous avez réellement versé et pour le temps où chaque versement a couru.", { d: fmtDate(p.since ?? "") })}
      </p>

      {/* LE RAIL, comme sur Analyses au desk. Quatre sections, c'est déjà plus
          qu'on ne parcourt de haut en bas, et chaque tuile du tableau de bord
          mène directement à la sienne. */}
      <div className={styles.corps}>
      <RailSections
        sections={[
          { id: "detenu", titre: t("Ce que vous détenez"), groupe: t("Le portefeuille") },
          { id: "rapporte", titre: t("Ce que ça a rapporté"), groupe: t("Le portefeuille") },
          { id: "echeancier", titre: t("L'échéancier"), groupe: t("Ce qui vient") },
          { id: "operations", titre: t("Vos opérations"), groupe: t("Ce qui vient") },
        ]}
      />
      <div className={styles.sections}>

      <section id="detenu">
        <h2 className={styles.h2}>{t("Ce que vous détenez")}</h2>
        <Repartition parts={familles} />
        {p.unvalued > 0 && (
          <p className={styles.horsDessin}>
            {t("{n} ligne(s) sont hors du dessin, faute de cours publié. Elles ne valent pas zéro : les compter à zéro ferait baisser votre répartition sans raison.", { n: String(p.unvalued) })}
          </p>
        )}
      </section>

      <section id="rapporte">
      <h2 className={styles.h2}>{t("Ce que ça a rapporté")}</h2>

      {totalsMakeSense && (
      <div className={styles.head}>
        <div>
          <span>{t("Rendement, pondéré par vos montants")}</span>
          <b className={tone(p.rate ?? 0)}>{p.rate != null ? `${sign(p.rate)}${fmtPct(p.rate, 2)}` : "—"}</b>
          <small>{p.rate != null ? t("par an") : t("pas encore calculable")}</small>
        </div>
        <div>
          <span>{t("Gain")}</span>
          <b className={tone(p.gain)}>
            {sign(p.gain)}
            {fmt(Math.round(p.gain))}
          </b>
          <small>FCFA</small>
        </div>
        <div>
          <span>{t("Versé")}</span>
          <b>{fmt(Math.round(p.invested))}</b>
          <small>FCFA</small>
        </div>
        <div>
          <span>{t("Détenu aujourd'hui")}</span>
          <b>{fmt(Math.round(p.valued))}</b>
          <small>{t("plus {n} FCFA déjà revenus", { n: fmt(Math.round(p.returned)) })}</small>
        </div>
      </div>
      )}

      <div className="scroll-x">
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("Ligne")}</th>
              <th className="r">{t("Versé")}</th>
              <th className="r">{t("Revenu")}</th>
              <th className="r">{t("Détenu")}</th>
              <th className="r">{t("Gain")}</th>
              <th className="r">{t("Par an")}</th>
            </tr>
          </thead>
          <tbody>
            {p.lines.map((l) => (
              <tr key={l.offerId}>
                <td>
                  <Link href={`/offres/${l.offerId}`}>{l.title}</Link>
                  <small className="muted mono"> {l.isin}</small>
                  {l.sold ? <small className="muted"> · {t("des parts sont sorties")}</small> : null}
                </td>
                <td className="r num">{fmt(Math.round(l.invested))}</td>
                <td className="r num">{fmt(Math.round(l.returned))}</td>
                {/* Sans cours, on ne remplit rien : un zéro se lirait comme une valeur
                    nulle, c'est-à-dire comme une perte totale. */}
                <td className="r num">{l.valuable ? fmt(Math.round(l.valued)) : <span className="muted">{t("pas de cours")}</span>}</td>
                <td className={`r num ${l.valuable ? tone(l.gain) : ""}`}>
                  {l.valuable ? `${sign(l.gain)}${fmt(Math.round(l.gain))}` : <span className="muted">—</span>}
                </td>
                <td className={`r num ${tone(l.rate ?? 0)}`}>
                  {l.rate != null ? `${sign(l.rate)}${fmtPct(l.rate, 2)}` : <span className="muted">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      </section>

      <section id="echeancier">
        <h2 className={styles.h2}>{t("L'échéancier")}</h2>
        <p className={styles.sousTitre}>{t("Ce que vos lignes doivent vous verser, mois par mois.")}</p>
        <Echeancier mois={aVenir} />
      </section>

      <section id="operations">
        <h2 className={styles.h2}>{t("Vos opérations")}</h2>
        {operations.length === 0 ? (
          <p className="muted">{t("Aucun mouvement encore porté au journal.")}</p>
        ) : (
          <div className="scroll-x">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("Date")}</th>
                  <th>{t("Opération")}</th>
                  <th className="r">{t("Montant")}</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((o) => (
                  <tr key={o.id}>
                    <td>{fmtDate(o.at)}</td>
                    <td>{o.label}</td>
                    <td className="r num">{fmt(Math.round(o.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className={styles.notes}>
        <p>
          {t(
            "Le rendement est pondéré par les montants : cent mille francs placés onze mois n'y pèsent pas comme cent mille francs placés trois semaines. C'est le vôtre, et il diffère de la performance publiée par un fonds, qui est celle d'un porteur entré le premier jour.",
          )}
        </p>
        {p.due > 0 && (
          <p>
            {t("{n} flux sont comptés à leur date d'échéance : l'application connaît la date à laquelle l'émetteur doit payer, elle ne constate pas l'encaissement sur votre compte.", { n: String(p.due) })}
          </p>
        )}
        {p.unvalued > 0 && (
          <p>
            {t(
              "{n} ligne(s) ne sont pas comptées ici, faute de cours publié : {m} FCFA y sont versés. Une obligation du primaire gardée jusqu'à son terme ne se cote pas, et l'application préfère ne rien dire plutôt que de lui donner une valeur qu'elle n'a pas.",
              { n: String(p.unvalued), m: fmt(Math.round(p.unvaluedInvested)) },
            )}
          </p>
        )}
        {p.sold && <p>{t("Sur les lignes dont des parts sont sorties, les coupons encaissés avant la vente ne sont pas comptés : le gain affiché y est prudent.")}</p>}
        <p className="muted">{t("Ce rapport mesure ce qui s'est passé. Il ne recommande aucune opération : les performances passées ne préjugent pas des performances futures.")}</p>
      </div>
      </div>
      </div>
    </div>
  );
}
