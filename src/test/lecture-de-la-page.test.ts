import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { visiteDesTitres, type PageDeLaVisite, type VueDeLaVisite } from "@/lib/ui/visite-titres";
import { ORDRE_DE_LA_PAGE } from "@/data/services-risques";
import { LEGAL } from "@/data/legal";

const lire = (f: string) => readFileSync(f, "utf8");
const t = (k: string) => k;
const cibles = (vue: VueDeLaVisite, page: PageDeLaVisite) => visiteDesTitres({ vue, page, t }).map((s) => s.target);

describe("« Comment lire cette page ? » suit la vue, couvre la carte et se lance depuis le « i » (7 novembre 2026)", () => {
  it("la visite des cartes détaillées couvre l'état, le chiffre, la grille et le pied, et dit qu'il n'y a pas de dos", () => {
    const c = cibles("detaillees", "adjudications");
    for (const k of ["titres-groupe", "titres-etat", "titres-prix", "titres-grille", "titres-pied", "titres-carte"]) expect(c, `repère ${k} absent`).toContain(k);
    expect(c, "le dos n'existe pas en vue détaillée").not.toContain("titres-retourner");
  });
  it("la visite des cartes compactes parle du chiffre de la tuile et du dos", () => {
    const c = cibles("compactes", "cote");
    expect(c).toContain("titres-chiffre");
    expect(c, "le dos manque à la visite compacte").toContain("titres-retourner");
    expect(c, "la grille détaillée est au dos, pas sur la tuile").not.toContain("titres-grille");
  });
  it("chaque vue a sa visite, et les deux pages ne disent pas la même chose du chiffre", () => {
    expect(cibles("liste", "cote").length).toBeGreaterThan(4);
    expect(cibles("tableau", "cote").length).toBeGreaterThan(4);
    const texte = (p: PageDeLaVisite) => visiteDesTitres({ vue: "detaillees", page: p, t }).find((s) => s.target === "titres-prix")?.text;
    expect(texte("adjudications")).not.toBe(texte("cote"));
  });
  it("chaque repère de la visite existe dans le code de la carte ou de la barre", () => {
    const code = [lire("src/components/OfferCard.tsx"), lire("src/components/market/TeteGroupe.tsx"), lire("src/components/OfferBrowser.tsx"), lire("src/components/MarketToggles.tsx"), lire("src/components/Affichage.tsx"), lire("src/components/market/OngletsMarche.tsx")].join("\n");
    const tous = new Set(["detaillees", "compactes", "liste", "tableau"].flatMap((v) => cibles(v as VueDeLaVisite, "cote")));
    for (const k of tous) expect(code, `aucun élément ne porte le repère ${k}`).toMatch(new RegExp(`data-coach=(\\{[^}]*)?"${k}"`));
  });
  it("OfferBrowser compose sa visite avec la vue et la densité", () => {
    expect(lire("src/components/OfferBrowser.tsx")).toMatch(/stops=\{visiteDesTitres\(\{ vue: view === "cards" \? \(densite === "compact"/);
  });
  it("le bouton de rappel garde la largeur de son mot", () => {
    expect(lire("src/components/mobile/CoachMarks.module.css")).toMatch(/\.replay \{[^}]*width: fit-content;/);
  });
  it("le « i » lance la visite : il ferme la feuille puis envoie le signal du menu", () => {
    expect(lire("src/components/EnBrefInstruments.tsx")).toMatch(/setOpen\(false\);\s*window\.setTimeout\(\(\) => window\.dispatchEvent\(new Event\("guichet:coach:replay"\)\)/);
  });
  it("le « i » est le premier objet de la barre, avant l'horloge", () => {
    const b = lire("src/components/mobile/BarreDuHaut.tsx");
    const i = b.indexOf("<EnBrefInstruments");
    expect(i, "le « i » a quitté la barre").toBeGreaterThan(0);
    expect(i, "le « i » repasse après l'horloge").toBeLessThan(b.indexOf('href="/echeances"', 0));
  });
});

describe("la documentation « services et risques associés » (7 novembre 2026)", () => {
  it("la page des mentions porte une bande de menu dont chaque onglet mène à une section", () => {
    const ids = ORDRE_DE_LA_PAGE.map((e) => ("doc" in e ? e.doc.id : e.legal));
    expect(new Set(ids).size, "deux sections portent le même id").toBe(ids.length);
    for (const e of ORDRE_DE_LA_PAGE) if ("legal" in e) expect(LEGAL.some((s) => s.id === e.legal), `la section ${e.legal} n'existe plus dans legal.ts`).toBe(true);
    expect(lire("src/app/info/mentions/page.tsx")).toMatch(/<BandeDeLaPage/);
  });
  it("toutes les sections juridiques gardent leur place, et chaque ligne est écrite dans les deux langues", () => {
    const presents = ORDRE_DE_LA_PAGE.flatMap((e) => ("legal" in e ? [e.legal] : []));
    for (const s of LEGAL) expect(presents, `la section ${s.id} a disparu de la page`).toContain(s.id);
    for (const e of ORDRE_DE_LA_PAGE) {
      if (!("doc" in e)) continue;
      for (const l of e.doc.lignes ?? []) {
        expect(l.terme.en.length, l.terme.fr).toBeGreaterThan(2);
        expect(l.texte.en.length, l.terme.fr).toBeGreaterThan(10);
      }
    }
  });
  it("la liquidité vient en premier parmi les risques", () => {
    const d = ORDRE_DE_LA_PAGE.flatMap((e) => ("doc" in e && e.doc.id === "types-de-risques" ? [e.doc] : []))[0];
    expect(d.lignes?.[0].terme.fr).toBe("Liquidité");
  });
});

describe("les cartes d'adjudication (7 novembre 2026)", () => {
  it("la grille de la carte est une colonne qui rétrécit : l'émetteur ne pousse plus la pastille hors de la carte", () => {
    expect(lire("src/components/OfferCard.module.css")).toMatch(/\.card \{[^}]*grid-template-columns: minmax\(0, 1fr\);/);
  });
  it("le Trésor est en surtitre sur la carte, et la ligne grise ne le redit pas", () => {
    const l = lire("src/components/LineIdentity.tsx");
    expect(l).toMatch(/const surtitre = size === "lg" && Tag === "div"/);
    expect(l).toMatch(/const ligneGrise = surtitre \? reste\.join/);
  });
  it("le coupon est un chiffre de la carte, au même rang que le rendement, et quitte la grille", () => {
    const o = lire("src/components/OfferCard.tsx");
    expect(o).toMatch(/<b className=\{styles\.coupon\}>\{s\.coupon\}<\/b>/);
    expect(o).toMatch(/s\.facts\.filter\(\(\[k\]\) => k !== "Coupon"\)/);
  });
  it("l'identité d'une ligne est une colonne qui rétrécit, et la pastille de sélection se tronque", () => {
    const c = lire("src/components/LineIdentity.module.css");
    expect(c).toMatch(/\.id \{[^}]*grid-template-columns: minmax\(0, 1fr\);/);
    expect(c, "la pastille de sélection ne se tronque plus").toMatch(/\.badge > em \{[^}]*text-overflow: ellipsis;/);
  });
  it("le titre d'un groupe est bleu, plus or", () => {
    expect(lire("src/components/market/TeteGroupe.module.css")).toMatch(/\.teteGroupe \{[^}]*color: var\(--navy-text\);/);
  });
});

describe("la bande de menu de la fiche (7 novembre 2026, choix 1A · 2C · 3B · 4)", () => {
  const css = () => lire("src/components/mobile/FichePanes.module.css");
  it("les onglets sont soulignés, bord à bord, sur un fond opaque qui colle sous la barre", () => {
    expect(css()).toMatch(/\.bande \{[^}]*position: sticky;[^}]*margin: 0 -14px[^}]*background: var\(--surface\);/);
    expect(css(), "l'onglet actif n'est plus souligné").toMatch(/\.seg \.on \{[^}]*border-bottom-color: var\(--gold\);/);
  });
  it("« Calendrier » n'est un onglet que pour une ligne qui en documente un, et il n'y a pas d'onglet « Risques »", () => {
    const r = lire("src/app/offres/[id]/FicheReading.tsx");
    expect(r).toMatch(/const avecCalendrier = o\.kind !== "FONDS" && o\.kind !== "MARCHE" && timeline\.length > 0;/);
    expect(r).toMatch(/<FicheSegments exclure=\{avecCalendrier \? \[\] : \["calendrier"\]\}/);
    expect(r).toMatch(/data-pane=\{avecCalendrier \? "calendrier" : "essentiel"\}/);
    const f = lire("src/components/mobile/FichePanes.tsx");
    expect(f).toMatch(/\["calendrier", "Calendrier"\]/);
    expect(f, "un onglet Risques est apparu").not.toMatch(/\["risques"/);
    expect(css()).toMatch(/data-show="calendrier"\] \[data-pane\]:not\(\[data-pane="calendrier"\]\)/);
  });
  it("collée, la bande porte le nom court de la ligne et son chiffre en avant", () => {
    expect(lire("src/components/mobile/FichePanes.tsx")).toMatch(/setColle\(!e\.isIntersecting && e\.boundingClientRect\.top < 52\)/);
    expect(css()).toMatch(/\.colle \.mini \{[^}]*display: flex;/);
    expect(lire("src/app/offres/[id]/FicheReading.tsx")).toMatch(/const mini = \{ nom: t\(titreCourt\(o\)\)/);
  });
  it("la barre « Toutes les offres · ‹ 5 / 17 › » tient sur une ligne sur téléphone", () => {
    const c = lire("src/components/ListNav.module.css");
    expect(c).toMatch(/@media \(max-width: 760px\) \{\s*\.bar \{\s*flex-wrap: nowrap;/);
    expect(c, "les mots Précédente/Suivante ne s'effacent plus").toMatch(/\.mot \{\s*display: none;/);
    expect(lire("src/components/ListNav.tsx"), "le lien sans mot perd son nom accessible").toMatch(/rel="prev" aria-label=\{t\("Précédente"\)\}/);
  });
});

describe("retouches du 7 novembre au soir : tuile compacte, hauteurs, menu ⋯, toucher, onglets du « i »", () => {
  it("la tuile compacte d'une adjudication nomme le Trésor et met le coupon en or", () => {
    const o = lire("src/components/OfferCard.tsx");
    expect(o).toMatch(/const tresor = \/\^Trésor public\/\.test\(s\.subtitle\);/);
    expect(o).toMatch(/\{tresor && <span className=\{styles\.cTresor\}>\{t\("Trésor public"\)\} <\/span>\}/);
    expect(o).toMatch(/<b className=\{styles\.cCoupon\}>/);
    expect(lire("src/components/OfferCard.module.css")).toMatch(/\.cCoupon \{[^}]*color: var\(--gold-ink\);/);
  });
  it("le champ de recherche a la hauteur de « Filtrer » et d'« Affichage » (44 px), sur Titres comme sur Fonds", () => {
    expect(lire("src/components/OfferBrowser.module.css")).toMatch(/max-width: none;\s*\/\*[^*]*\*\/\s*min-height: 44px;/);
    expect(lire("src/app/fonds/page.module.css")).toMatch(/min-width: 96px;\s*\/\*[^*]*\*\/\s*min-height: 44px;/);
  });
  it("le menu ⋯ est une fenêtre centrée, fermée en tirant vers le bas, avec « Contacter » et l'action de la ligne au pied", () => {
    const m = lire("src/components/mobile/LineMenu.tsx");
    expect(m, "le glissement ne garde plus la fenêtre centrée").toMatch(/translate\(-50%, calc\(-50% \+ \$\{drag\.current\.dy\}px\)\)/);
    expect(m).toMatch(/\["contacter", "Contacter un conseiller"/);
    expect(m).toMatch(/\/moi\/contact\?ligne=/);
    expect(m, "l'action de la ligne a perdu ses trois libellés").toMatch(/"Souscrire ou racheter" : line\.kind === "MARCHE" \? "Passer un ordre" : "Déclarer une intention"/);
    expect(m, "l'action reparaît sur la fiche ou sur une séance close").toMatch(/onFiche && !line\.past && line\.kind/);
    const c = lire("src/components/mobile/LineMenu.module.css");
    expect(c, "le menu redevient une feuille du bas sur téléphone").not.toMatch(/translateY\(105%\)/);
    expect(c).toMatch(/\.pied \{[^}]*position: sticky;[^}]*bottom: 0;/);
  });
  it("chaque appelant du menu donne le type de la ligne", () => {
    for (const f of ["src/components/OfferCard.tsx", "src/components/OfferBrowser.tsx", "src/app/fonds/FundCard.tsx", "src/app/fonds/FundsBrowser.tsx"]) expect(lire(f), f).toMatch(/kind: (o\.kind|"FONDS")/);
  });
  it("le navigateur du téléphone ne peint plus son rectangle clair sur ce qu'on touche", () => {
    expect(lire("src/app/globals.css")).toMatch(/a,\s*\nbutton,\s*\nsummary,\s*\n\[role="button"\],\s*\n\[role="tab"\] \{\s*\n\s*-webkit-tap-highlight-color: transparent;/);
  });
  it("les onglets du « i » se parcourent en glissant, d'au moins 60 px et plus large que haut", () => {
    const e = lire("src/components/EnBrefInstruments.tsx");
    expect(e).toMatch(/Math\.abs\(dx\) < 60 \|\| Math\.abs\(dx\) < Math\.abs\(dy\) \* 1\.5/);
    expect(e).toMatch(/dx < 0 \? 1 : -1/);
    expect(e).toMatch(/onTouchEnd=\{/);
  });
});

describe("la bulle de confirmation, une seule (7 novembre 2026)", () => {
  it("le menu ⋯, le glissement et l'étoile de la fiche disent « c'est fait » par la même bulle et le même texte", () => {
    for (const f of ["src/components/mobile/LineMenu.tsx", "src/components/mobile/SwipeActions.tsx", "src/components/WatchButton.tsx"]) {
      const s = lire(f);
      expect(s, `${f} n'utilise plus la bulle commune`).toMatch(/useBulle\(\)/);
      expect(s, `${f} dit le suivi à sa façon`).not.toMatch(/Alerte armée : un message par jour/);
    }
    expect(lire("src/components/mobile/Bulle.tsx")).toMatch(/export function texteDuSuivi\(/);
    /* ELLE SURVIT À SA PAGE : retirer une ligne de Suivies ou de Favoris démonte le bouton qui parle ; la bulle est un magasin de module, affiché par l'hôte de la mise en page. */
    expect(lire("src/components/mobile/Bulle.tsx"), "la bulle est de nouveau liée au composant qui la dit").toMatch(/let texte = "";[\s\S]*export function HoteDeLaBulle\(\)/);
    expect(lire("src/app/layout.tsx"), "l'hôte de la bulle n'est plus dans la mise en page").toMatch(/<HoteDeLaBulle \/>/);
    expect(lire("src/components/mobile/Bulle.module.css")).toMatch(/\.bulle \{[^}]*position: fixed;[^}]*z-index: 70;/);
  });
  it("l'étoile de la fiche lit le même état de suivi que le menu, le glissement et la cloche", () => {
    expect(lire("src/components/WatchButton.tsx")).toMatch(/const \[on, setOn\] = useSuivi\(offerId, initial\);/);
  });
});

describe("la documentation reprend les risques par instrument du document de référence (7 novembre 2026)", () => {
  it("la page porte une section « comment un prix réagit » et chaque instrument a ses risques propres", async () => {
    const m = await import("@/data/services-risques");
    const ids = m.ORDRE_DE_LA_PAGE.map((e) => ("doc" in e ? e.doc.id : e.legal));
    expect(ids).toContain("reactions");
    const inst = m.INSTRUMENTS.lignes ?? [];
    expect(inst.length).toBeGreaterThanOrEqual(5);
    for (const l of inst) expect(l.texte.fr, l.terme.fr).toMatch(/À veiller/);
  });
});

describe("les confirmations disent la même chose partout, y compris sur la fiche (7 novembre 2026)", () => {
  it("la fiche passe la cadence de la ligne à l'étoile et au menu, comme les cartes", () => {
    const f = lire("src/app/offres/[id]/FicheHead.tsx");
    expect(f).toMatch(/const cadence = cadenceDuSuivi\(o\);/);
    expect(f).toMatch(/<WatchButton [^>]*cadence=\{cadence\}/);
    expect(f).toMatch(/watching=\{watching\} cadence=\{cadence\}/);
    const w = lire("src/components/WatchButton.tsx");
    expect(w).toMatch(/toggleWatch\(offerId, !on, cadence\)/);
    expect(w).toMatch(/texteDuSuivi\(res\.watching, cadence, t\)/);
  });
});

describe("quel que soit le lien de suivi utilisé, la même cadence et la même bulle (7 novembre 2026)", () => {
  const sources = (): string[] => {
    const out: string[] = [];
    const marche = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = `${d}/${e.name}`;
        if (e.isDirectory()) marche(p);
        else if (p.endsWith(".tsx")) out.push(p);
      }
    };
    marche("src");
    return out;
  };
  it("chaque <LineMenu> et chaque <WatchButton> reçoit une cadence", () => {
    const sans: string[] = [];
    for (const f of sources()) {
      if (f.endsWith("mobile/LineMenu.tsx") || f.endsWith("components/WatchButton.tsx")) continue;
      const s = lire(f);
      for (const m of s.matchAll(/<(LineMenu|WatchButton)\b[^>]*?\/>/g)) if (!/cadence=/.test(m[0])) sans.push(`${f} · ${m[1]}`);
    }
    expect(sans, "un lien de suivi n'envoie pas la cadence de la ligne").toEqual([]);
  });
  it("une seule règle de cadence, lue partout", () => {
    expect(lire("src/lib/domain/sections.ts")).toMatch(/export function cadenceDuSuivi\(/);
    for (const f of ["src/components/OfferCard.tsx", "src/components/OfferBrowser.tsx", "src/app/offres/[id]/FicheHead.tsx", "src/app/favoris/page.tsx", "src/app/moi/suivies/page.tsx"]) expect(lire(f), f).toMatch(/cadenceDuSuivi\(o\)/);
  });
});

describe("la règle de cadence elle-même", () => {
  it("une séance se rappelle chaque jour, une ligne cotée et un fonds à chaque mouvement", async () => {
    const { cadenceDuSuivi } = await import("@/lib/domain/sections");
    for (const kind of ["OTA", "BTA", "RACHAT"] as const) expect(cadenceDuSuivi({ kind } as never), kind).toBe("quotidien");
    expect(cadenceDuSuivi({ kind: "MARCHE", instrument: "action" } as never)).toBe("evenement");
    expect(cadenceDuSuivi({ kind: "FONDS" } as never)).toBe("evenement");
  });
});

describe("pas d'événement, pas de compte à rebours : pas d'alerte (7 novembre 2026)", () => {
  it("la règle : une séance a une alerte tant qu'elle n'est pas close, un fonds a la sienne, une ligne cotée seulement si elle a traité", async () => {
    const { alerteOuverte } = await import("@/lib/domain/alerte");
    expect(alerteOuverte({ kind: "OTA" } as never, false), "séance ouverte").toBe(true);
    expect(alerteOuverte({ kind: "OTA" } as never, true), "séance close : plus de compte à rebours").toBe(false);
    expect(alerteOuverte({ kind: "RACHAT" } as never, true)).toBe(false);
    expect(alerteOuverte({ kind: "FONDS", fund: { nav: 1 } } as never, false)).toBe(true);
    expect(alerteOuverte({ kind: "MARCHE", instrument: "action", lastPrice: 90000 } as never, false)).toBe(true);
    expect(alerteOuverte({ kind: "MARCHE", instrument: "action", lastPrice: null } as never, false), "jamais traitée : rien à annoncer").toBe(false);
  });
  it("le glissement, le menu ⋯, l'étoile de la fiche et le tableau ne proposent pas d'alerte quand il n'y a rien à annoncer, sauf si elle est déjà armée", () => {
    const sw = lire("src/components/mobile/SwipeActions.tsx");
    expect(sw).toMatch(/const avecAlerte = alerte \|\| on;/);
    expect(sw).toMatch(/\{avecAlerte && \(\s*<button type="button" className=\{`\$\{styles\.b3\}/);
    expect(sw, "la poignée garde la place de trois actions").toMatch(/const reveal = avecAlerte \? REVEAL : REVEAL_DEUX;/);
    expect(lire("src/components/mobile/LineMenu.tsx")).toMatch(/line\.alerte === false && !on \? \[\]/);
    expect(lire("src/components/WatchButton.tsx")).toMatch(/if \(!alerte && !on\) return null;/);
    for (const f of ["src/components/OfferCard.tsx", "src/components/OfferBrowser.tsx", "src/app/offres/[id]/FicheHead.tsx"]) expect(lire(f), f).toMatch(/alerteOuverte\(o, s\.past\)/);
  });
});

describe("le menu ⋯ parle de la cadence de la ligne", () => {
  it("une séance propose « Armer l'alerte » (un message par jour jusqu'à la clôture), une ligne cotée « Suivre »", () => {
    const m = lire("src/components/mobile/LineMenu.tsx");
    expect(m).toMatch(/cadence === "quotidien" \? \(on \? "Retirer l'alerte" : "Armer l'alerte"\) : on \? "Ne plus suivre" : "Suivre"/);
    expect(m).toMatch(/"un message par jour jusqu'à la clôture"/);
  });
});
