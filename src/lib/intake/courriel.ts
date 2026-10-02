import "server-only";
import PostalMime from "postal-mime";
import { audit } from "@/lib/audit";
import { repo } from "@/lib/data";
import type { PieceGardee } from "@/lib/domain/types";
import { receiveLinks } from "@/lib/news/intake";
import { urlsIn } from "@/lib/news/model";
import { trustedSender } from "./ingest";
import { saveSource } from "./storage";
import { direLeRefus } from "./refus";

/**
 * Ce qu'on fait d'un courriel entrant, quel que soit celui qui l'apporte.
 *
 * Ce traitement vivait dans la route qui attend un jeton `Bearer`. Resend
 * apporte le même courrier par un autre chemin, et la seule chose qui change
 * est la manière de prouver qui frappe. Dupliquer le traitement aurait fait
 * deux vérités sur ce qu'un courriel devient, et la seconde aurait divergé.
 *
 * LA PLATEFORME EST UN DÉPÔT, PAS UN APERÇU (2026-10-01). Elle gardait un
 * extrait de 4 000 caractères et jetait en silence toute pièce qui n'était ni
 * PDF ni image. Tant que la boîte Outlook gardait l'original, ça passait. Dès
 * que le courrier de `guichet@` est redirigé ici, la plateforme devient le seul
 * exemplaire : un questionnaire Word d'un régulateur n'aurait existé nulle
 * part, et une lettre longue aurait été coupée au milieu d'une phrase sans que
 * rien ne le dise.
 */
export interface PieceJointe {
  name: string;
  mimeType: string;
  bytes: Uint8Array;
  /** « inline » : une image du corps, souvent un logo de signature. */
  inline: boolean;
}

export interface Courriel {
  from: string;
  subject: string;
  text: string;
  attachments: PieceJointe[];
  /** En-têtes, clefs en minuscules : c'est là qu'une machine se reconnaît. */
  headers: Record<string, string>;
}

export interface Issue {
  /** Les entrées d'intake nées de ce courriel : vide, désormais, sauf promotion. */
  created: string[];
  news: string[];
  errors: string[];
  /** Les pièces écartées, nommées : une perte muette n'est pas une perte acceptable. */
  skipped: string[];
  /** Le message ouvert dans la boîte du desk, quand il y en a un. */
  messageId?: string;
  /** Les pièces gardées au dépôt et rattachées à ce message. */
  gardees?: PieceGardee[];
}

/**
 * Une image de signature n'est pas un document.
 *
 * Un logo collé dans une signature arrive comme une pièce jointe « inline » de
 * dix à trente kilo-octets. Sans ce seuil, chaque courriel d'un correspondant
 * ouvrirait une ligne dans « À valider » et paierait un appel d'extraction pour
 * lire un logo. Mais un Trésor envoie parfois son communiqué en image dans le
 * corps du message, et celle-là pèse plus : le seuil les sépare, et ce qui est
 * écarté est nommé pour que la décision reste visible et révisable.
 */
const SEUIL_IMAGE_INLINE = 40 * 1024;

/** Le message complet, tel qu'il circule entre serveurs : un seul analyseur pour tous les apporteurs. */
export async function lireRfc822(raw: Uint8Array): Promise<Courriel> {
  const parsed = await new PostalMime().parse(raw);
  // Première occurrence gagnante : « received » se répète à chaque relais, et
  // les en-têtes qui nous intéressent n'apparaissent qu'une fois.
  const headers: Record<string, string> = {};
  for (const h of parsed.headers) if (!(h.key in headers)) headers[h.key] = h.value;
  return {
    headers,
    from: parsed.from?.address ?? parsed.from?.name ?? "inconnu",
    subject: parsed.subject ?? "",
    text: parsed.text ?? (parsed.html ?? "").replace(/<[^>]+>/g, " "),
    attachments: parsed.attachments.map((a) => ({
      name: a.filename ?? "piece",
      mimeType: a.mimeType,
      bytes: typeof a.content === "string" ? new TextEncoder().encode(a.content) : new Uint8Array(a.content),
      inline: a.disposition === "inline",
    })),
  };
}

