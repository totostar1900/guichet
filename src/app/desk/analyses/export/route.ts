import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { isDesk } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { toCsv } from "@/lib/reporting";
import { localIso } from "@/lib/format";
import { pressureByYear } from "@/lib/market/auction-stats";
import { brief, briefTexte } from "@/lib/market/brief";
import { buildCurve, MIN_POINTS } from "@/lib/market/curve";
import { freshness, liquidity } from "@/lib/market/liquidity";

/**
 * Ce que le dossier d'analyses laisse emporter : desk seulement.
 *
 * Deux formes, et elles ne servent pas la même chose. Le brouillon de note est
 * de la prose à relire et à signer ailleurs ; le CSV est la matière d'un
 * tableur, pour qui veut refaire un calcul plutôt que le citer.
 *
 * Ni l'un ni l'autre n'emporte ce que la page marque « interne ». C'est le seul
 * filtre, et il est le sujet : un fichier qui contiendrait l'exécution du
 * programme d'émission ferait sortir du desk une mesure calculée sur notre
 * échantillon, présentée comme le programme d'un Trésor.
 *
 * La colonne « origine » du CSV vaut la colonne « relue par » de l'autre
 * export : elle dit d'où vient le rendement, ce qu'un lecteur ne peut pas
 * retrouver seul une fois le chiffre recopié dans une feuille.
 */
export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s || !isDesk(s)) return new NextResponse("Accès desk requis", { status: 403 });

  const r = repo();
  const on = localIso(new Date());
  const ilYADeuxAns = new Date();
  ilYADeuxAns.setFullYear(ilYADeuxAns.getFullYear() - 2);

  const [seances, bulletins, activite, cotes] = await Promise.all([
    r.listAuctionResults({ limit: 2000 }),
    r.listBulletins(1000).catch(() => []),
    r.quoteActivity(ilYADeuxAns.toISOString().slice(0, 10)).catch(() => []),
    r.latestQuotes().catch(() => []),
  ]);
  const relues = seances.filter((x) => x.confirmedBy);
  const curve = buildCurve(seances, { on, windowDays: 365 });
  const liq = liquidity(activite, cotes);
  const frais = liq ? freshness(liq) : undefined;
  const avecIndice = bulletins.filter((b) => b.indexValue != null);
  const dernier = avecIndice.reduce<(typeof avecIndice)[number] | undefined>((m, b) => (!m || b.sessionDate > m.sessionDate ? b : m), undefined);
  const premier = avecIndice.reduce<(typeof avecIndice)[number] | undefined>((m, b) => (!m || b.sessionDate < m.sessionDate ? b : m), undefined);

  if (req.nextUrl.searchParams.get("format") === "csv") {
    // Un point de courbe par ligne : c'est ce qui se recalcule, et chaque ligne
    // porte de quoi refaire le chemin jusqu'à la pièce.
    const csv = toCsv(
      ["Trésor", "Durée", "Rendement %", "Origine", "Ce qui a été supposé", "Séance", "Âge en jours", "Représentativité", "Soumissionnaires", "Champ entré après confirmation"],
      curve.countries.flatMap((c) =>
        c.points.map((p) => [
          c.country,
          p.tenor,
          p.yield.pct.toFixed(4).replace(".", ","),
          p.yield.origin,
          p.yield.assumptions.map((a) => a.key).join(" · "),
          p.from.sessionOn,
          p.ageDays,
          p.thin ? "séance mince" : "représentative",
          p.from.bidders ?? "",
          p.toVerify ? "oui" : "non",
        ]),
      ),
    );
    return new NextResponse(csv, {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="courbe-cemac-${on}.csv"` },
    });
  }

  const b = brief({
    on,
    curve,
    minPoints: MIN_POINTS,
    pression: pressureByYear(relues),
    liq,
    frais,
    indice: dernier?.indexValue != null ? { niveau: dernier.indexValue, le: dernier.sessionDate, depuis: premier?.indexValue != null ? { niveau: premier.indexValue, le: premier.sessionDate } : undefined } : undefined,
  });
  return new NextResponse(briefTexte(b), {
    headers: { "content-type": "text/plain; charset=utf-8", "content-disposition": `attachment; filename="brouillon-note-${on}.txt"` },
  });
}
