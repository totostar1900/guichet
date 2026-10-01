import "server-only";
import PostalMime from "postal-mime";
import { audit } from "@/lib/audit";
import { repo } from "@/lib/data";
import { receiveLinks } from "@/lib/news/intake";
import { urlsIn } from "@/lib/news/model";
import { ingestSource, trustedSender } from "./ingest";
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
  created: string[];
  news: string[];
  errors: string[];
  /** Les pièces écartées, nommées : une perte muette n'est pas une perte acceptable. */
  skipped: string[];
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
  await repo().createInbound({ channel: "email", from: mail.from.toLowerCase(), subject: mail.subject, body: mail.text });

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
  const hint = mail.subject ? `Objet du courriel : ${mail.subject}` : undefined;
  const created: string[] = [];
  const errors: string[] = [];
  if (pieces.length === 0) {
    const res = await ingestSource({ title: mail.subject, fromLabel, hint, text: `Objet : ${mail.subject}\nDe : ${mail.from}\n\n${mail.text}`, trusted, source: "mail", differer: true });
    if (res.ok) created.push(res.item.id);
    else errors.push(res.error);
  }
  // TOUTE pièce est gardée, quel que soit son type : `keepUnsupported` dit à
  // l'ingestion de conserver ce qu'elle ne sait pas lire au lieu de le refuser.
  for (const a of pieces) {
    // DIFFÉRÉ : un webhook a quelques secondes, une lecture de PDF n'y tient pas.
    const res = await ingestSource({ title: mail.subject || a.name, fromLabel, hint: `${hint ?? ""} Pièce jointe ${a.name}.`.trim(), file: a, trusted, keepUnsupported: true, differer: true });
    if (res.ok) created.push(res.item.id);
    else errors.push(`${a.name} : ${res.error}`);
  }
  for (const id of created) await audit("intake.create", "intake", id, { after: { from: mail.from, subject: mail.subject, channel: "email" }, actor: "courriel entrant" });
  if (errors.length) await repo().logEvent({ kind: "system", html: `Courriel de ${mail.from} : ${errors.join(" · ")}` });
  // Ni pièce ni erreur : ne devrait pas arriver, et se tairait si cela arrivait.
  if (!created.length && !errors.length) await repo().logEvent({ kind: "system", html: `Courriel de ${mail.from} : trait\u00e9 sans rien produire, ${pieces.length} pi\u00e8ce(s) vues` });
  return { created, news: [], errors, skipped };
}
