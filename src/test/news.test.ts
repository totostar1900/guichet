import { describe, expect, it } from "vitest";
import { domainOf, guessSource, isVisible, parseFeed, parsePageMeta, urlsIn, whyProblem, type NewsItem } from "@/lib/news/model";

const item = (over: Partial<NewsItem> = {}): NewsItem => ({
  id: "n-1",
  url: "https://www.bvm-ac.org/x",
  domain: "bvm-ac.org",
  title: "t",
  why: "w",
  source: "BVMAC",
  publishedAt: "2026-09-16T10:00:00",
  rubric: "bvmac",
  links: [],
  featured: false,
  status: "publiee",
  visibleUntil: "2026-10-16",
  createdAt: "2026-09-16T10:00:00",
  updatedAt: "2026-09-16T10:00:00",
  version: 1,
  ...over,
});

describe("actualités", () => {
  it("shows a published item until its last day, inclusive", () => {
    expect(isVisible(item(), new Date("2026-10-16T23:00:00"))).toBe(true);
    expect(isVisible(item(), new Date("2026-10-17T01:00:00"))).toBe(false);
    expect(isVisible(item({ status: "brouillon" }), new Date("2026-09-20"))).toBe(false);
    expect(isVisible(item({ visibleUntil: undefined }), new Date("2030-01-01"))).toBe(true);
  });

  it("guesses the source from the domain", () => {
    expect(guessSource("bvm-ac.org")).toEqual({ source: "BVMAC", rubric: "bvmac" });
    expect(guessSource("finances.gouv.cg").source).toBe("DGTCP · Congo");
    expect(guessSource("jeuneafrique.com").source).toBe("Presse");
    expect(domainOf("https://www.cosumaf.org/a/b")).toBe("cosumaf.org");
  });

  it("refuses a reading that recommends", () => {
    expect(whyProblem("Le repli affiché ce matin n'est pas une baisse : c'est le dividende qui sort du cours.")).toBeNull();
    expect(whyProblem("Achetez vite, rendement garanti sur cette ligne.")).toMatch(/recommande/);
    expect(whyProblem("court")).toMatch(/20 caractères/);
  });

  it("pulls links out of a chat message", () => {
    expect(urlsIn("à mettre : https://www.beac.int/x/y. et https://bvm-ac.org/z, merci")).toEqual(["https://www.beac.int/x/y", "https://bvm-ac.org/z"]);
    expect(urlsIn("pas de lien")).toEqual([]);
  });

  it("reads RSS and Atom feeds", () => {
    const rss = `<rss><channel><item><title>Avis n&#176; 12</title><link>https://www.bvm-ac.org/avis-12/</link><pubDate>Wed, 16 Sep 2026 10:00:00 +0100</pubDate><description><![CDATA[<p>Suspension</p>]]></description></item></channel></rss>`;
    const items = parseFeed(rss);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Avis n° 12");
    expect(items[0].url).toBe("https://www.bvm-ac.org/avis-12/");
    expect(items[0].summary).toBe("Suspension");
    expect(items[0].publishedAt?.slice(0, 10)).toBe("2026-09-16");
    const atom = `<feed><entry><title>Visa</title><link href="https://www.cosumaf.org/visa"/><updated>2026-09-15T16:20:00Z</updated></entry></feed>`;
    expect(parseFeed(atom)[0]).toMatchObject({ title: "Visa", url: "https://www.cosumaf.org/visa" });
  });

  it("reads what a page says about itself", () => {
    const html = `<html><head><title>Fallback</title><meta property="og:title" content="BOC N&#176;1842"><meta name="og:site_name" content="BVMAC"><meta property="article:published_time" content="2026-09-16T18:40:00+01:00"></head></html>`;
    const m = parsePageMeta(html);
    expect(m.title).toBe("BOC N°1842");
    expect(m.site).toBe("BVMAC");
    expect(m.publishedAt?.slice(0, 10)).toBe("2026-09-16");
    expect(parsePageMeta("<title>Only</title>").title).toBe("Only");
  });
});
