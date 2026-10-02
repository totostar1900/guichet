import Link from "next/link";
import type { Session } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { positionsFrom } from "@/lib/positions";
import { cashPosition } from "@/lib/domain/cash";
import { bilan, suivre, type LigneTenue } from "@/lib/domain/encaissement";
import { compteDesEtats, servicesDuClient } from "@/lib/domain/services";
import { CeQuiVousAttend } from "@/components/CeQuiVousAttend";
import { contexteDuClient } from "@/lib/domain/contexte-client";
import { buildPerformanceParts } from "@/lib/performance-report";
import { courbeDuPortefeuille } from "@/lib/domain/courbe-portefeuille";
import { famillesDuPortefeuille, NOM_FAMILLE, type Famille } from "@/lib/domain/familles-actifs";
import { getT } from "@/i18n/server";
import { fmt, fmtDate, localIso } from "@/lib/format";
import { Releve } from "./moi/Releve";
import styles from "./Console.module.css";

/**
 * Le portefeuille d'un client connecté : la racine de son espace.
 *
 * Il atterrissait sur la liste des titres. C'est le bon écran pour choisir un
 * instrument, et le mauvais pour revenir : après son premier achat, un client
 * ne vient pas parcourir, il vient voir ce qu'il a et décider. L'ordre de la
 * page est donc celui-là, et il est délibéré.
 *
 *   CE QUE ÇA VAUT, en un chiffre et trois faits. Une valeur sans le versé
 *   n'apprend rien : c'est l'écart entre les deux qui est le rendement.
 *
 *   CE QUI ATTEND UNE DÉCISION, avant les positions et jamais après. Au plus
 *   trois : une page qui en propose huit n'en propose aucune. Le compteur de
 *   la bande mène ici, à l'ancre « a-decider ».
 *
 *   CE QUI EST ENTRÉ ET CE QUI EST REVENU, en deux séries cumulées, et la
 *   valeur du jour en bout. La courbe de valorisation que portait la maquette
 *   n'est pas là, et c'est un refus : voir domain/courbe-portefeuille.ts.
 *
 *   PAR FAMILLE, puis LES LIGNES. Les services descendent à une bande : leurs
 *   gestes vivent sur l'objet qu'ils concernent, pas dans une grille de neuf
 *   tuiles qui concurrencerait le portefeuille.
 */
