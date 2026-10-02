"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { emailConfigured, sendEmail, sendWhatsAppText, whatsappConfigured } from "@/lib/notify/providers";
import { signLineLink } from "@/lib/channels";
import { texteExact, type Ligne } from "./message-exact";
import { refusDePiece } from "./piece-jointe";
import { quandRevient } from "./report";
import { citation } from "./message-exact";
import { readSource } from "@/lib/intake/storage";

/**
 * UN COURRIEL A UN OBJET, et le serveur l'exige aussi.
 *
 * Le champ n'était obligatoire nulle part, et le serveur comblait le vide par
 * « Purpose Capital : votre demande ». Un objet par défaut, identique sur tous
 * les messages, se range mal dans la boîte du client et ne dit rien de ce qu'il
 * contient. Une règle que seul le navigateur applique n'est pas une règle : un
 * formulaire se rejoue sans lui.
 */
const replySchema = z
  .object({ to: z.string().min(3), channel: z.enum(["whatsapp", "email"]), body: z.string().min(1).max(4000), subject: z.string().max(160).optional(), name: z.string().optional(), offerId: z.string().optional() })
  .refine((v) => v.channel !== "email" || Boolean(v.subject?.trim()), { message: "objet manquant", path: ["subject"] });

/**
 * The desk answers from the inbox; the message is journalised like every other
 * outbound one.
 *
 * `at` MARQUE LE SUCCES, et sert de clef au formulaire : il remonte, donc il se
 * vide. Un echec n en porte pas, et le texte reste a l ecran pour etre corrige.
 */
export async function replyAction(_prev: { ok: boolean; error?: string; at?: string } | null, form: FormData): Promise<{ ok: boolean; error?: string; at?: string }> {
  const desk = await requireDesk();
  const p = replySchema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string" && v.trim() !== "")));
  if (!p.success) {
    const sansObjet = p.error.issues.some((i) => i.path[0] === "subject");
    return { ok: false, error: sansObjet ? "Un courriel a un objet : écrivez-en un." : "Écrivez un message." };
  }
  const { to, channel, body, subject, name, offerId } = p.data;

  /* LA PIÈCE JOINTE, par courriel seulement.
     Elle est lue ici et passée telle quelle au fournisseur : aucune escale par
     le dépôt, parce que garder une copie de chaque envoi remplirait un dépôt
     déjà étroit pour un fichier que le desk vient de choisir. Le refus est dit
     en toutes lettres plutôt que découvert sous la forme d'un « échec
     d'envoi » venu du fournisseur. */
  const choisie = form.get("piece");
  const piece = choisie instanceof File && choisie.size > 0 ? choisie : undefined;
  if (piece) {
    if (channel !== "email") return { ok: false, error: "Une pièce jointe part par courriel. Sur WhatsApp, envoyez le lien." };
    const refus = refusDePiece(piece.name, piece.size);
    if (refus) return { ok: false, error: refus };
  }

  const r = repo();
  // « Répondre avec la ligne » : the fiche, and on WhatsApp a link that vouches for the number.
  let ligne: Ligne | undefined;
  if (offerId) {
    const o = await r.getOffer(offerId);
    if (!o) return { ok: false, error: "Ligne introuvable." };
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    ligne = { titre: o.title, url: channel === "whatsapp" ? `${base}/offres/${o.id}?de=${signLineLink(to)}` : `${base}/offres/${o.id}` };
  }
  /* UN SEUL CONSTRUCTEUR, partagé avec l'aperçu de relecture : voir
     message-exact.ts. Composer le texte ici aussi le ferait diverger de ce que
     l'opérateur vient de relire, et l'aperçu mentirait sans rien dire. */
  const text = texteExact({ corps: body, ligne, canal: channel, signataire: desk.name });
  const row = await r.createNotification({ kind: "intent_update", channel, to, contactName: name, subject: channel === "email" ? subject : undefined, body: text, status: "queued" });
  const configured = channel === "whatsapp" ? whatsappConfigured() : emailConfigured();
  if (!configured) {
    await r.updateNotification(row.id, { status: "skipped", error: `${channel === "whatsapp" ? "WhatsApp Cloud API" : "E-mail"} non configuré` });
    revalidatePath("/desk/messages");
    return { ok: false, error: `Message préparé mais non envoyé : ${channel === "whatsapp" ? "WhatsApp" : "l'e-mail"} n'est pas encore configuré (clés à renseigner sur Vercel).` };
  }
  try {
    const jointes = piece ? [{ filename: piece.name, content: new Uint8Array(await piece.arrayBuffer()) }] : [];
    const id = channel === "whatsapp" ? await sendWhatsAppText(to, text) : await sendEmail(to, subject ?? "", `<p>${text.replace(/\n/g, "<br>")}</p>`, text, jointes);
    await r.updateNotification(row.id, { status: "sent", providerId: id, sentAt: new Date().toISOString() });
  } catch (e) {
    await r.updateNotification(row.id, { status: "failed", error: e instanceof Error ? e.message : "échec d'envoi" });
    return { ok: false, error: `Échec d'envoi : ${e instanceof Error ? e.message : "erreur"}` };
  }
  /* Le journal nomme la pièce : les octets ne sont gardés nulle part, donc
     c'est ici seulement qu'on saura ce qui est parti avec le message. */
  await audit("message.reply", "contact", to, { after: { channel, chars: text.length, offerId, piece: piece ? { nom: piece.name, octets: piece.size } : undefined }, actor: desk.name });
  /* Le message envoye reparait dans le fil : c est la confirmation, meilleure
     qu une etiquette qui passe. */
  revalidatePath("/desk/messages");
  return { ok: true, at: new Date().toISOString() };
}

