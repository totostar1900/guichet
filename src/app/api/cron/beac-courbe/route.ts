import { NextResponse, type NextRequest } from "next/server";
import { routeDuRobot } from "@/lib/cron/tour";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { abscisses, calibrer, listerBulletins, series, tresorsDuTitre, type ReleveBeac } from "@/lib/market/beac-bulletin";
import { repo } from "@/lib/data";

/**
 * La courbe de la BEAC, relevée chaque mois dans son bulletin.
 *
 * Elle paraît une fois par mois avec environ deux mois de retard, et nous la
 * posons en filigrane derrière la nôtre. Un filigrane figé dans le code se
 * périme en silence : celui-ci se rafraîchit, et porte sa date.
 *
 * Le robot ne lit pas des chiffres, il relève un tracé. La BEAC publie sa
 * courbe comme un graphique, sans table et sans note de méthode ; les
 * coordonnées de son tracé vectoriel sont dans le document, et les graduations
 * de son axe aussi. Rien n'est estimé à l'œil, et tout se refuse : une échelle
 * qui n'est pas droite, un taux hors du monde, un bulletin sans texte.
 *
 * Car un bulletin sur deux est un scan. Celui de janvier 2026 porte zéro
 * caractère sur ses seize pages. Le robot passe alors au suivant plutôt que de
 * rendre une courbe vide, et dit combien il en a écartés.
 *
 * `Authorization: Bearer <CRON_SECRET>`.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PAGE = "https://www.beac.int/m-des-titres-publics/statistiques-mensuelles-marche-valeurs-tresor/";
const UA = "Mozilla/5.0 (compatible; Guichet/1.0; +https://guichet.purposecapital.africa)";
/** Au-delà, on remonte dans des bulletins que personne ne regardera. */
const A_ESSAYER = 6;

/** Les tracés d'une page, tels que pdf.js les rend. */
function tracesDe(ops: { fnArray: number[]; argsArray: unknown[] }): { x: number; y: number }[][] {
  const out: { x: number; y: number }[][] = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] !== pdfjs.OPS.constructPath) continue;
    const [types, args] = ops.argsArray[i] as [number[], number[]];
    const pts: { x: number; y: number }[] = [];
    let k = 0;
    for (const t of types) {
      if (t === pdfjs.OPS.moveTo || t === pdfjs.OPS.lineTo) {
        pts.push({ x: args[k], y: args[k + 1] });
        k += 2;
      } else if (t === pdfjs.OPS.curveTo) {
        pts.push({ x: args[k + 4], y: args[k + 5] });
        k += 6;
      } else if (t === pdfjs.OPS.rectangle) k += 4;
    }
    if (pts.length) out.push(pts);
  }
  return out;
}

/** Relève la courbe d'un bulletin, ou dit pourquoi il n'y en a pas. */
async function relever(url: string): Promise<{ series: ReleveBeac["series"] } | { refus: string }> {
  const res = await fetch(url, { headers: { "user-agent": UA }, cache: "no-store" });
  if (!res.ok) return { refus: `le PDF répond ${res.status}` };
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await res.arrayBuffer()), disableFontFace: true }).promise;

  /* La figure est page 5 d'ordinaire, mais la pagination bouge : on cherche. */
  for (let n = 1; n <= Math.min(doc.numPages, 12); n++) {
    const page = await doc.getPage(n);
    const contenu = await page.getTextContent();
    const mots = contenu.items
      .filter((i): i is typeof i & { str: string; transform: number[] } => "str" in i && Boolean(i.str.trim()))
      .map((i) => ({ s: i.str.trim(), x: i.transform[4], y: i.transform[5] }));
    if (!mots.length) continue;
    const noms = tresorsDuTitre(mots.map((m) => m.s).join(" "));
    if (!noms.length) continue;

    const cal = calibrer(mots);
    if (typeof cal === "string") return { refus: cal };
    const abs = abscisses(mots, cal.x);
    if (abs.length < 4) return { refus: "aucune courbe des taux dans ce bulletin" };
    const s = series(tracesDe(await page.getOperatorList()), cal, abs, noms);
    if (typeof s === "string") return { refus: s };
    return { series: s };
  }
  return { refus: "le bulletin est un scan : aucun texte à relever" };
}

export async function GET(req: NextRequest) {
  return routeDuRobot("beac-courbe", req, async () => {
  
    const page = await fetch(PAGE, { headers: { "user-agent": UA }, cache: "no-store" });
    if (!page.ok) return NextResponse.json({ ok: false, error: `la page des statistiques répond ${page.status}` }, { status: 502 });
    const bulletins = listerBulletins(await page.text()).slice(0, A_ESSAYER);
    if (!bulletins.length) return NextResponse.json({ ok: false, error: "aucun bulletin listé sur la page" }, { status: 502 });
  
    const r0 = repo();
    const derniere = await r0.latestBeacCurve();
    const deja = new Set(derniere ? [derniere.numero] : []);
  
    const ecartes: { numero: number; pourquoi: string }[] = [];
    for (const b of bulletins) {
      if (deja.has(b.numero)) continue;
      const r = await relever(b.url);
      if ("refus" in r) {
        ecartes.push({ numero: b.numero, pourquoi: r.refus });
        continue;
      }
      /* Le plus récent qui donne quelque chose suffit : les précédents sont déjà
         en base, ou n'ont rien à donner. */
      await r0.saveBeacCurve({ numero: b.numero, mois: b.mois, source: b.url, releveLe: new Date().toISOString(), series: r.series });
      return NextResponse.json({ ok: true, releve: { numero: b.numero, mois: b.mois, tresors: r.series.map((s) => s.pays), points: r.series.reduce((n, s) => n + s.points.length, 0) }, ecartes });
    }
  
    return NextResponse.json({ ok: true, releve: null, deja: [...deja], ecartes, dit: ecartes.length ? "aucun bulletin neuf ne porte de courbe relevable" : "rien de neuf" });
  });
}
