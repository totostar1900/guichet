import { NextResponse, type NextRequest } from "next/server";
import { repo } from "@/lib/data";
import { readSource } from "@/lib/intake/storage";
import { auctionReadingAvailable, modeleDemande, readAuctionResult, readingTrouble } from "@/lib/market/auction-extract";
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
  /**
   * « complement » : une seconde passe pour les colonnes nées après la
   * première. Le coupon et le rendement imprimé n'existaient pas quand ces
   * séances ont été lues, et sans coupon une obligation ne se pose sur aucune
   * courbe. La passe ne remplit que du vide, comme l'autre.
   */
  const complement = p.get("mode") === "complement";
  /**
   * « restaure » : relire une séance dont les chiffres ont disparu, confirmée
   * ou non.
   *
   * Le cas s'est présenté le 27 septembre 2026 : une mise à jour partielle a
   * écrit null sur trente et une obligations, dont vingt-trois relues. Les
   * deux autres passes les écartent, l'une parce qu'elle ne prend que ce qui
   * n'est pas confirmé, l'autre parce qu'elle ne cherche que le coupon.
   *
   * Des champs vides ne se recouvrent pas : les remplir depuis le communiqué
   * gardé au dépôt ne détruit rien, et c'est exactement ce à quoi sert de
   * garder la pièce. La signature reste, et la mention « à vérifier »
   * apparaît d'elle-même sur la courbe, puisque la mise à jour est
   * postérieure à la confirmation.
   */
  const restaure = p.get("mode") === "restaure";
  /**
   * Reprendre une pièce dont un passage précédent n'a rien tiré.
   *
   * Par défaut non : une pièce illisible le reste, et la reproposer à chaque
   * passage coûte une lecture pour rien, indéfiniment. On ne la rouvre que
   * lorsqu'on a une raison, et cette raison est extérieure au robot.
   */
  const retente = p.get("retente") === "1";
  /**
   * « modele » : lire cette fournée avec un autre modèle que celui de la
   * maison, sans toucher à la configuration ni au bouton du desk. Les scans
   * gabonais n'ont aucune couche de texte et les tchadiens en ont une
   * brouillée : un modèle plus fort y voit peut-être ce qu'un modèle
   * économique laisse en blanc, et c'est une question qui se tranche par
   * l'expérience, pas par une opinion.
   */
  const modele = modeleDemande(p.get("modele"));
  const n = Math.min(Math.max(Number(p.get("n") ?? 6), 1), 12);
  const r = repo();

  /** Le robot est déjà passé sur cette séance : les deux horodatages le disent. */
  const dejaTentee = (x: AuctionResult) => Date.parse(x.updatedAt) > Date.parse(x.createdAt) + 60_000;

  /**
   * Une séance est « à lire » quand elle a sa pièce, pas encore son chiffre, et
   * qu'on n'a pas déjà essayé.
   */
  const aLire = (x: AuctionResult) =>
    Boolean(x.fileKey) && !x.confirmedBy && x.rateAvg == null && x.rateLimit == null && x.priceAvg == null && x.priceLimit == null && (retente || !dejaTentee(x));

  /**
   * Une séance est « à compléter » quand elle porte déjà ses chiffres mais pas
   * le coupon qui les rend comparables.
   *
   * Elle touche aussi les séances relues, et c'est délibéré. Le coupon manque
   * surtout là : le relever à la main sur chacune est le travail que la lecture
   * assistée existe pour éviter. Ce qui protège la règle des quatre yeux n'est
   * pas l'abstention mais la trace : « updated_at » postérieur à
   * « confirmed_at » dit qu'un champ est entré après l'attestation, la courbe
   * le porte sur le point, et la personne qui a signé la séance retrouve la
   * sienne dans une file de vérification.
   */
  const aCompleter = (x: AuctionResult) =>
    Boolean(x.fileKey) && x.instrument === "OTA" && x.couponRate == null && x.yieldAvg == null && (x.priceAvg != null || x.priceLimit != null || x.priceAvgFcfa != null);

  const toutes = await r.listAuctionResults({ country: pays as AuctionResult["country"] | undefined, limit: 1000 });
  /** Une séance dont ni le taux ni le prix ne subsistent, alors que la pièce est là. */
  const videe = (x: AuctionResult) => Boolean(x.fileKey) && x.rateAvg == null && x.rateLimit == null && x.priceAvg == null && x.priceLimit == null;
  const file = toutes
    .filter(restaure ? videe : complement ? aCompleter : aLire)
    .sort((a, b) => Number(dejaTentee(a)) - Number(dejaTentee(b)) || b.sessionOn.localeCompare(a.sessionOn));
  const paquet = file.slice(0, n);

  const faites: string[] = [];
  /** Les modèles réellement employés : comparer deux lectures suppose de savoir d'où chacune vient. */
  const lus = new Set<string>();
  const ratees: { seance: string; raison: string }[] = [];
  for (const x of paquet) {
    try {
      const bytes = await readSource(x.fileKey!);
      const hint = `Séance du ${x.sessionOn}, ${x.instrument}${x.tenor && x.tenor !== "—" ? ` ${x.tenor}` : ""}, ${x.country}.`;
      const { proposal, remarks, model } = await readAuctionResult(Buffer.from(bytes).toString("base64"), hint, modele);
      lus.add(model);
      // Le pays, l'instrument et la date viennent de l'index de la BEAC, qui les
      // donne sans ambiguïté : la lecture du scan ne les redéfinit pas. Seuls
      // les chiffres, la durée et le code d'émission entrent ici.
      const seul = <T,>(lu: T | undefined) => (complement ? undefined : lu);
      await r.updateAuctionResult(x.id, {
        codeEmission: x.codeEmission ?? proposal.codeEmission,
        tenor: x.tenor && x.tenor !== "—" ? x.tenor : (proposal.tenor ?? x.tenor),
        announced: seul(proposal.announced),
        bid: seul(proposal.bid),
        served: seul(proposal.served),
        networkSize: seul(proposal.networkSize),
        bidders: seul(proposal.bidders),
        rateMin: seul(proposal.rateMin),
        rateMax: seul(proposal.rateMax),
        rateLimit: seul(proposal.rateLimit),
        rateAvg: seul(proposal.rateAvg),
        priceMin: seul(proposal.priceMin),
        priceMax: seul(proposal.priceMax),
        priceLimit: seul(proposal.priceLimit),
        priceAvg: seul(proposal.priceAvg),
        coverage: seul(proposal.coverage),
        priceAvgFcfa: proposal.priceAvgFcfa,
        yieldAvg: proposal.yieldAvg,
        yieldLimit: proposal.yieldLimit,
        couponRate: proposal.couponRate,
        maturityOn: proposal.maturityOn,
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
      html: `${complement ? "Complément automatique (coupon, rendement)" : "Lecture automatique"} : ${faites.length} séance(s) remplie(s)${pays ? ` pour ${pays}` : ""}, en attente de relecture par le desk`,
    });

  return NextResponse.json({ ok: true, mode: restaure ? "restaure" : complement ? "complement" : "lecture", retente, modeles: [...lus], pays: pays ?? "toutes", lues: faites.length, restantes: file.length - paquet.length, faites, ratees });
}
