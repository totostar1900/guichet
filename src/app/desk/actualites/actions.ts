"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getT } from "@/i18n/server";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { deleteNews, getNews, loadNews, saveNews } from "@/lib/news";
import { readLink, type LinkMeta } from "@/lib/news/fetch";
import { resolveLinks } from "@/lib/news/links";
import { domainOf, newsId, RUBRICS, whyProblem, type NewsItem, type NewsRubric, type NewsStatus } from "@/lib/news/model";
import { defaultVisibleUntil } from "@/lib/news/watch";
import { NEWS_KIND } from "@/lib/news/model";

export type NewsResult = { ok: true; message: string; id?: string; /** vrai quand ce geste a mis l’article sur la page : l’écran propose alors de revenir en arrière */ published?: boolean } | { ok: false; error: string };

function revalidateNews() {
  for (const p of ["/", "/actualites", "/desk", "/desk/actualites", "/desk/sante"]) revalidatePath(p);
  revalidatePath("/offres/[id]", "page");
  revalidatePath("/societes/[mnemo]", "page");
  revalidatePath("/emetteurs/[slug]", "page");
}

/** « Lire la page » : what the link says about itself, to pre-fill the form. */
export async function readLinkAction(url: string): Promise<LinkMeta> {
  await requireDesk("/desk/actualites");
  return readLink(url.trim());
}

const schema = z.object({
  id: z.string().trim().optional(),
  url: z.string().trim().url("Le lien doit être une adresse complète (https://…)."),
  title: z.string().trim().min(10, "Le titre affiché est trop court.").max(200, "Titre : 200 caractères maximum."),
  titleEn: z.string().trim().max(200).optional(),
  why: z.string().trim(),
  whyEn: z.string().trim().max(400).optional(),
  source: z.string().trim().min(2, "Source requise.").max(40),
  format: z.string().trim().max(30).optional(),
  publishedAt: z.string().trim().min(10, "Date de publication requise."),
  rubric: z.string(),
  links: z.string().default(""),
  visibleUntil: z.string().trim().optional(),
  featured: z.string().optional(),
  pageTitle: z.string().optional(),
  note: z.string().optional(),
  do: z.enum(["publier", "brouillon"]).default("brouillon"),
});

/** Creates or updates one item; « Publier » puts it on the page, « Enregistrer » keeps it as a draft. Every change is audited. */
export async function saveNewsAction(_p: NewsResult | null, form: FormData): Promise<NewsResult> {
  const desk = await requireDesk("/desk/actualites");
  const t = await getT();
  const raw: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string") raw[k] = v;
  });
  const p = schema.safeParse(raw);
  if (!p.success) return { ok: false, error: t(p.error.issues[0]?.message ?? "Saisie invalide.") };
  const d = p.data;
  if (!(RUBRICS as string[]).includes(d.rubric)) return { ok: false, error: t("Rubrique inconnue.") };
  const publishing = d.do === "publier";
  if (publishing) {
    const bad = whyProblem(d.why);
    if (bad) return { ok: false, error: t(bad) };
  }
  const { links, unknown } = await resolveLinks(d.links);
  if (unknown.length) return { ok: false, error: t("Lien inconnu : « {x} ». Utilisez l'identifiant d'une ligne, un ISIN, le code d'une société, un émetteur ou un terme du glossaire.", { x: unknown[0] }) };
  const published = new Date(d.publishedAt);
  if (isNaN(published.getTime())) return { ok: false, error: t("Date de publication illisible.") };
  const publishedAt = published.toISOString();
  const now = new Date().toISOString();
  const before = d.id ? await getNews(d.id) : undefined;
  const status: NewsStatus = publishing ? "publiee" : before?.status === "publiee" ? "publiee" : "brouillon";
  const item: NewsItem = {
    id: before?.id ?? newsId(),
    url: d.url,
    domain: domainOf(d.url),
    title: d.title,
    titleEn: d.titleEn || undefined,
    why: d.why,
    whyEn: d.whyEn || undefined,
    source: d.source,
    format: d.format || before?.format,
    publishedAt,
    rubric: d.rubric as NewsRubric,
    links,
    featured: d.featured === "on",
    status,
    visibleUntil: /^\d{4}-\d{2}-\d{2}$/.test(d.visibleUntil ?? "") ? d.visibleUntil : defaultVisibleUntil(publishedAt),
    receivedFrom: before?.receivedFrom ?? "Formulaire",
    note: before?.note ?? d.note ?? undefined,
    pageTitle: d.pageTitle || before?.pageTitle,
    linkOk: before?.linkOk,
    linkCheckedAt: before?.linkCheckedAt,
    createdAt: before?.createdAt ?? now,
    updatedAt: now,
    updatedBy: desk.name,
    publishedBy: publishing ? desk.name : before?.publishedBy,
    version: (before?.version ?? 0) + 1,
  };
  // One item on the front at a time.
  if (item.featured) {
    for (const other of await loadNews()) {
      if (other.id !== item.id && other.featured) await saveNews({ ...other, featured: false, updatedAt: now, updatedBy: desk.name }, desk.name);
    }
  }
  await saveNews(item, desk.name);
  await audit(before ? "news.update" : "news.create", NEWS_KIND, item.id, { before, after: item, actor: desk.email ?? desk.name });
  await repo().logEvent({ kind: "desk", html: `Actualité ${publishing ? "publiée" : "enregistrée"} : <b>${item.title.replace(/</g, "&lt;")}</b> (${item.source}) · par ${desk.name}` });
  revalidateNews();
  return { ok: true, message: publishing ? t("Publiée : « {x} ».", { x: item.title }) : t("Brouillon enregistré."), id: item.id, published: publishing };
}

/** Changes the state of one item: écarter (a received link we will not use), retirer (off the page), supprimer. */
export async function newsStateAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/actualites");
  const id = String(form.get("id") ?? "");
  const what = String(form.get("what") ?? "");
  const before = await getNews(id);
  if (!before) return;
  const now = new Date().toISOString();
  if (what === "supprimer") {
    await deleteNews(id);
    await audit("news.delete", NEWS_KIND, id, { before, actor: desk.email ?? desk.name });
  } else {
    const status: NewsStatus = what === "ecarter" ? "ecartee" : what === "retirer" ? "brouillon" : what === "republier" ? "publiee" : before.status;
    const after: NewsItem = { ...before, status, featured: status === "publiee" ? before.featured : false, updatedAt: now, updatedBy: desk.name, version: before.version + 1 };
    await saveNews(after, desk.name);
    await audit("news.state", NEWS_KIND, id, { before, after, actor: desk.email ?? desk.name });
  }
  await repo().logEvent({ kind: "desk", html: `Actualité ${what === "supprimer" ? "supprimée" : what === "ecarter" ? "écartée" : what === "retirer" ? "retirée de la page" : "republiée"} : <b>${before.title.replace(/</g, "&lt;")}</b> · par ${desk.name}` });
  revalidateNews();
}
