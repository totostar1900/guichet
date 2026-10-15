import { DeskNav } from "@/components/DeskNav";
import { Legende, Trace } from "@/components/desk/Trace";
import { ReglageAuto } from "@/components/desk/ReglageAuto";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { couverture, nommerPays, PAYS_BEAC, rapprocher, vueBeac, ZONE, type VueBeac } from "@/lib/market/beac-vue";
import { anneesDe, auTemps, trimestreAuTemps, type Serie } from "@/lib/market/trace";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marché des valeurs du Trésor" };

/**
 * LA PAGE BEAC, ET LA DÉCISION QUI LA STRUCTURE : DEUX VUES.
 *
 * « À publier » ne montre que ce que la BEAC imprime, ou une addition de ce
 * qu'elle imprime. Cette vue peut partir chez un client sans engager notre
 * lecture. « BEAC contre nous » y ajoute nos relevés et notre couverture, et
 * reste au desk.
 *
 * CHAQUE PANNEAU PORTE SA PROVENANCE, parce qu'un chiffre publié et un chiffre
 * dérivé ne se ressemblent pas de loin et que, mélangés, ils deviennent tous
 * les deux douteux. Trois états : publié par la BEAC, somme de ses pièces,
 * notre lecture.
 *
 * TOUT EST RENDU PAR LE SERVEUR, réglages compris, et les réglages vivent dans
 * l'adresse. Un écran du desk se partage par un lien, se recharge sans se
 * perdre, et s'imprime : trois choses qu'un état gardé dans le navigateur ne
 * sait pas faire.
 *
 * AUCUN CHIFFRE N'EST CALCULÉ ICI. `beac-vue.ts` fait les séries et il est
 * éprouvé ; cette page choisit ce qu'on en montre.
 */