/** Marks every message of a conversation as handled. */
/**
 * Promouvoir une pièce d'un message vers « À valider ».
 *
 * POURQUOI C'EST UN GESTE DE PERSONNE, ET NON UNE RÈGLE. « À valider » sert à ce
 * qui peut devenir une LIGNE DE MARCHÉ. Un document qu'un régulateur ou un
 * client envoie n'a rien à y devenir, et le bouton « Publier » n'a aucun sens à
 * côté de lui. Mais rien dans le courriel ne dit lequel des deux il est : un
 * membre de l'équipe transfère aussi bien un communiqué du Trésor qu'une lettre
 * de la COSUMAF, donc l'expéditeur ne tranche pas. C'est une personne qui
 * reconnaît un communiqué, et ce bouton est l'endroit où elle le dit.
 *
 * LA PIÈCE NE SE RECOPIE PAS : elle est déjà au dépôt sous sa clef, et
 * « fileKeyExistant » dit à l'ingestion de la reprendre telle quelle. Vingt-deux
 * doublons ont été retirés du dépôt le 2026-10-02, il serait dommage d'en
 * fabriquer d'autres le même jour.
 *
 * La lecture suit tout de suite, parce qu'ici une personne attend le résultat :
 * c'est elle qui vient d'affirmer que ce document est un communiqué.
 */