/**
 * Un retour de machine, et non une personne qui ecrit.
 *
 * LE DÉFAUT QUE CECI CORRIGE EST LE MIEN, mesuré le 2026-10-01 : le garde-fou
 * jetait tout courriel venant de notre propre adresse d'envoi, et l'utilisateur
 * a ecrit depuis guichet@. Son message a disparu. Or guichet@ est a la fois
 * l'identité d'envoi de la plateforme et une boîte que des personnes utilisent :
 * l'adresse seule ne tranche pas, et je l'avais cru.
 *
 * Les en-têtes tranchent. Un rebond, une réponse automatique, une absence du
 * bureau portent au moins un de ces marqueurs (RFC 3834 pour le premier) ; un
 * humain qui ecrit n'en porte aucun.
 */
export function retourAutomatique(headers: Record<string, string>): boolean {
  const h = (k: string) => (headers[k] ?? "").trim().toLowerCase();
  // RFC 3834 : « no » est la valeur d'un message envoyé par une personne.
  if (h("auto-submitted") && h("auto-submitted") !== "no") return true;
  // Un rapport de non-remise est un multipart/report.
  if (h("content-type").includes("multipart/report")) return true;
  // Enveloppe vide : la marque classique d'un rebond.
  if (["<>", ""].includes(h("return-path")) && "return-path" in headers) return true;
  if (h("x-auto-response-suppress")) return true;
  if (["auto_reply", "auto-reply", "bulk", "junk"].includes(h("precedence"))) return true;
  return false;
}

/** L'adresse seule, que `EMAIL_FROM` porte parfois sous la forme « Guichet <guichet@… > ». */
export const adresseSeule = (v: string | undefined): string => (v ?? "").match(/<([^>]+)>/)?.[1]?.trim().toLowerCase() ?? (v ?? "").trim().toLowerCase();

