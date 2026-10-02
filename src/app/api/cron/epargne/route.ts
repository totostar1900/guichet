import { NextResponse, type NextRequest } from "next/server";
import { loadRegistry } from "@/lib/reference";
import { repo } from "@/lib/data";
import { fmt, fmtDate, localIso } from "@/lib/format";
import { instalmentLabel, isDue, reinvestLabel, reinvestissementDu, standingBlock } from "@/lib/domain/standing";
import { cashPosition } from "@/lib/domain/cash";
import { notifyIntentUpdated } from "@/lib/notify/dispatch";
import { envoyerPreavis } from "@/lib/notify/preavis";
import { arretables, dueOnDuPreavis, montantAExecuter, pourquoiPasExecuter, type Preavis } from "@/lib/domain/preavis";
import { loadStandingPolicy } from "@/lib/policy";

/**
 * Le robot de l'épargne programmée : un versement par instruction et par mois.
 *
 * Il ne décide de rien, et c'est sa raison d'être. Chaque instruction porte déjà
 * son montant, sa destination, son jour et ce qu'il advient quand l'exécution
 * est impossible : le robot lit, et exécute. Le jour où il faudrait lui faire
 * choisir quelque chose, ce ne serait plus de l'exécution mais de la gestion, et
 * la maison n'a pas cet agrément.
 *
 * Deux garanties valent d'être dites, parce que les manquer coûterait cher dans
 * les deux sens.
 *
 * Il rattrape. Une instruction au 5 dont le robot n'a pas tourné le 5 part le 6,
 * ou le 9 : le client a demandé un versement par mois, pas un versement à la
 * seconde. Sans cela, une panne d'une nuit sauterait un mois d'épargne.
 *
 * Il ne double jamais. Le mois est consommé dès qu'il a été traité, qu'un ordre
 * en soit sorti ou non : deux versements le même mois seraient un prélèvement
 * que le client n'a pas demandé, et c'est la faute à ne pas commettre.
 *
 * ─── Les deux sources ──────────────────────────────────────────────────────
 *
 * Il exécute aussi les instructions de RÉINVESTISSEMENT, et celles-là ne
 * regardent pas le calendrier : c'est l'argent réellement encaissé qui les
 * déclenche, et le montant est ce qui est arrivé. Un robot qui placerait une
 * échéance non encaissée engagerait un argent que la maison n'a pas reçu, et
 * un robot qui attendrait le 5 du mois laisserait le coupon dormir, ce que la
 * politique des espèces interdit.
 *
 * Le disponible se lit au journal, jamais dans l'échéancier : c'est le solde
 * qui n'attend aucune autre opération. Le versement le consomme en s'inscrivant
 * au journal en regard de l'ordre produit, de sorte qu'un second passage le
 * lendemain ne trouve plus rien à placer. L'idempotence est là, dans la
 * comptabilité, et non dans une date de dernier passage.
 *
 * ─── Prévenir avant, et laisser le temps de dire non ───────────────────────
 *
 * Le robot créait l'ordre PUIS prévenait, et l'envoi du message vivait dans un
 * try/catch vide. Une banque qui vous informe d'un prélèvement après l'avoir
 * fait vous informe ; elle ne vous laisse pas décider.
 *
 * Chaque tour fait donc deux choses, et dans cet ordre :
 *
 *   IL EXÉCUTE ce qui a été annoncé et dont le jour est venu, au plus pour le
 *   montant annoncé. L'exécution d'abord, parce qu'une occurrence du jour doit
 *   partir avant qu'on en annonce une nouvelle sur le même argent.
 *
 *   IL ANNONCE ce qui vient, et n'exécute rien de ce qu'il annonce. Un
 *   versement garde le jour choisi par le client et s'annonce la veille ; un
 *   réinvestissement s'annonce le jour où l'argent est là et part après le
 *   délai, parce que « demain » n'est pas connaissable quand c'est l'argent
 *   arrivé qui déclenche.
 *
 * ET PAS D'EXÉCUTION SANS PRÉAVIS RÉELLEMENT PARTI. Un préavis qui échoue
 * laisse l'occurrence en vie sans l'exécuter, et le journal le dit. Le risque
 * est qu'un client au canal cassé n'ait plus de versement ; c'est assumé, parce
 * que l'inverse est d'engager son argent en silence.
 *
 * À appeler chaque jour, avec « Authorization: Bearer <CRON_SECRET> ».
 */