export async function promouvoirPieceAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/messages");
  const messageId = String(form.get("messageId") ?? "");
  const fileKey = String(form.get("fileKey") ?? "");
  if (!messageId || !fileKey) return;

  const r = repo();
  const message = (await r.listInbound(400)).find((m) => m.id === messageId);
  const piece = message?.attachments?.find((a) => a.fileKey === fileKey);
  if (!message || !piece) {
    await r.logEvent({ kind: "desk", html: `Promotion demandée par ${desk.name} : <b>pièce introuvable</b> sur ce message` }).catch(() => undefined);
    return;
  }
  if (piece.intakeId) return; // déjà partie : le bouton disparaît, mais un double envoi se rejoue

  try {
    const { readSource } = await import("@/lib/intake/storage");
    const { ingestSource } = await import("@/lib/intake/ingest");
    const bytes = await readSource(fileKey);
    const res = await ingestSource({
      title: message.subject || piece.name,
      fromLabel: `${message.from} · promue depuis Messages`,
      hint: message.subject ? `Objet du courriel : ${message.subject}` : undefined,
      file: { name: piece.name, mimeType: piece.mimeType, bytes },
      fileKeyExistant: fileKey,
      // Promue par une personne qui affirme que c'en est un : la source est officielle.
      trusted: true,
      keepUnsupported: true,
    });
    if (!res.ok) {
      await r.logEvent({ kind: "desk", html: `Promotion de <b>${piece.name}</b> par ${desk.name} : ${res.error}` });
      return;
    }
    // Le lien dans les deux sens : le message sait où sa pièce est partie.
    await r.setInboundAttachments(
      messageId,
      (message.attachments ?? []).map((a) => (a.fileKey === fileKey ? { ...a, intakeId: res.item.id } : a)),
    );
    await audit("intake.promote", "intake", res.item.id, {
      after: { messageId, fileKey, from: message.from },
      reason: `pièce promue depuis Messages par ${desk.name}`,
    });
    await r.logEvent({ kind: "desk", html: `<b>${piece.name}</b> promue en source par ${desk.name} : à valider` });
  } catch (e) {
    /* Rien ne sort d'ici sans le dire : un clic sans trace est indistinguable
       d'un clic qui n'a pas eu lieu, et ça a coûté une nuit. */
    await r
      .logEvent({ kind: "desk", html: `Promotion de <b>${piece.name}</b> par ${desk.name} <b>interrompue</b> : ${e instanceof Error ? e.message : "erreur inconnue"}` })
      .catch(() => undefined);
  }
  revalidatePath("/desk/messages");
  revalidatePath("/desk/a-valider");
}

export async function handledAction(form: FormData): Promise<void> {
  const desk = await requireDesk();
  const to = String(form.get("to") ?? "");
  if (!to) return;
  const r = repo();
  const open = (await r.listInbound(500)).filter((m) => m.from === to && !m.handledAt);
  for (const m of open) await r.markInboundHandled(m.id, desk.name);
  revalidatePath("/desk/messages");
}

/* ─── Les gestes sur un fil ──────────────────────────────────────────────────
   Épingler, reporter, étiqueter, et les deux sens de « traité ».

   Chacun prend sa cible sous la forme « canal|adresse », parce qu'un fil
   s'identifie ainsi et pas autrement : il n'a pas d'identifiant, il n'est pas
   créé, il est constaté. Le bouton de chaque ligne porte cette valeur, et le
   formulaire qui le reçoit vit une seule fois en haut de la liste : sans cela
   il faudrait un formulaire par ligne, imbriqué dans le lien de la ligne, ce
   que le HTML refuse. */

/** Lit « canal|adresse » et refuse tout le reste : la cible vient du navigateur. */
function cible(form: FormData): { channel: "whatsapp" | "email"; addr: string } | undefined {
  const brut = String(form.get("cible") ?? "");
  const i = brut.indexOf("|");
  if (i < 1) return undefined;
  const channel = brut.slice(0, i);
  const addr = brut.slice(i + 1);
  if ((channel !== "whatsapp" && channel !== "email") || !addr) return undefined;
  return { channel, addr };
}

/** Toutes les cibles d'un envoi en lot, dédoublonnées. */
function cibles(form: FormData): { channel: "whatsapp" | "email"; addr: string }[] {
  const vues = new Set<string>();
  const out: { channel: "whatsapp" | "email"; addr: string }[] = [];
  for (const v of form.getAll("fils")) {
    const f = new FormData();
    f.set("cible", String(v));
    const c = cible(f);
    if (c && !vues.has(`${c.channel}|${c.addr}`)) {
      vues.add(`${c.channel}|${c.addr}`);
      out.push(c);
    }
  }
  return out;
}

/** Le fil monte en tête de liste, ou en redescend. */
export async function epinglerAction(form: FormData): Promise<void> {
  const desk = await requireDesk();
  const c = cible(form);
  if (!c) return;
  const r = repo();
  const etat = (await r.listDeskThreads()).find((x) => x.channel === c.channel && x.addr === c.addr);
  await r.setDeskThread(c.channel, c.addr, { pinnedAt: etat?.pinnedAt ? undefined : new Date().toISOString() }, desk.name);
  await audit("message.epingle", "contact", c.addr, { after: { epingle: !etat?.pinnedAt }, actor: desk.name });
  revalidatePath("/desk/messages");
}

