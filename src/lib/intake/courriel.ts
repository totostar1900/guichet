import "server-only";
import PostalMime from "postal-mime";
import { audit } from "@/lib/audit";
import { repo } from "@/lib/data";
import { receiveLinks } from "@/lib/news/intake";
import { urlsIn } from "@/lib/news/model";
import { ingestSource, trustedSender } from "./ingest";

/**
 * Ce qu'on fait d'un courriel entrant, quel que soit celui qui l'apporte.
 *
 * Ce traitement vivait dans la route qui attend un jeton `Bearer`. Resend
 * apporte le même courrier par un autre chemin, et la seule chose qui change
 * est la manière de prouver qui frappe. Dupliquer le traitement aurait fait
 * deux vérités sur ce qu'un courriel devient, et la seconde aurait divergé.
 */
export interface Courriel {
  from: string;
  subject: string;
  text: string;
  attachments: { name: string; mimeType: string; bytes: Uint8Array }[];
}

export interface Issue {
  created: string[];
  news: string[];
  errors: string[];
}

/** Le message complet, tel qu'il circule entre serveurs : un seul analyseur pour tous les apporteurs. */
export async function lireRfc822(raw: Uint8Array): Promise<Courriel> {
  const parsed = await new PostalMime().parse(raw);
  return {
    from: parsed.from?.address ?? parsed.from?.name ?? "inconnu",
    subject: parsed.subject ?? "",
    text: parsed.text ?? (parsed.html ?? "").replace(/<[^>]+>/g, " "),
    attachments: parsed.attachments.map((a) => ({ name: a.filename ?? "piece", mimeType: a.mimeType, bytes: typeof a.content === "string" ? new TextEncoder().encode(a.content) : new Uint8Array(a.content) })),
  };
}

export async function ingererCourriel(mail: Courriel): Promise<Issue> {
  const trusted = trustedSender(mail.from);
  const fromLabel = `${mail.from} · e-mail`;
  // Tout courriel est aussi un message dans la boîte du desk : la question d'un
  // client n'est pas une source à ingérer.
  await repo().createInbound({ channel: "email", from: mail.from.toLowerCase(), subject: mail.subject, body: mail.text.slice(0, 4000) });
  if (!trusted && mail.attachments.length === 0) return { created: [], news: [], errors: [] };
  // Un expéditeur de confiance qui envoie des liens sans pièce jointe : des
  // candidats pour les Actualités, pas une source à ingérer.
  if (trusted && mail.attachments.length === 0 && urlsIn(mail.text).length) {
    const got = await receiveLinks(`${mail.subject}\n${mail.text}`, `E-mail · ${mail.from}`);
    if (got.length) return { created: [], news: got.map((n) => n.id), errors: [] };
  }
  const hint = mail.subject ? `Objet du courriel : ${mail.subject}` : undefined;
  const created: string[] = [];
  const errors: string[] = [];
  const usable = mail.attachments.filter((a) => a.mimeType === "application/pdf" || a.mimeType.startsWith("image/"));
  if (usable.length === 0) {
    const res = await ingestSource({ title: mail.subject, fromLabel, hint, text: `Objet : ${mail.subject}\nDe : ${mail.from}\n\n${mail.text}`, trusted, source: "mail" });
    if (res.ok) created.push(res.item.id);
    else errors.push(res.error);
  }
  for (const a of usable) {
    const res = await ingestSource({ title: mail.subject || a.name, fromLabel, hint: `${hint ?? ""} Pièce jointe ${a.name}.`.trim(), file: a, trusted });
    if (res.ok) created.push(res.item.id);
    else errors.push(`${a.name} : ${res.error}`);
  }
  for (const id of created) await audit("intake.create", "intake", id, { after: { from: mail.from, subject: mail.subject, channel: "email" }, actor: "courriel entrant" });
  if (errors.length) await repo().logEvent({ kind: "system", html: `Courriel de ${mail.from} : ${errors.join(" · ")}` });
  return { created, news: [], errors };
}