export async function GET(req: NextRequest) {
  await loadRegistry();
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });

  const r = repo();
  const today = localIso(new Date());
  const [orders, offers, policy, enCours] = await Promise.all([r.listStandingOrders(), r.listOffers(), loadStandingPolicy(), r.listPreavis({ state: "annoncee" }).catch(() => [] as Preavis[])]);
  const byId = new Map(offers.map((o) => [o.id, o]));
  const parInstruction = new Map<string, Preavis[]>();
  for (const x of enCours) parInstruction.set(x.standingId, [...(parInstruction.get(x.standingId) ?? []), x]);
  let placed = 0;
  let skipped = 0;
  let ended = 0;
  let reinvested = 0;
  let annonces = 0;
  let muets = 0;

  /* Le disponible d'un client, lu une fois : plusieurs instructions peuvent
     viser la même poche, et deux lectures indépendantes la placeraient deux
     fois. Ce que le tour consomme se retranche au fur et à mesure. */
  const disponibles = new Map<string, number>();
  const disponible = async (userId: string): Promise<number> => {
    if (!disponibles.has(userId)) {
      const [entries, tous] = await Promise.all([r.listCash(userId), r.listIntents()]);
      disponibles.set(userId, cashPosition(entries, tous.filter((i) => i.clientId === userId)).idle);
    }
    return disponibles.get(userId) ?? 0;
  };

  for (const s of orders) {
    if (s.state !== "active") continue;

    // Une instruction dont le terme est passé s'éteint d'elle-même : elle a fait ce qu'on lui a demandé.
    if (s.endsOn && today > s.endsOn) {
      await r.updateStandingOrder(s.id, { state: "terminee" });
      await r.logEvent({ kind: "system", html: `Épargne programmée ${s.ref} (${s.clientName}) : <b>terminée</b>, le terme du ${fmtDate(s.endsOn)} est passé` });
      ended += 1;
      continue;
    }

    const o = byId.get(s.offerId);
    const quoi = s.source === "encaissements" ? "Réinvestissement" : "Épargne programmée";

    /* ───────── PREMIER TEMPS : exécuter ce qui a été annoncé ─────────
       Avant d'annoncer, parce qu'une occurrence du jour doit partir avant qu'on
       en annonce une nouvelle sur le même argent. */
    const mur = (parInstruction.get(s.id) ?? []).filter((x) => x.dueOn <= today).sort((a, b) => a.dueOn.localeCompare(b.dueOn))[0];
    if (mur) {
      const refus = pourquoiPasExecuter(mur, today);
      if (refus === "pas_parti") {
        /* La règle qui compte : le préavis n'est pas parti, donc rien ne part.
           Le dire à chaque tour serait du bruit ; on le dit une fois, le jour
           où l'occurrence devient exécutable. */
        if (mur.dueOn === today) {
          await r.logEvent({ kind: "system", html: `${quoi} ${s.ref} (${s.clientName}) : <b>rien n'est parti</b>, le préavis du ${fmtDate(mur.dueOn)} n'a pas pu être envoyé · ${mur.noticeError ?? "canal injoignable"}` });
          muets += 1;
        }
      } else if (refus === null) {
        const poche = s.source === "encaissements" ? await disponible(s.userId) : mur.amount;
        const montant = montantAExecuter(mur.amount, poche, s.source === "encaissements" ? s.minAmount : 0);
        const wrong = standingBlock(o, { amount: montant || mur.amount, dayOfMonth: s.dayOfMonth, startsOn: s.startsOn, endsOn: s.endsOn, source: s.source });
        if (montant <= 0 || wrong.length) {
          const why = wrong.length ? wrong.join(" ") : "le disponible annoncé n'est plus là";
          await r.cloturerPreavis(mur.id, { state: "perimee" });
          if (wrong.length && s.onBlocked === "arreter") {
            await r.updateStandingOrder(s.id, { state: "annulee", stopReason: why });
            await r.logEvent({ kind: "system", html: `${quoi} ${s.ref} (${s.clientName}) : <b>arrêté</b> · ${why}` });
          } else {
            await r.logEvent({ kind: "system", html: `${quoi} ${s.ref} (${s.clientName}) : occurrence du ${fmtDate(mur.dueOn)} <b>sans suite</b> · ${why}` });
          }
          if (s.source !== "encaissements") await r.updateStandingOrder(s.id, { lastRunOn: today });
          skipped += 1;
          continue;
        }

        const intent = await r.createIntent({
          offerId: s.offerId,
          type: "souscription",
          amount: montant,
          channel: s.channel,
          contactPhone: s.contactPhone,
          contactEmail: s.contactEmail,
          clientName: s.clientName,
          clientSegment: s.clientSegment,
          clientId: s.userId,
          message: s.source === "encaissements" ? reinvestLabel(s, today, montant) : instalmentLabel(s, today),
          standingId: s.id,
        });
        // Le client a donné son ordre à la signature de l'instruction, et il a eu
        // le préavis : ce versement n'attend pas une confirmation, il attend le règlement.
        const confirmed = await r.updateIntent(intent.id, { state: "confirmee" });
        if (s.source === "encaissements") {
          /* L'argent quitte la poche en s'inscrivant au journal en regard de
             l'ordre : c'est cette écriture, et non une date, qui empêche un
             second passage de replacer la même somme. */
          await r.addCash({ userId: s.userId, amount: montant, kind: "souscription", label: reinvestLabel(s, today, montant), intentId: intent.id, createdBy: "robot" });
          disponibles.set(s.userId, poche - montant);
          reinvested += 1;
        } else {
          placed += 1;
        }
        await r.updateStandingOrder(s.id, { lastRunOn: today });
        await r.cloturerPreavis(mur.id, { state: "executee", intentId: intent.id, paidAmount: montant });
        await r.logEvent({
          kind: "intent",
          intentId: intent.id,
          offerId: s.offerId,
          html: `${intent.ref} (${s.clientName}) : <b>${s.source === "encaissements" ? "réinvestissement" : "versement programmé"}</b> de ${fmt(montant)} FCFA sur ${o?.title ?? s.offerId} · annoncé le ${fmtDate(mur.announcedAt.slice(0, 10))} · ${s.ref}`,
        });
        try {
          await notifyIntentUpdated(confirmed, o!, "confirmee");
        } catch {
          /* L'avis d'exécution peut échouer sans conséquence : le client a déjà
             été prévenu AVANT, et c'est ce préavis-là qui portait sa décision. */
        }
      }
      // Une occurrence encore annoncée pour plus tard n'empêche rien d'autre : on continue.
      if (refus === null || refus === "pas_parti") continue;
    }

    /* ───────── SECOND TEMPS : annoncer ce qui vient ─────────
       Rien ne s'exécute ici. L'occurrence naît, le préavis part, et le délai
       commence à courir. */
    const dueOn = dueOnDuPreavis(s, today, policy);
    if (!dueOn) continue;
    /* AU PLUS UNE OCCURRENCE OUVERTE PAR INSTRUCTION, et pas seulement une par
       jour prévu. « isDue » reste vrai jusqu'à l'exécution, donc un délai de
       plusieurs jours ferait naître une seconde occurrence du même versement le
       lendemain : c'est « ne double jamais » qui tombe. Et pour un
       réinvestissement dont le préavis a échoué, cela éviterait d'engager deux
       fois le même argent. */
    if ((parInstruction.get(s.id) ?? []).length) continue;

    const montantAnnonce = s.source === "encaissements" ? reinvestissementDu(s, await disponible(s.userId)).montant : s.amount;
    if (montantAnnonce <= 0) continue;

    const wrong = standingBlock(o, { amount: montantAnnonce, dayOfMonth: s.dayOfMonth, startsOn: s.startsOn, endsOn: s.endsOn, source: s.source });
    if (wrong.length) {
      const why = wrong.join(" ");
      if (s.onBlocked === "arreter") {
        await r.updateStandingOrder(s.id, { state: "annulee", stopReason: why });
        await r.logEvent({ kind: "system", html: `${quoi} ${s.ref} (${s.clientName}) : <b>arrêté</b> · ${why}` });
      } else if (s.source !== "encaissements") {
        // Le mois est consommé même sans ordre : sinon le robot réessaierait chaque
        // jour jusqu'à la fin du mois et remplirait le journal de la même phrase.
        await r.updateStandingOrder(s.id, { lastRunOn: today });
        await r.logEvent({ kind: "system", html: `${quoi} ${s.ref} (${s.clientName}) : versement du mois <b>passé</b> · ${why}` });
      }
      skipped += 1;
      continue;
    }

    let annonce;
    try {
      annonce = await r.annoncerPreavis({ standingId: s.id, userId: s.userId, dueOn, amount: montantAnnonce });
    } catch {
      // L'index d'unicité a parlé : un autre tour l'a annoncée, et c'est bien.
      continue;
    }
    const envoi = await envoyerPreavis(s, o, { dueOn, amount: montantAnnonce });
    await r.cloturerPreavis(annonce.id, { noticeSent: envoi.sent, noticeError: envoi.error });
    parInstruction.set(s.id, [...(parInstruction.get(s.id) ?? []), { ...annonce, noticeSent: envoi.sent, noticeError: envoi.error }]);
    if (envoi.sent) {
      annonces += 1;
      await r.logEvent({
        kind: "system",
        html: `${quoi} ${s.ref} (${s.clientName}) : <b>préavis</b> de ${fmt(montantAnnonce)} FCFA sur ${o?.title ?? s.offerId}, pour le ${fmtDate(dueOn)}`,
      });
    } else {
      /* Un préavis qui ne part pas se dit tout de suite, et l'exécution ne
         suivra pas : c'est exactement la panne que le try/catch vide cachait. */
      muets += 1;
      await r.logEvent({
        kind: "system",
        html: `${quoi} ${s.ref} (${s.clientName}) : <b>préavis non envoyé</b> pour le ${fmtDate(dueOn)} · ${envoi.error ?? "canal injoignable"} · rien ne partira sans lui`,
      });
    }
  }

  return NextResponse.json({ ok: true, day: today, placed, reinvested, annonces, muets, skipped, ended, considered: orders.length });
}