/** Le fil sort de la file, et y rentre de lui-même à l'heure dite. */
export async function reporterAction(form: FormData): Promise<void> {
  const desk = await requireDesk();
  const c = cible(form);
  if (!c) return;
  const quand = String(form.get("quand") ?? "demain");
  /* « rendre » ramène le fil tout de suite : un report se défait, sinon il
     faudrait attendre une heure qu'on a choisie par erreur. */
  const jusqua = quand === "rendre" ? undefined : quandRevient(quand, Date.now());
  if (quand !== "rendre" && !jusqua) return;
  const r = repo();
  await r.setDeskThread(c.channel, c.addr, { snoozedUntil: jusqua }, desk.name);
  await audit("message.report", "contact", c.addr, { after: { jusqua: jusqua ?? null }, actor: desk.name });
  revalidatePath("/desk/messages");
}

/** L'étiquette se pose et se retire du même bouton. */
export async function etiquetterAction(form: FormData): Promise<void> {
  const desk = await requireDesk();
  const c = cible(form);
  const mot = String(form.get("etiquette") ?? "");
  if (!c || !mot) return;
  const r = repo();
  const etat = (await r.listDeskThreads()).find((x) => x.channel === c.channel && x.addr === c.addr);
  const avant = etat?.labels ?? [];
  const apres = avant.includes(mot) ? avant.filter((x) => x !== mot) : [...avant, mot];
  await r.setDeskThread(c.channel, c.addr, { labels: apres }, desk.name);
  await audit("message.etiquette", "contact", c.addr, { before: { labels: avant }, after: { labels: apres }, actor: desk.name });
  revalidatePath("/desk/messages");
}

/**
 * L'inverse de « marquer comme traité », qui manquait.
 *
 * C'était une porte à sens unique : un clic de trop sortait un fil de la file
 * sans retour, et rien ne le disait. Le fil revient entier, avec le compte de
 * ses messages non traités.
 */
export async function rouvrirAction(form: FormData): Promise<void> {
  const desk = await requireDesk();
  const c = cible(form);
  if (!c) return;
  const r = repo();
  const siens = (await r.listInbound(500)).filter((m) => m.from === c.addr && m.handledAt);
  for (const m of siens) await r.markInboundUnhandled(m.id);
  await audit("message.rouvert", "contact", c.addr, { after: { messages: siens.length }, actor: desk.name });
  revalidatePath("/desk/messages");
}

/** Plusieurs fils d'un geste, au lieu de plusieurs allers-retours. */
export async function lotTraiteAction(form: FormData): Promise<void> {
  const desk = await requireDesk();
  const liste = cibles(form);
  if (!liste.length) return;
  const r = repo();
  const tous = await r.listInbound(1000);
  for (const c of liste) {
    for (const m of tous.filter((x) => x.from === c.addr && !x.handledAt)) await r.markInboundHandled(m.id, desk.name);
  }
  await audit("message.lot", "contact", liste.map((c) => c.addr).join(", "), { after: { fils: liste.length }, actor: desk.name });
  revalidatePath("/desk/messages");
}

/* ─── Les gestes sur un message reçu ─────────────────────────────────────────
   Transférer, et classer une pièce dans le dossier du client.

   Les deux manquaient vraiment. Une lettre d'un régulateur se transmet à un
   collègue ; et depuis qu'aucun chemin ne mène plus d'un message à « À valider »,
   une pièce reçue n'appartient qu'à son message, alors qu'elle appartient au
   dossier du client. */

/** Le message d'un fil, par son identifiant : la cible vient du navigateur. */
async function messageRecu(id: string) {
  return (await repo().listInbound(1000)).find((m) => m.id === id);
}

/**
 * Transférer un message reçu, avec ses pièces.
 *
 * LE TEXTE PART CITÉ, et l'objet reprend celui d'origine préfixé de « Tr. » :
 * la personne qui le reçoit doit voir d'un coup d'où il vient. Un transfert qui
 * perd son expéditeur et sa date n'est plus une pièce, c'est un extrait.
 *
 * LES PIÈCES SUIVENT. Transférer une lettre de la COSUMAF sans son annexe
 * obligerait le destinataire à revenir demander, et c'est précisément ce que le
 * geste cherche à éviter.
 */