export async function Console({ session }: { session: Session }) {
  const t = await getT();
  const r = repo();
  const aujourdHui = localIso(new Date());

  /* Le contexte est déjà assemblé pour le compteur de la bande : le cache de
     React fait que cette page le lit sans le repayer. */
  const [ctx, intents, offers, cash] = await Promise.all([contexteDuClient(session.userId), r.listIntents(), r.listOffers(), r.listCash(session.userId).catch(() => [])]);

  const mine = intents.filter((i) => i.clientId === session.userId);
  const positions = positionsFrom(mine, offers);
  const poche = cashPosition(cash, mine);
  const tenues: LigneTenue[] = positions.map((p) => ({ intentId: p.intent.id, titre: p.offer.title, echus: p.paid, aVenir: p.flows }));
  const b = bilan(suivre(tenues, cash));

  const services = servicesDuClient(ctx);
  const compte = compteDesEtats(services);

  const { perf, mouvements } = buildPerformanceParts(mine, offers);
  const courbe = courbeDuPortefeuille(mouvements, perf.valued, aujourdHui);
  const familles = famillesDuPortefeuille(perf.lines, new Map(offers.map((o) => [o.id, o])), poche.idle);

  const total = perf.valued + poche.idle;
  const gain = perf.valued + perf.returned - perf.invested;
  const prochaine = positions
    .map((p) => p.nextFlow)
    .filter(Boolean)
    .sort((a, b2) => a!.date.localeCompare(b2!.date))[0];

  const trace = dessin(courbe);
  const famille = (f: Famille) => t(NOM_FAMILLE[f]);
  const pct = (v: number) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
  const signe = (v: number) => `${v > 0 ? "+" : ""}${pct(v)}`;

  return (
    <div className={styles.page}>

      <div className={styles.bonjour}>
        <h1>{t("Bonjour {p}", { p: session.name.split(" ")[0] })}</h1>
        <span className={`${styles.canaux} ${session.kycStatus === "valide" ? "" : styles.canauxManque}`}>
          {session.kycStatus === "valide" ? t("Dossier complet") : t("Dossier à compléter")}
        </span>
      </div>

      {/* CE QUI ATTEND LE LECTEUR, AVANT TOUT LE RESTE.
          C'est la seule bande de la page qui demande un geste ; tout le reste
          est un constat, et un constat attend d'être lu quand une action attend
          d'être faite. Elle est donc remontée au-dessus de la valeur.
          Vide, le composant ne rend rien. */}
      <CeQuiVousAttend userId={session.userId} />

      {/* 1. Ce que ça vaut, et ce que ça a rapporté. */}
      {positions.length > 0 ? (
        <section className={styles.valeur}>
          <div className={styles.grand}>
            <span className={styles.etiquette}>{t("Votre portefeuille")}</span>
            {/* Rien de valorisable et de l'argent versé : « 0 FCFA » serait
                exact et illisible, un client lirait une perte totale. Un chiffre
                absent se nomme au lieu d'être affiché à zéro. */}
            {total === 0 && perf.unvalued > 0 ? (
              <b className={styles.sansValeur}>{t("Pas encore de valorisation")}</b>
            ) : (
              <b>
                {fmt(Math.round(total))} <em>FCFA</em>
              </b>
            )}
            {perf.invested > 0 && (
              <span className={styles.gain}>
                <b className={gain >= 0 ? styles.bon : styles.moins}>
                  {gain >= 0 ? "+" : ""}
                  {fmt(Math.round(gain))}
                </b>
                <b className={gain >= 0 ? styles.bon : styles.moins}>{signe(Math.round((gain / perf.invested) * 1000) / 10)}</b>
                <small>{t("depuis l'origine, coupons reçus compris")}</small>
              </span>
            )}
          </div>
          {/* Une ligne sans cours publié ne se compte pas zéro : elle sort du
              total, et la page dit laquelle et combien on y a mis, plutôt que
              de laisser un chiffre inexpliqué à côté du tableau des lignes. */}
          {perf.unvalued > 0 && (
            <p className={styles.horsTotal}>
              {perf.unvalued === 1
                ? t("Une ligne est tenue sans cours publié : {m} FCFA y sont versés, et elle reste hors de ce total.", { m: fmt(Math.round(perf.unvaluedInvested)) })
                : t("{n} lignes sont tenues sans cours publié : {m} FCFA y sont versés, et elles restent hors de ce total.", { n: perf.unvalued, m: fmt(Math.round(perf.unvaluedInvested)) })}
            </p>
          )}
          <div className={styles.faits}>
            <span>
              <small>{t("Versé à ce jour")}</small>
              <b>{fmt(Math.round(perf.invested + perf.unvaluedInvested))}</b>
            </span>
            <span>
              <small>{t("Reçu à ce jour")}</small>
              <b>{fmt(Math.round(b.encaisse))}</b>
            </span>
            <span>
              <small>{t("Prochaine échéance")}</small>
              <b>{prochaine ? fmtDate(prochaine.date) : "—"}</b>
            </span>
            <span className={poche.idle > 0 ? styles.dispo : undefined}>
              <small>{t("Disponible")}</small>
              <b>{fmt(Math.round(poche.idle))}</b>
            </span>
          </div>
        </section>
      ) : (
        <p className={styles.vide}>{t("Vous ne tenez encore aucune ligne. Les titres et les fonds ouverts se parcourent sans engagement.")}</p>
      )}

      {/* 3. Ce qui est entré, ce qui est revenu, et ce que ça vaut aujourd'hui. */}
      {trace && (
        <section>
          <div className={styles.tete}>
            <b>{t("Ce que vous avez versé, ce qui vous est revenu")}</b>
            <Link href="/moi/performance">{t("L'analyse de votre portefeuille")} →</Link>
          </div>
          <svg className={styles.courbe} viewBox="0 0 1000 300" role="img" aria-label={t("Les versements et les retours cumulés, mois par mois, et la valeur du jour")}>
            <line x1="52" y1="14" x2="52" y2="248" stroke="var(--line)" strokeWidth="1" />
            <line x1="52" y1="248" x2="986" y2="248" stroke="var(--line)" strokeWidth="1" />
            <path d={trace.verse} fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeDasharray="4 5" />
            <path d={trace.recu} fill="none" stroke="var(--good)" strokeWidth="2.4" strokeLinecap="round" />
            <line x1={trace.fin.x} y1={trace.fin.yVerse} x2={trace.fin.x} y2={trace.fin.yValeur} stroke="var(--gold-line)" strokeWidth="1" strokeDasharray="3 4" />
            <circle cx={trace.fin.x} cy={trace.fin.yValeur} r="5" fill="var(--paper)" stroke="var(--gold)" strokeWidth="2.6" />
            {trace.reperes.map((r2) => (
              <text key={r2.mois} x={r2.x} y={268} textAnchor={r2.fin ? "end" : r2.x < 60 ? "start" : "middle"} className={styles.repere}>
                {r2.mot}
              </text>
            ))}
          </svg>
          <div className={styles.legende}>
            <span>
              <i className={styles.tVerse} /> {t("Ce que vous avez versé")}
            </span>
            <span>
              <i className={styles.tRecu} /> {t("Ce qui vous est revenu")}
            </span>
            <span>
              <i className={styles.tValeur} /> {t("La valeur du jour")}
            </span>
            {/* On ne dessine pas ce qu'on ne sait pas : il n'y a pas d'historique
                de valorisation, donc pas de courbe de valeur dans le temps. */}
            <small>{t("La valeur d'une ligne n'est connue qu'au dernier cours publié : la page ne trace donc pas de valeur passée.")}</small>
          </div>
        </section>
      )}

      {/* 4. Par famille d'actif. */}
      {familles.length > 0 && (
        <section>
          <div className={styles.tete}>
            <b>{t("Par type d'actif")}</b>
            <span>{t("aucune part n'est jugée : la maison exécute, elle ne conseille pas de répartition")}</span>
          </div>
          <div className={styles.barre}>
            {familles.map((f) => (
              <i key={f.famille} className={styles[f.famille]} style={{ flexGrow: Math.max(f.part, 0.5) }} aria-hidden="true" />
            ))}
          </div>
          <div className={styles.familles}>
            {familles.map((f) => (
              <div key={f.famille}>
                <i className={styles[f.famille]} aria-hidden="true" />
                <b>{famille(f.famille)}</b>
                <span>{fmt(Math.round(f.valeur))}</span>
                <span className={styles.part}>{pct(f.part)}</span>
                <span className={f.rendu == null ? styles.part : f.rendu >= 0 ? styles.bon : styles.moins}>{f.rendu == null ? "—" : signe(f.rendu)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Les lignes. */}
      {positions.length > 0 && (
        <section>
          <div className={styles.tete}>
            <b>{t("Vos lignes")}</b>
            {/* Le relevé est plus bas sur cette page, il n'est plus ailleurs. */}
            <a href="#releve">{t("Le relevé")} ↓</a>
          </div>
          <div className={styles.lignes}>
            {positions.map((p) => (
              <Link key={p.intent.id} href={`/offres/${p.offer.id}`}>
                <span className={styles.quoi}>
                  <b>{p.offer.title}</b>
                  <small>{p.offer.issuer || p.offer.countryName}</small>
                </span>
                <span className={styles.qte}>{fmt(Math.round(p.units))}</span>
                {/* Sans cours publié, un tiret : afficher le prix de revient à
                    la place d'une valeur ferait passer ce qu'on a payé pour ce
                    que ça vaut. */}
                <span className={styles.val}>{p.marketValue == null ? <em className={styles.sansCours}>—</em> : fmt(Math.round(p.marketValue))}</span>
                <span className={styles.flux}>{p.nextFlow ? fmtDate(p.nextFlow.date) : t("sans échéance")}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 6. Les services, en bande : leurs gestes vivent sur l'objet concerné. */}
      <Link className={styles.bandeServices} href="/trader">
        <b>{t("Vos services")}</b>
        <span>{t("{a} en place · {b} à activer", { a: compte.en_place, b: compte.a_activer })}</span>
        <em>→</em>
      </Link>

      {/* 7. LE RELEVÉ, qui était une page à lui seul sous /moi. Il posait la
          même question que tout ce qui précède, « qu'est-ce que je possède »,
          et deux pages pour une question sont une de trop : on ne savait jamais
          laquelle ouvrir. Ses six sections arrivent repliées : le portefeuille
          garde au repos la longueur qu'il avait. */}
      <Releve session={session} />

    </div>
  );
}

/** Les deux séries cumulées, mises à l'échelle de la plus haute des trois valeurs. */
function dessin(c: ReturnType<typeof courbeDuPortefeuille>) {
  if (c.points.length < 2) return undefined;
  const W = 1000;
  const P = { l: 52, r: 14, t: 14, b: 52 };
  const haut = Math.max(...c.points.map((p) => Math.max(p.verse, p.recu)), c.valeur, 1);
  const x = (i: number) => P.l + (i / (c.points.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => 248 - (v / haut) * (248 - P.t);
  const chemin = (clef: "verse" | "recu") => c.points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p[clef]).toFixed(1)}`).join(" ");

  const dernier = c.points.length - 1;
  const reperes = c.points
    .map((p, i) => ({ ...p, i }))
    .filter((p, i) => i === 0 || i === dernier || (c.points.length > 6 ? p.mois.endsWith("-01-01") : true))
    .map((p) => ({ mois: p.mois, x: Number(x(p.i).toFixed(1)), mot: fmtDate(p.mois, false), fin: p.i === dernier }));

  return {
    verse: chemin("verse"),
    recu: chemin("recu"),
    fin: { x: Number(x(dernier).toFixed(1)), yVerse: Number(y(c.points[dernier].verse).toFixed(1)), yValeur: Number(y(c.valeur).toFixed(1)) },
    reperes,
  };
}