const COULEURS: Record<string, string> = {
  Cameroun: "#1d4ed8",
  Congo: "#b45309",
  Gabon: "#15803d",
  Tchad: "#7c3aed",
  RCA: "#be185d",
  "Guinée éq.": "#0f766e",
  [ZONE]: "#0b2545",
};
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const moisCourt = (m: string) => `${MOIS[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`;
const moisLong = (m: string) => `${MOIS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const nb = (v: number | undefined | null, d = 1) => (v == null || !Number.isFinite(v) ? "—" : v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const sg = (v: number | undefined | null, d = 1) => (v == null || !Number.isFinite(v) ? "—" : `${v > 0 ? "+" : ""}${nb(v, d)}`);
const duree = (a: number) => (a < 1 ? `${Math.round(a * 12)} mois` : `${a} ans`);

type Params = Record<string, string | string[] | undefined>;
const un = (p: Params, k: string) => (Array.isArray(p[k]) ? (p[k] as string[])[0] : (p[k] as string | undefined));

export default async function BeacPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireDesk();
  const t = await getT();
  const r = repo();
  const p = await searchParams;

  const [courbes, encoursLignes, coutsLignes, operations, seances] = await Promise.all([
    r.courbesBeac(),
    r.encoursOfficiel(),
    r.coutDesRessources(),
    r.operationsDuTresor(),
    r.listAuctionResults({ limit: 2000 }),
  ]);

  const vue = vueBeac(
    courbes.map((c) => ({ mois: c.mois, pays: c.pays, tenor: c.tenor, annees: c.annees, taux: c.taux })),
    encoursLignes.map((e) => ({ mois: e.mois, pays: e.pays, encours: e.encours })),
    coutsLignes.map((c) => ({ mois: c.mois, pays: c.pays, instrument: c.instrument, taux: c.taux })),
    operations.map((o) => ({
      pays: o.pays,
      operation: o.operation,
      montant: o.montant,
      montantRealise: o.montantRealise,
      tauxSouscription: o.tauxSouscription,
      operationOn: o.operationOn,
      maturityOn: o.maturityOn,
    })),
  );

  /* ---------- les réglages, lus dans l'adresse ---------- */
  const desk = un(p, "vue") === "desk";
  const choisis = (un(p, "pays") ?? "Cameroun,Congo,Gabon").split(",").filter((x) => x === ZONE || (PAYS_BEAC as readonly string[]).includes(x));
  const sel = choisis.length ? choisis : ["Cameroun", "Congo", "Gabon"];
  const seuls = sel.filter((x) => x !== ZONE);
  const mois = vue.moisTous;
  const iDe = Math.max(0, Math.min(mois.indexOf(un(p, "de") ?? "") < 0 ? 0 : mois.indexOf(un(p, "de")!), mois.length - 1));
  const iA = Math.max(iDe, mois.indexOf(un(p, "a") ?? "") < 0 ? mois.length - 1 : mois.indexOf(un(p, "a")!));
  const de = mois[iDe] ?? "";
  const a = mois[iA] ?? "";
  const dansFenetre = (m: string) => m >= de && m <= a;
  const dansP = <T extends { m: string }>(s: T[] | undefined) => (s ?? []).filter((x) => dansFenetre(x.m));

  const maturite = Number(un(p, "maturite") ?? 10);
  const instrument = un(p, "instrument") ?? "Tous";
  const avecCourbe = vue.moisCourbe.filter((m) => dansFenetre(m) && PAYS_BEAC.some((q) => vue.courbes[`${m}|${q}`]));
  const moisCourbe = avecCourbe.includes(un(p, "mois") ?? "") ? un(p, "mois")! : (avecCourbe[avecCourbe.length - 1] ?? "");
  const forme = (k: string, defaut: string) => un(p, `f${k}`) ?? defaut;
  const fEncours = forme("Encours", "ligne");
  const fCourbe = forme("Courbe", "niveau");
  const fOffre = forme("Offre", "barres");
  const fMur = forme("Mur", "barres");

  /* ---------- ce que nous, nous avons lu ---------- */
  const rapprochements = rapprocher(
    seances.map((s) => ({ pays: s.country, instrument: s.instrument, tenor: s.tenor, sessionOn: s.sessionOn, taux: s.rateAvg ?? s.yieldAvg })),
    vue,
  );
  const couv = couverture(
    encoursLignes.map((e) => ({ mois: e.mois, pays: e.pays, encours: e.encours })),
    seances.map((s) => ({ pays: s.country, sessionOn: s.sessionOn, maturityOn: s.maturityOn, servi: s.served })),
    operations.map((o) => ({ pays: o.pays, operation: o.operation, montantRealise: o.montantRealise, operationOn: o.operationOn })),
  );

  /* ---------- les chiffres de tête ---------- */
  const encFin = (q: string) => dansP(vue.encours[q]).slice(-1)[0];
  const encDeb = (q: string) => dansP(vue.encours[q])[0];
  const vFin = sel.includes(ZONE) ? encFin(ZONE)?.v : seuls.reduce((s, q) => s + (encFin(q)?.v ?? 0), 0);
  const vDeb = sel.includes(ZONE) ? encDeb(ZONE)?.v : seuls.reduce((s, q) => s + (encDeb(q)?.v ?? 0), 0);
  const refPays = sel.includes(ZONE) ? ZONE : seuls[0];
  const offreSel = seuls.flatMap((q) => dansP(vue.offre[q]));
  const prevu = offreSel.reduce((s, x) => s + x.prevu, 0);
  const realise = offreSel.reduce((s, x) => s + x.realise, 0);
  const sousSel = seuls.flatMap((q) => dansP(vue.souscription[q]));
  const nSous = sousSel.reduce((s, x) => s + x.n, 0);
  const sousMoy = nSous ? sousSel.reduce((s, x) => s + x.v * x.n, 0) / nSous : undefined;
  const coutsBta = seuls.map((q) => (vue.couts[`${q}|BTA`] ?? []).slice(-1)[0]).filter(Boolean);
  const coutMoy = coutsBta.length ? coutsBta.reduce((s, x) => s + x.v, 0) / coutsBta.length : undefined;
  const couvSel = couv.lignes.filter((l) => sel.includes(l.pays));
  const beacSel = couvSel.reduce((s, l) => s + l.beac, 0);
  const nousSel = couvSel.reduce((s, l) => s + l.communiques, 0);

  const lien = (ajout: Record<string, string>) => {
    const q = new URLSearchParams();
    q.set("vue", desk ? "desk" : "publier");
    q.set("pays", sel.join(","));
    q.set("de", de);
    q.set("a", a);
    q.set("mois", moisCourbe);
    q.set("maturite", String(maturite));
    q.set("instrument", instrument);
    for (const [k, v] of Object.entries({ fEncours, fCourbe, fOffre, fMur })) q.set(k, v);
    for (const [k, v] of Object.entries(ajout)) q.set(k, v);
    return `?${q.toString()}`;
  };
  const Formes = ({ clef, actuel, choix }: { clef: string; actuel: string; choix: [string, string][] }) => (
    <span className={styles.formes}>
      {choix.map(([v, l]) => (
        <a key={v} href={lien({ [clef]: v })} aria-current={actuel === v ? "true" : undefined}>
          {t(l)}
        </a>
      ))}
    </span>
  );

  /* ---------- les séries à dessiner ---------- */
  const serieEncours: Serie[] = (() => {
    if (fEncours === "part") {
      const parM: Record<string, Record<string, number>> = {};
      for (const q of seuls) for (const x of dansP(vue.encours[q])) ((parM[x.m] ??= {})[q] = x.v);
      return seuls
        .map((q) => ({
          couleur: COULEURS[q],
          ronds: true,
          rayon: 3,
          pts: Object.entries(parM)
            .filter(([, v]) => v[q] != null)
            .map(([m, v]) => {
              const tot = Object.values(v).reduce((s, x) => s + x, 0);
              return { x: auTemps(m), y: (100 * v[q]) / tot, titre: `${q} · ${moisCourt(m)} : ${nb((100 * v[q]) / tot, 1)} %` };
            }),
        }))
        .filter((s) => s.pts.length);
    }
    if (fEncours === "variation") {
      return sel
        .map((q) => {
          const s = dansP(vue.encours[q]);
          return {
            couleur: COULEURS[q],
            barres: sel.length === 1,
            largeur: 0.7,
            pts: s.slice(1).map((x, i) => ({
              x: auTemps(x.m),
              y: s[i].v ? (100 * (x.v - s[i].v)) / s[i].v : 0,
              titre: `${q} · ${moisCourt(s[i].m)} → ${moisCourt(x.m)} : ${sg(s[i].v ? (100 * (x.v - s[i].v)) / s[i].v : 0, 1)} %`,
            })),
          };
        })
        .filter((s) => s.pts.length);
    }
    return sel
      .map((q, i) => ({
        couleur: COULEURS[q],
        barres: fEncours === "barres",
        largeur: 0.7 / Math.max(1, sel.length),
        ronds: fEncours === "ligne",
        rayon: 3,
        pts: dansP(vue.encours[q]).map((x) => ({
          x: auTemps(x.m) + (fEncours === "barres" ? (i - (sel.length - 1) / 2) * 0.08 : 0),
          y: x.v,
          titre: `${q} · ${moisCourt(x.m)} : ${nb(x.v, 1)} Mds`,
        })),
      }))
      .filter((s) => s.pts.length);
  })();

  const precedent = vue.moisCourbe.filter((m) => m < moisCourbe).slice(-1)[0];
  const nomsCourbe = seuls.filter((q) => vue.courbes[`${moisCourbe}|${q}`]);
  const serieCourbe: Serie[] = (() => {
    const out: Serie[] = [];
    for (const q of nomsCourbe) {
      const c = vue.courbes[`${moisCourbe}|${q}`];
      if (fCourbe === "variation") {
        const avant = new Map((vue.courbes[`${precedent}|${q}`] ?? []).map((x) => [x.annees, x.taux]));
        const pts = c
          .filter((x) => avant.has(x.annees))
          .map((x) => ({
            x: x.annees + (nomsCourbe.indexOf(q) - (nomsCourbe.length - 1) / 2) * 0.12,
            y: 100 * (x.taux - avant.get(x.annees)!),
            titre: `${q} à ${x.tenor} : ${sg(100 * (x.taux - avant.get(x.annees)!), 0)} points de base`,
          }));
        if (pts.length) out.push({ couleur: COULEURS[q], barres: true, largeur: 0.7 / Math.max(1, nomsCourbe.length), pts });
      } else {
        out.push({ couleur: COULEURS[q], pts: c.map((x) => ({ x: x.annees, y: x.taux, titre: `${q} à ${x.tenor} : ${nb(x.taux, 2)} %` })) });
        const ici = c.find((x) => Math.abs(x.annees - maturite) < 1e-9);
        if (ici) out.push({ couleur: COULEURS[q], ronds: true, rayon: 5, pts: [{ x: ici.annees, y: ici.taux, titre: `${q} à ${ici.tenor} : ${nb(ici.taux, 2)} %` }] });
      }
    }
    if (desk && fCourbe === "niveau") {
      const miens = rapprochements.filter((x) => x.m === moisCourbe && seuls.includes(x.pays) && (instrument === "Tous" || x.instrument === instrument));
      if (miens.length) {
        out.push({
          couleur: "#0b2545",
          ronds: true,
          rayon: 4,
          pts: miens.map((x) => ({ x: x.annees, y: x.nous, titre: `${x.pays} ${x.instrument} ${x.tenor} : ${nb(x.nous, 2)} % chez nous, ${nb(x.beac, 2)} % chez eux` })),
        });
      }
    }
    return out;
  })();

  const serieMaturite: Serie[] = seuls
    .map((q) => ({ couleur: COULEURS[q], pts: dansP(vue.parMaturite[`${q}|${maturite}`]).map((x) => ({ x: auTemps(x.m), y: x.v, titre: `${q} · ${moisCourt(x.m)} : ${nb(x.v, 2)} %` })) }))
    .filter((s) => s.pts.length);
  const seriePente: Serie[] = seuls
    .map((q) => ({ couleur: COULEURS[q], pts: dansP(vue.pente[q]).map((x) => ({ x: auTemps(x.m), y: x.v, titre: `${q} · ${moisCourt(x.m)} : ${sg(x.v, 2)} pts` })) }))
    .filter((s) => s.pts.length);

  const moisOffre = [...new Set(seuls.flatMap((q) => dansP(vue.offre[q]).map((x) => x.m)))].sort();
  const agrege = moisOffre.map((m) => {
    const l = seuls.flatMap((q) => (vue.offre[q] ?? []).filter((x) => x.m === m));
    return { m, prevu: l.reduce((s, x) => s + x.prevu, 0), realise: l.reduce((s, x) => s + x.realise, 0), n: l.reduce((s, x) => s + x.n, 0) };
  });
  const serieOffre: Serie[] =
    fOffre === "taux"
      ? [
          {
            couleur: "#0b2545",
            barres: true,
            largeur: 0.72,
            pts: agrege.filter((x) => x.prevu > 0).map((x) => ({ x: auTemps(x.m), y: (100 * x.realise) / x.prevu, titre: `${moisCourt(x.m)} : ${nb((100 * x.realise) / x.prevu, 0)} % servi sur ${x.n} opération(s)` })),
          },
        ]
      : [
          { couleur: "#c8cfd6", barres: true, largeur: 0.78, pts: agrege.map((x) => ({ x: auTemps(x.m), y: x.prevu, titre: `${moisCourt(x.m)} : ${nb(x.prevu, 1)} Mds mis en adjudication` })) },
          { couleur: "#0b2545", barres: true, largeur: 0.42, pts: agrege.map((x) => ({ x: auTemps(x.m), y: x.realise, titre: `${moisCourt(x.m)} : ${nb(x.realise, 1)} Mds levés` })) },
        ];
  const serieSouscription: Serie[] = seuls
    .map((q) => ({ couleur: COULEURS[q], pts: dansP(vue.souscription[q]).map((x) => ({ x: auTemps(x.m), y: x.v, titre: `${q} · ${moisCourt(x.m)} : ${nb(x.v, 0)} % sur ${x.n} séance(s)` })) }))
    .filter((s) => s.pts.length);

  const serieMur: Serie[] =
    fMur === "cumul"
      ? seuls
          .map((q) => {
            let c = 0;
            return { couleur: COULEURS[q], pts: (vue.mur[q] ?? []).map((x) => ({ x: trimestreAuTemps(x.m), y: (c += x.v), titre: `${q} · cumulé au ${x.m} : ${nb(c, 1)} Mds` })) };
          })
          .filter((s) => s.pts.length)
      : seuls
          .map((q, i) => ({
            couleur: COULEURS[q],
            barres: true,
            largeur: 0.78 / Math.max(1, seuls.length),
            pts: (vue.mur[q] ?? []).map((x) => ({ x: trimestreAuTemps(x.m) + (i - (seuls.length - 1) / 2) * (0.2 / Math.max(1, seuls.length)), y: x.v, titre: `${q} · ${x.m} : ${nb(x.v, 1)} Mds` })),
          }))
          .filter((s) => s.pts.length);

  const nomsLegende = (qs: string[], trait = true) => qs.map((q) => ({ couleur: COULEURS[q], texte: q, trait }));

  return (
    <>
      <DeskNav current="/desk/beac" />
      <main className={styles.page}>
        <header className={styles.tete}>
          <h1>{t("Marché des valeurs du Trésor")}</h1>
          <p className={styles.sous}>
            {t(
              "Ce que la BEAC publie sur les six Trésors de la zone : son encours officiel, ses courbes de rendement, le coût de ses ressources et les opérations de chaque semaine.",
            )}{" "}
            <b>{desk ? t("Cette vue contient nos propres relevés : elle ne sort pas de la maison.") : t("Cette vue ne contient que des chiffres de la BEAC : elle peut partir chez un client.")}</b>
          </p>
        </header>

        <form id="reglages" method="get" className={styles.reglages}>
          <ReglageAuto formId="reglages" />
          <div className={styles.rang}>
            <span className={styles.etiq}>{t("Vue")}</span>
            <span className={styles.vues}>
              <a href={lien({ vue: "publier" })} aria-current={desk ? undefined : "true"}>
                {t("À publier")}
              </a>
              <a href={lien({ vue: "desk" })} aria-current={desk ? "true" : undefined}>
                {t("BEAC contre nous")}
              </a>
            </span>
            <input type="hidden" name="vue" value={desk ? "desk" : "publier"} />
            {Object.entries({ fEncours, fCourbe, fOffre, fMur }).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
          </div>
          <div className={styles.rang}>
            <span className={styles.etiq}>{t("Trésors")}</span>
            <span className={styles.cases}>
              {[ZONE, ...PAYS_BEAC].map((q) => (
                <label key={q} className={styles.case}>
                  <input type="checkbox" name="pays" value={q} defaultChecked={sel.includes(q)} />
                  <i style={{ background: COULEURS[q] }} />
                  {q}
                </label>
              ))}
            </span>
          </div>
          <div className={styles.rang}>
            <span className={styles.etiq}>{t("Période")}</span>
            <label className={styles.champ}>
              <span>{t("de")}</span>
              <select name="de" defaultValue={de}>
                {mois.map((m) => (
                  <option key={m} value={m}>
                    {moisLong(m)}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.champ}>
              <span>{t("à")}</span>
              <select name="a" defaultValue={a}>
                {mois.map((m) => (
                  <option key={m} value={m}>
                    {moisLong(m)}
                  </option>
                ))}
              </select>
            </label>
            <span className={styles.raccourcis}>
              {([["Tout", mois.length], ["5 ans", 60], ["3 ans", 36], ["12 mois", 12]] as [string, number][]).map(([l, n]) => (
                <a key={l} href={lien({ de: mois[Math.max(0, mois.length - n)] ?? mois[0], a: mois[mois.length - 1] })}>
                  {t(l)}
                </a>
              ))}
            </span>
            {/* SANS UNE SEULE SÉRIE, ON NE DIT PAS « 1 mois sur 0 ». Un compte
                absurde fait douter de tous les autres chiffres de l'écran. */}
            <span className={styles.compte}>{mois.length ? t("{n} mois retenus sur {tous}", { n: iA - iDe + 1, tous: mois.length }) : t("aucune série BEAC en base")}</span>
          </div>
          <div className={styles.rang}>
            <span className={styles.etiq}>{t("Courbe")}</span>
            <label className={styles.champ}>
              <span>{t("mois")}</span>
              <select name="mois" defaultValue={moisCourbe}>
                {avecCourbe.length ? (
                  [...avecCourbe].reverse().map((m) => (
                    <option key={m} value={m}>
                      {t("{m} · {n} Trésor(s)", { m: moisLong(m), n: PAYS_BEAC.filter((q) => vue.courbes[`${m}|${q}`]).length })}
                    </option>
                  ))
                ) : (
                  <option value="">{t("aucune dans la période")}</option>
                )}
              </select>
            </label>
            <label className={styles.champ}>
              <span>{t("maturité suivie")}</span>
              <select name="maturite" defaultValue={String(maturite)}>
                {vue.maturites.map((x) => (
                  <option key={x} value={x}>
                    {duree(x)}
                  </option>
                ))}
              </select>
            </label>
            {desk ? (
              <label className={styles.champ}>
                <span>{t("nos séances")}</span>
                <select name="instrument" defaultValue={instrument}>
                  {["Tous", "BTA", "OTA"].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <input type="hidden" name="instrument" value={instrument} />
            )}
            <button type="submit" className={styles.appliquer}>
              {t("Appliquer")}
            </button>
          </div>
        </form>

        {/* ---------- 1. les chiffres ---------- */}
        <section className={styles.panneau}>
          <div className={styles.panneauH}>
            <h2>{t("Ce que la sélection dit")}</h2>
            <span className={desk ? styles.provNous : styles.provPublie}>{desk ? t("BEAC et notre lecture") : t("publié par la BEAC")}</span>
          </div>
          <div className={styles.chiffres}>
            {[
              { b: nb(vFin, 1), u: "Mds", s: t("Encours au dernier mois connu"), e: sel.join(", ") },
              {
                b: vDeb ? `× ${nb((vFin ?? 0) / vDeb, 1)}` : "—",
                u: "",
                s: encDeb(refPays) ? t("depuis {m}", { m: moisCourt(encDeb(refPays)!.m) }) : t("pas de relevé au début"),
                e: vDeb ? t("De {a} à {b} milliards.", { a: nb(vDeb, 1), b: nb(vFin, 1) }) : t("La période ne contient qu'un relevé, ou aucun."),
              },
              { b: prevu ? nb((100 * realise) / prevu, 0) : "—", u: "%", s: t("taux de service"), e: t("{r} Mds levés pour {p} mis en adjudication.", { r: nb(realise, 1), p: nb(prevu, 1) }) },
              { b: sousMoy != null ? nb(sousMoy, 0) : "—", u: "%", s: t("souscription moyenne"), e: t("Sur {n} séance(s) des rapports hebdomadaires.", { n: nSous }) },
              { b: coutMoy != null ? nb(coutMoy, 2) : "—", u: "%", s: t("coût moyen du bon"), e: t("Moyenne des {n} Trésor(s) retenu(s), au dernier relevé.", { n: coutsBta.length }) },
              ...(desk
                ? [{ b: beacSel ? nb((100 * nousSel) / beacSel, 0) : "—", u: "%", s: t("expliqués par nos communiqués"), e: t("{n} Mds adjugés et non échus. Ne pas publier.", { n: nb(nousSel, 1) }) }]
                : []),
            ].map((c) => (
              <div key={c.s} className={styles.chiffre}>
                <b>
                  {c.b}
                  {c.u ? <small>{c.u}</small> : null}
                </b>
                <span>{c.s}</span>
                <em>{c.e}</em>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- 2. une fiche par Trésor ---------- */}
        <div className={styles.titreRang}>
          <h2>{t("Une fiche par Trésor")}</h2>
          <span className={styles.muted}>{t("au dernier mois connu de chacun")}</span>
        </div>
        <div className={styles.fiches}>
          {seuls.map((q) => {
            const e = encFin(q);
            const e0 = encDeb(q);
            const bta = (vue.couts[`${q}|BTA`] ?? []).slice(-1)[0];
            const ota = (vue.couts[`${q}|OTA`] ?? []).slice(-1)[0];
            const pe = dansP(vue.pente[q]).slice(-1)[0];
            const so = dansP(vue.souscription[q]).slice(-1)[0];
            const cv = couv.lignes.find((l) => l.pays === q);
            const base = sel.includes(ZONE) ? encFin(ZONE)?.v : seuls.reduce((s, x) => s + (encFin(x)?.v ?? 0), 0);
            const part = base && e ? (100 * e.v) / base : undefined;
            const varP = e && e0 && e0.v && e.m !== e0.m ? (100 * (e.v - e0.v)) / e0.v : undefined;
            const sien = dansP(vue.offre[q]);
            const svc = sien.reduce((s, x) => s + x.prevu, 0) ? (100 * sien.reduce((s, x) => s + x.realise, 0)) / sien.reduce((s, x) => s + x.prevu, 0) : undefined;
            return (
              <article key={q} className={styles.fiche} style={{ borderTopColor: COULEURS[q] }}>
                <header>
                  <b>
                    <i style={{ background: COULEURS[q] }} />
                    {q}
                  </b>
                  <span>{e ? moisCourt(e.m) : t("pas d'encours")}</span>
                </header>
                <table>
                  <tbody>
                    <tr>
                      <td>{t("Encours")}</td>
                      <td>{e ? `${nb(e.v, 1)} Mds` : "—"}</td>
                    </tr>
                    <tr>
                      <td>{t("Part de la sélection")}</td>
                      <td>{part != null ? `${nb(part, 1)} %` : "—"}</td>
                    </tr>
                    <tr>
                      <td>{t("Sur la période")}</td>
                      <td className={varP != null && varP > 0 ? styles.hausse : varP != null && varP < 0 ? styles.baisse : undefined}>{varP != null ? `${sg(varP, 0)} %` : "—"}</td>
                    </tr>
                    <tr>
                      <td>{t("Coût du bon")}</td>
                      <td>{bta ? `${nb(bta.v, 2)} %` : "—"}</td>
                    </tr>
                    <tr>
                      <td>{t("Coût de l'obligation")}</td>
                      <td>{ota ? `${nb(ota.v, 2)} %` : "—"}</td>
                    </tr>
                    <tr>
                      <td>{t("Pente 10 ans − 1 an")}</td>
                      <td>{pe ? `${sg(pe.v, 2)} pts` : "—"}</td>
                    </tr>
                    <tr>
                      <td>{t("Souscription")}</td>
                      <td>{so ? `${nb(so.v, 0)} %` : "—"}</td>
                    </tr>
                    <tr>
                      <td>{t("Taux de service")}</td>
                      <td>{svc != null ? `${nb(svc, 0)} %` : "—"}</td>
                    </tr>
                    {desk ? (
                      <tr>
                        <td>{t("Part couverte par nos pièces")}</td>
                        <td>{cv && cv.beac ? `${nb((100 * cv.communiques) / cv.beac, 0)} %` : "—"}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
                <div className={styles.mini}>
                  <Trace
                    series={[{ couleur: COULEURS[q], pts: dansP(vue.parMaturite[`${q}|${maturite}`]).map((x) => ({ x: auTemps(x.m), y: x.v })) }]}
                    options={{ hauteur: 80, pas: 5, fy: (v) => nb(v, 0), marge: 0.02 }}
                    vide={t("rien à {d}", { d: duree(maturite) })}
                    titre={`${q} ${duree(maturite)}`}
                  />
                </div>
              </article>
            );
          })}
        </div>

        {/* ---------- 3. l'encours ---------- */}
        <section className={styles.panneau}>
          <div className={styles.panneauH}>
            <h2>{t("Encours des valeurs du Trésor")}</h2>
            <span className={styles.coin}>
              <span className={styles.provPublie}>{t("publié par la BEAC")}</span>
              <Formes clef="fEncours" actuel={fEncours} choix={[["ligne", "Niveau"], ["barres", "Barres"], ["variation", "Variation"], ["part", "Part"]]} />
            </span>
          </div>
          <div className={styles.panneauC}>
            <Trace
              series={serieEncours}
              options={{
                hauteur: 250,
                y0: fEncours === "variation" ? undefined : 0,
                fy: fEncours === "variation" ? (v) => `${sg(v, 0)} %` : fEncours === "part" ? (v) => `${nb(v, 0)} %` : (v) => v.toLocaleString("fr-FR"),
                tx: anneesDe(serieEncours),
              }}
              vide={t("Aucun encours officiel dans cette période.")}
              titre={t("Encours des valeurs du Trésor")}
            />
            <Legende items={nomsLegende(sel.filter((q) => dansP(vue.encours[q]).length && (fEncours !== "part" || q !== ZONE)), fEncours !== "barres")} />
            <p className={styles.note}>
              {fEncours === "variation"
                ? t("D'un relevé au suivant, et non par mois : la BEAC ne publie pas tous les mois, deux points peuvent être distants d'un an et l'écart est alors annuel.")
                : fEncours === "part"
                  ? t("La part de chaque Trésor dans la sélection, relevé par relevé. La zone est exclue de ce calcul : elle vaudrait cent.")
                  : t("Les points gardent leur place dans le temps. La BEAC rappelle juin et juillet de chaque année, pas les douze mois : les poser à intervalles égaux ferait croire à une croissance régulière.")}
            </p>
          </div>
        </section>

        {/* ---------- 4. la courbe ---------- */}
        <section className={styles.panneau}>
          <div className={styles.panneauH}>
            <h2>{t("Courbes de rendement")}</h2>
            <span className={styles.coin}>
              <span className={desk && fCourbe === "niveau" ? styles.provNous : styles.provPublie}>{desk && fCourbe === "niveau" ? t("BEAC et nos relevés") : t("publié par la BEAC")}</span>
              <Formes clef="fCourbe" actuel={fCourbe} choix={[["niveau", "Niveau"], ["variation", "Écart au mois précédent"]]} />
            </span>
          </div>
          <div className={styles.panneauC}>
            <Trace
              series={serieCourbe}
              options={{
                hauteur: 290,
                y0: fCourbe === "variation" ? undefined : 0,
                pas: fCourbe === "variation" ? undefined : 2,
                fy: fCourbe === "variation" ? (v) => sg(v, 0) : (v) => `${nb(v, 0)} %`,
                tx: (vue.courbes[`${moisCourbe}|${nomsCourbe[0]}`] ?? []).map((x) => ({ x: x.annees, l: x.tenor })),
              }}
              vide={
                fCourbe === "variation"
                  ? t("Pas de mois précédent comparable pour cette sélection.")
                  : t("Aucune feuille lisible pour ce mois et ces Trésors : la BEAC l'a publiée en image, ou pas publiée.")
              }
              titre={t("Courbes de rendement")}
            />
            <Legende
              items={[
                ...nomsLegende(nomsCourbe, fCourbe !== "variation"),
                ...(desk && fCourbe === "niveau" && rapprochements.some((x) => x.m === moisCourbe) ? [{ couleur: "#0b2545", texte: t("une séance que nous avons lue"), trait: false }] : []),
              ]}
            />
            <p className={styles.note}>
              {fCourbe === "variation"
                ? t("L'écart en points de base contre {m}. Seules les maturités présentes les deux mois sont montrées : comparer un point à rien ne mesure rien.", {
                    m: precedent ? moisLong(precedent) : t("le mois précédent"),
                  })
                : t("{m}. Le cercle marque la maturité choisie dans les réglages.", { m: moisCourbe ? moisLong(moisCourbe) : "" })}
            </p>
          </div>
        </section>

        {/* ---------- 5. le prix du temps ---------- */}
        <section className={styles.panneau}>
          <div className={styles.panneauH}>
            <h2>{t("Le prix du temps")}</h2>
            <span className={styles.provSomme}>{t("dérivé des courbes BEAC")}</span>
          </div>
          <div className={styles.panneauC}>
            <div className={styles.deux}>
              <div>
                <h3>{t("Rendement à {d}", { d: duree(maturite) })}</h3>
                <Trace
                  series={serieMaturite}
                  options={{ hauteur: 220, y0: 0, pas: 2, fy: (v) => `${nb(v, 0)} %`, tx: anneesDe(serieMaturite) }}
                  vide={t("Aucune courbe lisible à {d}.", { d: duree(maturite) })}
                  titre={t("Rendement à {d}", { d: duree(maturite) })}
                />
              </div>
              <div>
                <h3>{t("Pente, dix ans moins un an")}</h3>
                <Trace
                  series={seriePente}
                  options={{ hauteur: 220, fy: (v) => sg(v, 0), tx: anneesDe(seriePente) }}
                  vide={t("La pente demande le 1 an ET le 10 ans le même mois.")}
                  titre={t("Pente de la courbe")}
                />
              </div>
            </div>
            <Legende items={nomsLegende(seuls.filter((q) => dansP(vue.parMaturite[`${q}|${maturite}`]).length || dansP(vue.pente[q]).length))} />
            <p className={styles.note}>
              {t(
                "La pente n'est calculée que si les deux points existent le même mois. Une courbe dit l'état d'un mois ; la pente dit ce que le marché fait payer au temps.",
              )}
            </p>
          </div>
        </section>

        {/* ---------- 6. la demande ---------- */}
        <section className={styles.panneau}>
          <div className={styles.panneauH}>
            <h2>{t("Demandé et obtenu")}</h2>
            <span className={styles.coin}>
              <span className={styles.provSomme}>{t("somme des rapports hebdomadaires BEAC")}</span>
              <Formes clef="fOffre" actuel={fOffre} choix={[["barres", "Montants"], ["taux", "Taux de service"]]} />
            </span>
          </div>
          <div className={styles.panneauC}>
            <Trace
              series={serieOffre}
              options={{ hauteur: 230, y0: 0, fy: fOffre === "taux" ? (v) => `${nb(v, 0)} %` : (v) => nb(v, 0), tx: anneesDe(serieOffre) }}
              vide={t("Aucune émission dans cette période.")}
              titre={t("Demandé et obtenu")}
            />
            <Legende
              items={
                fOffre === "taux"
                  ? [{ couleur: "#0b2545", texte: t("part du montant annoncé qui a été levée"), trait: false }]
                  : [
                      { couleur: "#c8cfd6", texte: t("mis en adjudication"), trait: false },
                      { couleur: "#0b2545", texte: t("levé"), trait: false },
                    ]
              }
            />
            <p className={styles.note}>
              {fOffre === "taux"
                ? t("Cent pour cent veut dire que le Trésor a obtenu tout ce qu'il demandait. En dessous, la demande a manqué ; au-dessus, il a servi plus qu'annoncé, ce qui arrive sur les abondements.")
                : t("L'écart entre les deux est la tension du marché, et il ne se voit nulle part ailleurs : un communiqué de résultats dit ce qui a été servi, il ne dit pas ce qui manquait.")}
            </p>
            <div className={styles.suite}>
              <h3>{t("Taux de souscription des séances du mois")}</h3>
              <Trace
                series={serieSouscription}
                options={{ hauteur: 180, y0: 0, fy: (v) => `${nb(v, 0)} %`, tx: anneesDe(serieSouscription) }}
                vide={t("Aucun taux de souscription dans cette période.")}
                titre={t("Taux de souscription")}
              />
              <Legende items={nomsLegende(seuls.filter((q) => dansP(vue.souscription[q]).length))} />
            </div>
          </div>
        </section>

        {/* ---------- 7. le mur ---------- */}
        <section className={styles.panneau}>
          <div className={styles.panneauH}>
            <h2>{t("Mur d'échéances")}</h2>
            <span className={styles.coin}>
              <span className={styles.provSomme}>{t("somme des rapports hebdomadaires BEAC")}</span>
              <Formes clef="fMur" actuel={fMur} choix={[["barres", "Par trimestre"], ["cumul", "Cumulé"]]} />
            </span>
          </div>
          <div className={styles.panneauC}>
            <Trace series={serieMur} options={{ hauteur: 230, y0: 0, fy: (v) => nb(v, 0), tx: anneesDe(serieMur) }} vide={t("Aucune échéance connue pour cette sélection.")} titre={t("Mur d'échéances")} />
            <Legende items={nomsLegende(seuls.filter((q) => (vue.mur[q] ?? []).length), fMur === "cumul")} />
            <p className={styles.note}>
              {fMur === "cumul"
                ? t("Le cumul dit la charge totale que chaque Trésor devra avoir refinancée à une date donnée, sur les lignes dont nous connaissons l'échéance.")
                : t("Les trimestres vides sont gardés : un trou dans un mur est une information, et le supprimer ferait croire à un échéancier régulier.")}
            </p>
          </div>
        </section>

        {/* ---------- 8. le coût ---------- */}
        <section className={styles.panneau}>
          <div className={styles.panneauH}>
            <h2>{t("Coût moyen des ressources")}</h2>
            <span className={styles.provPublie}>{t("publié par la BEAC")}</span>
          </div>
          <div className={styles.panneauC}>
            <div className={styles.deux}>
              {(["BTA", "OTA"] as const).map((inst) => {
                const l = seuls
                  .map((q) => ({ q, c: (vue.couts[`${q}|${inst}`] ?? []).slice(-1)[0] }))
                  .filter((x) => x.c)
                  .sort((x, y) => y.c.v - x.c.v);
                const max = Math.max(1, ...l.map((x) => x.c.v));
                return (
                  <div key={inst}>
                    <h3>{inst === "BTA" ? t("Bons du Trésor") : t("Obligations du Trésor")}</h3>
                    {l.length ? (
                      <table className={styles.barres}>
                        <tbody>
                          {l.map((x) => (
                            <tr key={x.q}>
                              <td>
                                <i style={{ background: COULEURS[x.q] }} />
                                {x.q}
                              </td>
                              <td>
                                <span className={styles.jauge}>
                                  <i style={{ width: `${((100 * x.c.v) / max).toFixed(0)}%`, background: COULEURS[x.q] }} />
                                </span>
                              </td>
                              <td className={styles.num}>{nb(x.c.v, 2)} %</td>
                              <td className={styles.quand}>{moisCourt(x.c.m)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className={styles.vide}>{t("Aucun coût publié pour cette sélection.")}</p>
                    )}
                  </div>
                );
              })}
            </div>
            <p className={styles.note}>{t("Le coût moyen que chaque Trésor a payé, tel que la BEAC le publie. Le bon se paie presque au même prix partout, l'obligation non.")}</p>
          </div>
        </section>

        {/* ---------- 9. contre nous, au desk seulement ---------- */}
        {desk ? (
          <section className={styles.panneau}>
            <div className={styles.panneauH}>
              <h2>{t("Ce que nos pièces expliquent")}</h2>
              <span className={styles.provNous}>{t("notre lecture")}</span>
            </div>
            <div className={styles.panneauC}>
              <div className={styles.deroule}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t("Trésor")}</th>
                      <th className={styles.num}>{t("Encours BEAC")}</th>
                      <th className={styles.num}>{t("Nos communiqués")}</th>
                      <th className={styles.num}>{t("part")}</th>
                      <th className={styles.num}>{t("Flux net lu")}</th>
                      <th className={styles.num}>{t("pièces")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {couvSel.map((l) => (
                      <tr key={l.pays}>
                        <td>
                          <i className={styles.pave} style={{ background: COULEURS[l.pays] }} />
                          {l.pays}
                        </td>
                        <td className={styles.num}>{nb(l.beac, 1)}</td>
                        <td className={styles.num}>{nb(l.communiques, 1)}</td>
                        <td className={styles.num}>{l.beac ? `${nb((100 * l.communiques) / l.beac, 0)} %` : "—"}</td>
                        <td className={styles.num}>{nb(l.flux, 1)}</td>
                        <td className={styles.num}>
                          {l.seances} + {l.operations}
                        </td>
                      </tr>
                    ))}
                    <tr className={styles.total}>
                      <td>{t("Total")}</td>
                      <td className={styles.num}>{nb(beacSel, 1)}</td>
                      <td className={styles.num}>{nb(nousSel, 1)}</td>
                      <td className={styles.num}>{beacSel ? `${nb((100 * nousSel) / beacSel, 0)} %` : "—"}</td>
                      <td className={styles.num}>{nb(couvSel.reduce((s, l) => s + l.flux, 0), 1)}</td>
                      <td className={styles.num}>
                        {couvSel.reduce((s, l) => s + l.seances, 0)} + {couvSel.reduce((s, l) => s + l.operations, 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className={styles.reserve}>
                <b>{t("Cette table ne sort pas de la maison.")}</b>{" "}
                {t(
                  "Elle mesure NOTRE couverture, pas le marché : un client y lirait un encours qui n'est pas l'encours. Trois choses en sortent par construction : les syndications et placements privés, les communiqués retirés du site, et les séances dont le montant servi n'a pas encore été relu chez nous.",
                )}
              </p>
            </div>
          </section>
        ) : null}

        <p className={styles.source}>
          {t(
            "Sources : {feuilles} feuilles de courbes, les statistiques mensuelles du marché des valeurs du Trésor et les rapports hebdomadaires, BEAC. {points} points de courbe, {encours} encours officiels, {couts} coûts de ressources, {ops} opérations du Trésor. Chaque pièce est rangée dans la bibliothèque partagée.",
            { feuilles: new Set(courbes.map((c) => c.fileKey)).size, points: courbes.length, encours: encoursLignes.length, couts: coutsLignes.length, ops: operations.length },
          )}
        </p>
      </main>
    </>
  );
}
