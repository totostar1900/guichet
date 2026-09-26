import { NextResponse, type NextRequest } from "next/server";
import { loadRegistry } from "@/lib/reference";
import { repo } from "@/lib/data";
import { localIso } from "@/lib/format";
import { BEAC_ANNONCES, beacLabel, forthcoming, parseBeacRows } from "@/lib/market/beac";

/**
 * Les adjudications de la zone, prises à la source qui les publie toutes.
 *
 * Une adjudication s'annonce une semaine avant de se fermer. Le desk l'apprend
 * par courriel quand il est destinataire, ce qui reste le chemin le plus
 * rapide ; mais rien ne garantit qu'il reçoive celle du Tchad, et une
 * adjudication qu'on découvre la veille n'a pas de carnet. La BEAC les publie
 * toutes, au même endroit et le jour même.
 *
 * Ce robot ne publie rien. Il dépose dans « À valider », exactement là où
 * arrivent les courriels, et le desk fait le reste : c'est la même relecture
 * pour la même nature d'information, et la BEAC devient une source de plus, non
 * un second chemin qui contournerait le premier.
 *
 * Il ne réécrit jamais une fiche déjà déposée. Le titre d'un communiqué est
 * unique chez la BEAC, et c'est lui qui sert de clef : un robot qui reposerait
 * chaque jour les mêmes annonces enterrerait la file sous les doublons.
 *
 * À appeler chaque jour, avec « Authorization: Bearer <CRON_SECRET> ».
 */
export async function GET(req: NextRequest) {
  await loadRegistry();
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });

  const r = repo();
  const today = localIso(new Date());

  let html = "";
  try {
    const res = await fetch(BEAC_ANNONCES, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0; +https://guichet.purposecapital.africa)" }, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (e) {
    await r.logEvent({ kind: "system", html: `BEAC : la page des annonces n'a pas répondu (${e instanceof Error ? e.message : "erreur"})` });
    return NextResponse.json({ ok: false, error: "beac unreachable" }, { status: 502 });
  }

  const rows = parseBeacRows(html);
  if (!rows.length) {
    // Le gabarit de la page a changé : un silence bruyant vaut mieux qu'un
    // calendrier à moitié juste que personne ne remarquerait.
    await r.logEvent({ kind: "system", html: "BEAC : la page des annonces n'a plus la forme attendue, aucune ligne lue" });
    return NextResponse.json({ ok: false, error: "shape changed", rows: 0 }, { status: 502 });
  }

  // « depuis » rattrape : au premier passage il n'y a rien derrière, et un jour
  // manqué laisserait passer une séance annoncée la veille pour la semaine
  // suivante. Sans le paramètre, le robot ne regarde que devant lui.
  const since = req.nextUrl.searchParams.get("depuis");
  const from = since && /^\d{4}-\d{2}-\d{2}$/.test(since) ? since : today;
  const next = forthcoming(rows, from);
  const known = new Set((await r.listIntake()).map((i) => i.title));
  let created = 0;

  for (const a of next) {
    if (known.has(a.doc.title)) continue;
    await r.createIntake({
      source: "pdf",
      title: a.doc.title,
      fromLabel: `BEAC · Annonces et Communiqués · ${a.doc.country}`,
      receivedAt: new Date().toISOString(),
      state: "a_valider",
      rawText: `Communiqué publié par la BEAC : ${a.doc.url}`,
      draft: {
        kind: a.instrument,
        operation: a.abondement ? "abondement" : "nouvelle_ligne",
        country: a.country,
        countryName: a.doc.country,
        title: beacLabel(a),
        sourceRef: a.doc.title,
        // La date lue est celle de la séance. La clôture côté Guichet doit la
        // précéder, puisqu'il faut agréger et transmettre : c'est au desk de la
        // poser, et le champ part donc « à vérifier » plutôt que rempli d'office.
        deadlineAt: a.on ? `${a.on}T12:00:00` : undefined,
        official: true,
        confidence: { kind: "sure", country: "sure", deadlineAt: "check", title: "check" },
        remarks: [
          `Séance du ${a.on} annoncée par la BEAC.`,
          "La clôture côté Guichet doit précéder la séance : le temps d'agréger les intentions et de transmettre.",
          "Montant, taux et nominal sont dans le communiqué : ils ne sont pas dans son titre.",
        ],
      },
    });
    created += 1;
  }

  if (created) await r.logEvent({ kind: "system", html: `BEAC : ${created} adjudication(s) annoncée(s) déposée(s) dans « À valider »` });
  return NextResponse.json({ ok: true, day: today, from, rows: rows.length, forthcoming: next.length, created });
}
