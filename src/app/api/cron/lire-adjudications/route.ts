import { NextResponse, type NextRequest } from "next/server";
import { repo } from "@/lib/data";
import { readSource } from "@/lib/intake/storage";
import { auctionReadingAvailable, readAuctionResult, readingTrouble } from "@/lib/market/auction-extract";
import type { AuctionResult } from "@/lib/market/auction-results";

/**
 * Lire une poignée de communiqués d'un coup, et rien de plus.
 *
 * Deux cent cinquante-trois séances dorment dans l'index de la BEAC. Les ouvrir
 * une à une pour presser le même bouton n'apprend rien à personne et occupe un
 * desk de deux personnes pendant des heures ; ce robot fait la partie mécanique,
 * qui est d'aller chercher les chiffres dans un scan.
 *
 * Ce qu'il ne fait pas est le sujet. Il n'arrête aucune lecture : les séances
 * qu'il remplit restent « à relire », et c'est une personne qui les confirme,
 * séance par séance, avec la pièce ouverte à côté. La distinction tient tout
 * l'édifice : un chiffre lu de travers qui deviendrait référence sans que
 * personne ne l'ait regardé se propagerait sans bruit à toutes les offres
 * suivantes. Un robot qui confirmerait lui-même supprimerait la seule barrière
 * qui existe contre cela.
 *
 * Il ne touche pas non plus à ce qui est déjà lu : une séance dont les chiffres
 * sont en base est passée par quelqu'un ou par un passage précédent, et une
 * seconde lecture automatique ne doit pas écraser une correction faite à la
 * main. Il ne prend que ce qui est vide.
 *
 * Enfin il travaille par petits paquets. La fonction qui l'exécute a une minute
 * pour vivre, et une lecture prend quelques secondes : « n » borne le paquet, et
 * l'appelant rappelle tant qu'il reste du travail. Le compte rendu dit ce qui
 * reste, pour qu'il sache quand s'arrêter.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  if (!auctionReadingAvailable()) return NextResponse.json({ ok: false, error: "lecture automatique indisponible" }, { status: 503 });

  const p = req.nextUrl.searchParams;
  const pays = p.get("pays") ?? undefined;
  const n = Math.min(Math.max(Number(p.get("n") ?? 6), 1), 12);
  const r = repo();

  /** Une séance est « à lire » quand elle a sa pièce et pas encore son chiffre. */
  const aLire = (x: AuctionResult) => Boolean(x.fileKey) && !x.confirmedBy && x.rateAvg == null && x.rateLimit == null && x.priceAvg == null && x.priceLimit == null;

  const toutes = await r.listAuctionResults({ country: pays as AuctionResult["country"] | undefined, limit: 1000 });
  const file = toutes.filter(aLire).sort((a, b) => b.sessionOn.localeCompare(a.sessionOn));
  const paquet = file.slice(0, n);

  const faites: string[] = [];
  const ratees: { seance: string; raison: string }[] = [];
  for (const x of paquet) {
    try {
      const bytes = await readSource(x.fileKey!);
      const hint = `Séance du ${x.sessionOn}, ${x.instrument}${x.tenor && x.tenor !== "—" ? ` ${x.tenor}` : ""}, ${x.country}.`;
      const { proposal, remarks } = await readAuctionResult(Buffer.from(bytes).toString("base64"), hint);
      // Le pays, l'instrument et la date viennent de l'index de la BEAC, qui les
      // donne sans ambiguïté : la lecture du scan ne les redéfinit pas. Seuls
      // les chiffres, la durée et le code d'émission entrent ici.
      await r.updateAuctionResult(x.id, {
        codeEmission: proposal.codeEmission,
        tenor: proposal.tenor && proposal.tenor !== "—" ? proposal.tenor : x.tenor,
        announced: proposal.announced,
        bid: proposal.bid,
        served: proposal.served,
        networkSize: proposal.networkSize,
        bidders: proposal.bidders,
        rateMin: proposal.rateMin,
        rateMax: proposal.rateMax,
        rateLimit: proposal.rateLimit,
        rateAvg: proposal.rateAvg,
        priceMin: proposal.priceMin,
        priceMax: proposal.priceMax,
        priceLimit: proposal.priceLimit,
        priceAvg: proposal.priceAvg,
        coverage: proposal.coverage,
      });
      faites.push(`${x.sessionOn} ${x.instrument} ${x.tenor}`);
      if (remarks.length) {
        await r.logEvent({
          kind: "system",
          html: `Lecture automatique · <b>${x.instrument} ${x.tenor}</b>, ${x.country}, séance du ${x.sessionOn} : ${remarks.map((m) => m.replace(/</g, "&lt;")).join(" · ")}`,
        });
      }
    } catch (e) {
      ratees.push({ seance: `${x.sessionOn} ${x.instrument} ${x.tenor}`, raison: readingTrouble(e instanceof Error ? e.message : String(e)) });
    }
  }

  if (faites.length)
    await r.logEvent({
      kind: "system",
      html: `Lecture automatique : ${faites.length} séance(s) remplie(s)${pays ? ` pour ${pays}` : ""}, en attente de relecture par le desk`,
    });

  return NextResponse.json({ ok: true, pays: pays ?? "toutes", lues: faites.length, restantes: file.length - paquet.length, faites, ratees });
}