export async function ingererCourriel(mail: Courriel): Promise<Issue> {
  /* LA BOUCLE, ET POURQUOI ELLE EST CERTAINE SANS CE GARDE-FOU.
     La plateforme signe ses envois avec EMAIL_FROM. Dès qu'une redirection
     existe sur cette boîte, tout ce qu'elle envoie lui revient : les
     non-remises, les réponses automatiques, les absences du bureau. Chacune
     serait classée comme un message de client, et le desk relirait ses propres
     envois en croyant lire les réponses. */
  const nous = adresseSeule(process.env.EMAIL_FROM);
  if (nous && mail.from.trim().toLowerCase() === nous && retourAutomatique(mail.headers)) {
    await direLeRefus(`Courrier <b>écarté</b> : un retour automatique de notre propre adresse d'envoi (${nous}), pas un message d'une personne`);
    return { created: [], news: [], errors: [], skipped: [mail.subject || "sans objet"] };
  }

  const trusted = trustedSender(mail.from);
  const fromLabel = `${mail.from} · e-mail`;
  // Tout courriel est aussi un message dans la boîte du desk : la question d'un
  // client n'est pas une source à ingérer. Le corps ENTIER, désormais : un
  // extrait coupé au milieu d'une phrase n'est pas un exemplaire.
  /* LES EN-TÊTES DE FIL, gardés au lieu d'être jetés. Ils étaient lus depuis
     toujours et s'arrêtaient là : « In-Reply-To » est le seul chemin qui ne
     devine rien pour savoir à quel échange une réponse appartient. */
  const message = await repo().createInbound({
    channel: "email",
    from: mail.from.toLowerCase(),
    subject: mail.subject,
    body: mail.text,
    messageId: enTete(mail.headers, "message-id"),
    inReplyTo: enTete(mail.headers, "in-reply-to"),
  });

  // Les images du corps assez petites pour être des logos ne deviennent pas des
  // pièces, et on dit lesquelles.
  const skipped: string[] = [];
  const pieces = mail.attachments.filter((a) => {
    const logo = a.inline && a.mimeType.startsWith("image/") && a.bytes.byteLength < SEUIL_IMAGE_INLINE;
    if (logo) skipped.push(`${a.name} (${Math.round(a.bytes.byteLength / 1024)} ko, image du corps)`);
    return !logo;
  });
  if (skipped.length) await repo().logEvent({ kind: "system", html: `Courriel de ${mail.from} : ${skipped.length} image(s) du corps écartée(s), trop légère(s) pour être un document : ${skipped.join(" · ")}` });

  /* RIEN À INGÉRER, ET IL FAUT LE DIRE. Un courriel d'un expéditeur non
     reconnu, sans pièce jointe, est une conversation : elle vit dans Messages
     et n'a pas à ouvrir une ligne dans À valider. Mais se taire ici laissait
     deviner POURQUOI aucune pièce n'apparaissait, et la déduction a coûté trois
     requêtes en base le 2026-10-01. La ligne porte les éléments de la décision. */
  if (!trusted && pieces.length === 0) {
    await repo().logEvent({ kind: "system", html: `Courriel de ${mail.from} : rang\u00e9 dans Messages, sans pi\u00e8ce \u00e0 valider (exp\u00e9diteur hors INTAKE_TRUSTED_SENDERS, aucune pi\u00e8ce jointe)` });
    return { created: [], news: [], errors: [], skipped };
  }
  // Un expéditeur de confiance qui envoie des liens sans pièce jointe : des
  // candidats pour les Actualités, pas une source à ingérer.
  if (trusted && pieces.length === 0 && urlsIn(mail.text).length) {
    const got = await receiveLinks(`${mail.subject}\n${mail.text}`, `E-mail · ${mail.from}`);
    if (got.length) {
      await repo().logEvent({ kind: "system", html: `Courriel de ${mail.from} : ${got.length} lien(s) partis dans les Actualit\u00e9s, pas dans À valider` });
      return { created: [], news: got.map((n) => n.id), errors: [], skipped };
    }
  }
  /* LA PIÈCE VIT AVEC LE MESSAGE, et plus dans « À valider ».
     Cette file sert à ce qui peut devenir une LIGNE DE MARCHÉ : les communiqués
     ramassés par les crons, les avis d'émission, les résultats d'adjudication.
     Un document qu'un régulateur ou un client envoie n'a rien à y devenir, et le
     bouton « Publier » n'a aucun sens à côté de lui. Jusqu'ici un courriel
     écrivait deux choses sans lien, et le desk faisait la jonction de tête.
     Une personne peut promouvoir une pièce vers « À valider » depuis Messages.
     C'est le seul chemin, parce qu'aucune règle sur l'expéditeur ne tranche : un
     membre de l'équipe transfère aussi bien un communiqué du Trésor qu'une
     lettre de la COSUMAF. */
  const errors: string[] = [];
  const gardees: PieceGardee[] = [];
  for (const a of pieces) {
    const ext = a.name.split(".").pop()?.toLowerCase() ?? "bin";
    const fileKey = `courrier/${message.id}/${Date.now().toString(36)}-${gardees.length}.${ext}`;
    try {
      await saveSource(fileKey, a.bytes, a.mimeType);
      gardees.push({ name: a.name, fileKey, mimeType: a.mimeType, size: a.bytes.byteLength });
    } catch (e) {
      errors.push(`${a.name} : ${e instanceof Error ? e.message : "dépôt refusé"}`);
    }
  }
  if (gardees.length) await repo().setInboundAttachments(message.id, gardees);

  // Un expéditeur de confiance qui envoie des liens sans pièce jointe a déjà été
  // traité plus haut ; ici on dit seulement ce que le message a apporté.
  await repo().logEvent({
    kind: "system",
    html: gardees.length
      ? `Courriel de ${mail.from} : ${gardees.length} pi\u00e8ce(s) gard\u00e9e(s) avec le message`
      : `Courriel de ${mail.from} : rang\u00e9 dans Messages, sans pi\u00e8ce jointe`,
  });
  if (errors.length) await repo().logEvent({ kind: "system", html: `Courriel de ${mail.from} : ${errors.join(" · ")}` });
  return { created: [], news: [], errors, skipped, messageId: message.id, gardees };
}

/**
 * Un en-tête, cherché sans se soucier de la casse de son nom.
 *
 * Les noms d'en-têtes sont insensibles à la casse, et les serveurs les écrivent
 * comme ils veulent : « Message-ID », « Message-Id », « message-id ». Chercher
 * une seule forme marcherait chez la plupart des expéditeurs et pas chez tous,
 * ce qui est la pire des pannes : elle n'arrive qu'à certains.
 */
export function enTete(headers: Record<string, string>, nom: string): string | undefined {
  const cible = nom.toLowerCase();
  for (const [k, v] of Object.entries(headers)) if (k.toLowerCase() === cible) return v.trim() || undefined;
  return undefined;
}
