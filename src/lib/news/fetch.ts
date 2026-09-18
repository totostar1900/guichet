import "server-only";
import { domainOf, guessSource, parsePageMeta, type NewsRubric } from "./model";

export interface LinkMeta {
  url: string;
  domain: string;
  source: string;
  rubric: NewsRubric;
  format: string;
  pageTitle?: string;
  description?: string;
  publishedAt?: string;
  ok: boolean;
  status?: number;
  error?: string;
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 GuichetBot/1.0 (+https://purposecapital.africa)";
/** Sites behind a bot wall answer 401/403/429 to us and fine to a person: not a dead link. */
const WALLED = new Set([401, 403, 429]);

/** Reads what a page says about itself, with a short timeout and a size cap; never throws. */
export async function readLink(url: string): Promise<LinkMeta> {
  const domain = domainOf(url);
  const guess = guessSource(domain);
  const base: LinkMeta = { url, domain, source: guess.source, rubric: guess.rubric, format: "page", ok: false };
  if (!/^https?:\/\//i.test(url) || !domain) return { ...base, error: "Adresse invalide : elle doit commencer par http(s)://." };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,application/pdf;q=0.9,*/*;q=0.8" }, redirect: "follow", signal: ctrl.signal });
    const type = (res.headers.get("content-type") ?? "").toLowerCase();
    const out: LinkMeta = { ...base, ok: res.ok, status: res.status };
    if (WALLED.has(res.status)) return { ...out, ok: true, error: `Le site refuse les robots (${res.status}) : remplissez le titre et la date à la main.` };
    if (!res.ok) return { ...out, error: `La page répond ${res.status}.` };
    if (type.includes("pdf") || /\.pdf(\?|$)/i.test(url)) {
      const buf = new Uint8Array(await res.arrayBuffer());
      const head = latin1(buf.subarray(0, Math.min(buf.length, 2_000_000)));
      const pages = (head.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
      const title = head.match(/\/Title\s*\(([^)]{3,160})\)/)?.[1];
      return { ...out, format: pages ? `PDF · ${pages} p.` : "PDF", pageTitle: title ?? decodeURIComponent(url.split("/").pop()?.replace(/\.pdf$/i, "") ?? ""), publishedAt: undefined };
    }
    if (type.includes("image/")) return { ...out, format: "image", pageTitle: decodeURIComponent(url.split("/").pop() ?? "") };
    const html = (await res.text()).slice(0, 600_000);
    const meta = parsePageMeta(html);
    return { ...out, format: /article|actualit|news|communique/i.test(url) ? "article" : "page", pageTitle: meta.title, description: meta.description, publishedAt: meta.publishedAt, source: meta.site && guess.source === domain ? meta.site : guess.source };
  } catch (e) {
    return { ...base, error: e instanceof Error && e.name === "AbortError" ? "La page ne répond pas (9 s)." : `Lecture impossible : ${e instanceof Error ? e.message : "erreur"}` };
  } finally {
    clearTimeout(timer);
  }
}

/** Is the link still alive? HEAD first, GET when the site refuses HEAD. */
export async function linkAlive(url: string): Promise<{ ok: boolean; status?: number }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    let res = await fetch(url, { method: "HEAD", headers: { "user-agent": UA }, redirect: "follow", signal: ctrl.signal });
    if (res.status === 405 || res.status === 403) res = await fetch(url, { method: "GET", headers: { "user-agent": UA }, redirect: "follow", signal: ctrl.signal });
    return { ok: res.ok || WALLED.has(res.status), status: res.status };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

const latin1 = (b: Uint8Array): string => {
  let s = "";
  for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, Array.from(b.subarray(i, i + 8192)));
  return s;
};