export async function transfererAction(_prev: { ok: boolean; error?: string } | null, form: FormData): Promise<{ ok: boolean; error?: string }> {
  const desk = await requireDesk();
  const id = String(form.get("messageId") ?? "");
  const vers = String(form.get("vers") ?? "").trim();
  if (!id || !vers.includes("@")) return { ok: false, error: "Indiquez une adresse de courriel." };
  if (!emailConfigured()) return { ok: false, error: "L'e-mail n'est pas encore configuré (clés à renseigner sur Vercel)." };
  const m = await messageRecu(id);
  if (!m) return { ok: false, error: "Ce message est introuvable." };

  const quand = new Date(m.receivedAt).toISOString().slice(0, 16).replace("T", " ");
  /* La note de transfert est en français comme le reste de ce qui quitte la
     maison : elle part chez une personne, pas sur l'écran du desk. */
  const texte = `Message transféré par ${desk.name}, Purpose Capital.\n\nDe : ${m.name ? `${m.name} · ${m.from}` : m.from}\nLe : ${quand}\n${m.subject ? `Objet : ${m.subject}\n` : ""}\n${citation(quand, m.body)}`;

  /* Les pièces sont relues au dépôt : elles y sont gardées depuis l'arrivée du
     message, et c'est la seule copie. */
  const jointes: { filename: string; content: Uint8Array }[] = [];
  for (const p of m.attachments ?? []) {
    try {
      jointes.push({ filename: p.name, content: await readSource(p.fileKey) });
    } catch {
      /* Une pièce illisible ne doit pas retenir le message : il part sans elle,
         et le journal dira laquelle manquait. */
    }
  }

  try {
    await sendEmail(vers, `Tr. : ${m.subject || "message reçu"}`, `<p>${texte.replace(/\n/g, "<br>")}</p>`, texte, jointes);
  } catch (e) {
    return { ok: false, error: `Échec du transfert : ${e instanceof Error ? e.message : "erreur"}` };
  }
  await audit("message.transfert", "contact", m.from, { after: { vers, pieces: jointes.length, manquantes: (m.attachments?.length ?? 0) - jointes.length }, actor: desk.name });
  revalidatePath("/desk/messages");
  return { ok: true };
}

/**
 * Classer une pièce reçue dans le dossier du client.
 *
 * LE FICHIER NE BOUGE PAS. Le dossier référence la même clef de dépôt que le
 * message : une copie ferait deux vérités et doublerait la place occupée, pour
 * un dépôt déjà étroit. La pièce reste visible dans son fil, et paraît en plus
 * dans le dossier.
 */
export async function classerAction(form: FormData): Promise<void> {
  const desk = await requireDesk();
  const id = String(form.get("messageId") ?? "");
  const rang = Number(form.get("rang") ?? -1);
  const userId = String(form.get("userId") ?? "");
  if (!id || !userId || !Number.isInteger(rang) || rang < 0) return;
  const m = await messageRecu(id);
  const p = m?.attachments?.[rang];
  if (!m || !p) return;
  const r = repo();
  const dossier = await r.getClientFileByUser(userId);
  if (!dossier) return;
  /* Classée deux fois, elle ferait deux lignes pour un seul fichier : la clef
     de dépôt tranche, parce que c'est elle qui désigne la pièce. */
  if (dossier.documents.some((d) => d.fileKey === p.fileKey)) return;
  await r.updateClientFile(dossier.id, {
    documents: [
      ...dossier.documents,
      {
        /* « autre » est le genre juste : la pièce est arrivée par courrier, elle
           ne répond à aucune des cases attendues du dossier. Son libellé dit ce
           qu'elle est, ce qu'« Autre pièce » ne ferait pas. */
        kind: "autre" as const,
        label: `${p.name} · reçu le ${new Date(m.receivedAt).toISOString().slice(0, 10)}`,
        fileKey: p.fileKey,
        fileName: p.name,
        mimeType: p.mimeType,
        uploadedAt: new Date().toISOString(),
      },
    ],
  });
  await audit("message.classee", "client_file", dossier.id, { after: { piece: p.name, depuis: m.from }, actor: desk.name });
  revalidatePath("/desk/messages");
}
