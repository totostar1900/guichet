import { existsSync, readdirSync, readFileSync } from "node:fs";
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
    expect(lire("src/components/mobile/FichePanes.tsx")).toMatch(/setColle\(e\.intersectionRatio < 1 && e\.boundingClientRect\.top <= 53\)/);
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
    const b = lire("src/components/mobile/Bulle.tsx");
    expect(b, "la confirmation n'est plus au milieu de l'écran, fermée au geste").toMatch(/<Sheet open=\{Boolean\(t\)\} onClose=\{fermer\} title=\{titre\} centre>/);
    expect(b, "la confirmation ne se referme plus d'elle-même").toMatch(/const DUREE = 3000;/);
    expect(existsSync("src/components/mobile/Bulle.module.css"), "l'ancienne bulle en haut d'écran est revenue").toBe(false);
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

describe("le menu ⋯ parle de la cadence de la ligne", () => {
  it("une séance propose « Armer l'alerte » (un message par jour jusqu'à la clôture), une ligne cotée « Suivre »", () => {
    const m = lire("src/components/mobile/LineMenu.tsx");
    expect(m).toMatch(/cadence === "quotidien" \? \(on \? "Retirer l'alerte" : "Armer l'alerte"\) : on \? "Ne plus suivre" : "Suivre"/);
    expect(m).toMatch(/"un message par jour jusqu'à la clôture"/);
  });
});

describe("la fiche d'une ligne : une pile sans cadre, un pied qui range les risques, un lien qui mène à la liste (8 novembre 2026)", () => {
  const css = () => lire("src/app/offres/[id]/page.module.css");
  it("la lecture est une pile sans fond, sans bord, sans rayon, sans gouttière propre", () => {
    const m = css().match(/\n\.main \{[^}]*\}/)?.[0] ?? "";
    expect(m, "la lecture n'est plus une pile").toMatch(/display: grid;\s*gap: var\(--sections-gap\);/);
    expect(m, "le cadre de la fiche est revenu").not.toMatch(/background|border|padding/);
    expect(css(), "la gouttière du téléphone est revenue").not.toMatch(/\.main \{\s*padding: 4px 14px 8px;/);
    expect(css()).toMatch(/\.main \.sec \{\s*padding: 0;\s*border-bottom: 0;/);
    expect(css()).toMatch(/\.main \.sec h3 \{\s*margin: 0 0 var\(--titre-gap\);/);
  });
  it("aucun enfant témoin ni marge basse ne vient s'ajouter aux 28 px", () => {
    expect(lire("src/components/mobile/FichePanes.module.css"), "un témoin est revenu dans la pile").not.toMatch(/\.temoin/);
    expect(lire("src/components/mobile/FichePanes.tsx")).not.toMatch(/temoin/);
    expect(lire("src/components/ListNav.module.css")).not.toMatch(/margin-bottom: 4px/);
  });
  it("les lignes similaires sont à plat, et le lien de l'émetteur mène à la liste de la famille filtrée", () => {
    const s = lire("src/app/offres/[id]/LignesSimilaires.tsx");
    expect(s, "les lignes similaires ont de nouveau leur carte").toMatch(/lignes=\{lignes\} plat \/>/);
    expect(s, "le lien de l'émetteur ne mène plus à la liste filtrée").toMatch(/href=\{`\$\{liste\.href\}\?q=\$\{encodeURIComponent\(o\.issuer\)\}`\}/);
    expect(s, "le lien n'est plus dans le bloc des lignes").toMatch(/<div className=\{styles\.similaires\}>/);
    expect(lire("src/components/accueil/BlocDeLignes.module.css")).toMatch(/\.plat \{[^}]*background: none;[^}]*border: 0;/);
  });
  it("le pied de la fiche range les risques en trois liens : le texte opposable, la leçon, la documentation", () => {
    const p = lire("src/app/offres/[id]/PiedDeFiche.tsx");
    for (const h of ['"/info/risques#risques"', '"/info/les-quatre-risques"', '"/info/mentions#types-de-risques"']) expect(p, h).toContain(h);
    expect(p).toMatch(/<footer className=\{styles\.pied\}/);
    expect(lire("src/app/offres/[id]/page.tsx")).toMatch(/<PiedDeFiche \/>/);
  });
});

describe("la barre du haut dit la famille de la fiche (8 novembre 2026)", () => {
  it("la fiche publie la liste de sa famille, la barre la lit pour CETTE adresse seulement", async () => {
    expect(lire("src/app/offres/[id]/page.tsx")).toMatch(/<LieuDeLaFiche chemin=\{`\/offres\/\$\{o\.id\}`\} liste=\{listeDeLaFiche\(o\)\.href\} \/>/);
    const sh = lire("src/components/mobile/MobileShell.tsx");
    expect(sh).toMatch(/const lieu = lieuDe\(listeDeLaFiche \?\? path\);/);
    expect(lire("src/components/LieuDeLaFiche.tsx"), "la fiche quittée laisse son lieu à la page suivante").toMatch(/c\.chemin === chemin \? c\.liste : undefined/);
    const { lieuDe } = await import("@/lib/domain/lieu");
    expect(lieuDe("/calendrier")?.rubrique, "l'adresse de la liste des adjudications ne dit plus « Adjudications »").toBe("Adjudications");
    expect(lieuDe("/fonds")?.rubrique).toBe("Fonds");
    expect(lieuDe("/offres/une-adjudication")?.rubrique, "sans la famille dite par la fiche, la barre retombe sur Titres").toBe("Titres");
  });
});

describe("la note « Chiffres de référence » se tient à --titre-gap de son bloc (8 novembre 2026)", () => {
  it("la note a sa marge haute à --titre-gap, et la section n'est pas devenue une grille (qui doublerait les écarts du bloc)", () => {
    expect(lire("src/app/offres/[id]/page.module.css")).toMatch(/\.noteBulle \{[^}]*margin: var\(--titre-gap\) 0 0;/);
    expect(lire("src/app/offres/[id]/FicheReading.tsx"), "la section des chiffres est devenue une grille").not.toMatch(/styles\.ensemble/);
  });
});

describe("toute ligne peut recevoir une alerte, et seul le client la retire (8 novembre 2026)", () => {
  const fichiers = (): string[] => {
    const out: string[] = [];
    const marche = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = `${d}/${e.name}`;
        if (e.isDirectory()) marche(p);
        else if (/\.tsx?$/.test(p) && !p.startsWith("src/test")) out.push(p);
      }
    };
    marche("src");
    return out;
  };
  it("aucune règle ne retire l'offre d'une alerte : ni module de règle, ni propriété « alerte » sur le glissement, le menu ou l'étoile", () => {
    expect(existsSync("src/lib/domain/alerte.ts"), "une règle d'offre de l'alerte est revenue").toBe(false);
    for (const f of ["src/components/mobile/SwipeActions.tsx", "src/components/mobile/LineMenu.tsx", "src/components/WatchButton.tsx"]) expect(lire(f), f).not.toMatch(/alerteOuverte|avecAlerte|line\.alerte|\balerte\?: boolean/);
    expect(lire("src/components/WatchButton.tsx"), "l'étoile disparaît de nouveau pour certaines lignes").not.toMatch(/return null;\s*\n\s*if \(!signedIn\)/);
  });
  it("le glissement porte ses trois actions pour toute ligne, la poignée garde sa largeur de trois", () => {
    const sw = lire("src/components/mobile/SwipeActions.tsx");
    expect(sw).toMatch(/const REVEAL = 232;/);
    expect(sw).toMatch(/<button type="button" className=\{`\$\{styles\.b3\} \$\{on \? styles\.b3on : ""\}`\}/);
    expect(sw, "la largeur à deux actions est revenue").not.toMatch(/REVEAL_DEUX/);
    expect(lire("src/components/mobile/LineMenu.tsx"), "« Suivre » est de nouveau conditionnel dans le menu").toMatch(/\n    \["suivre", cadence === "quotidien"/);
  });
  it("rien, côté maison, ne désarme une alerte : « toggleWatch » est le seul appelant de « removeWatch »", () => {
    const appels = fichiers().filter((p) => !p.startsWith("src/lib/data/") && /\.removeWatch\(/.test(lire(p)));
    expect(appels, "une autre voie retire des alertes").toEqual(["src/app/offres/[id]/actions.ts"]);
  });
  it("une alerte sur une séance close ne dit rien : l'envoi du jour saute les séances échues", () => {
    expect(lire("src/lib/watch.ts"), "l'envoi quotidien ne saute plus une séance échue").toMatch(/if \(reste < 0 \|\| w\.lastDaily === jour\) continue;/);
  });
});

describe("bulles d'information au milieu, menu sans identité, résultat de séance et communiqué (8 novembre 2026)", () => {
  it("le « i » d'explication ouvre une fenêtre centrée, fermée d'un geste du doigt : plus d'infobulle à flèche", () => {
    const i = lire("src/components/Info.tsx");
    expect(i, "l'explication n'est plus dans la fenêtre centrée").toMatch(/<Sheet open=\{open\} onClose=\{\(\) => setOpen\(false\)\} title=\{title \|\| tr\("Explication"\)\} centre>/);
    expect(i, "l'infobulle à flèche est revenue").not.toMatch(/role="tooltip"|createPortal|getBoundingClientRect/);
    expect(lire("src/components/Info.module.css")).not.toMatch(/\.bubble|border-top-color/);
    expect(lire("src/components/mobile/Sheet.tsx"), "la fenêtre centrée ne se ferme plus au geste").toMatch(/centre \? `translate\(-50%, calc\(-50% \+ \$\{drag\.current\.dy\}px\)\)`/);
  });
  it("la règle des bulles est écrite dans le skill et dans l'étalon, avec ses exceptions", () => {
    const s = lire(".claude/skills/guichet-espace-tuiles/SKILL.md");
    expect(s).toMatch(/## Les bulles d'information/);
    expect(s).toMatch(/Exceptions/);
    expect(lire("ETALON.md")).toMatch(/### 8\.9 Les bulles d'information/);
  });
  it("le menu ☰ n'a plus d'identité en haut : ni initiale, ni nom ; « Mon compte » reste une ligne de la liste", () => {
    const b = lire("src/components/mobile/BarreDuHaut.tsx");
    expect(b, "l'identité est revenue en haut du menu").not.toMatch(/styles\.identite|styles\.init|const initial/);
    expect(b.match(/href="\/moi\/compte"/g)?.length, "« Mon compte » n'est plus joignable depuis le menu").toBe(1);
    expect(lire("src/components/mobile/BarreDuHaut.module.css")).not.toMatch(/\.identite|\.init \{/);
  });
  it("le résultat de séance : plus de « Taux servi … précompté » chez le client, plus de phrase sur les soumissions, le communiqué est un document", () => {
    const f = lire("src/app/offres/[id]/FicheReading.tsx");
    expect(f, "la ligne de résultat du desk s'affiche de nouveau chez le client").toMatch(/\{mode === "desk" && o\.resultLine && <div className=\{styles\.result\}>/);
    expect(f, "la phrase sur les soumissions est revenue").not.toMatch(/Peu de soumissions/);
    expect(f, "le communiqué n'est plus rangé avec les documents").toMatch(/\{seance && \(\s*<a className=\{`\$\{styles\.doc\} \$\{styles\.docLink\}`\} href=\{seance\.sourceUrl\}/);
  });
  it("un émetteur souverain a son propre libellé, qui ne parle ni de comptes publiés ni d'actionnariat", () => {
    expect(lire("src/app/offres/[id]/IssuerCard.tsx")).toMatch(/sovereign \? "Ses emprunts, ses séances et son calendrier d'adjudications"/);
  });
});

describe("les trois bulles d'information sont la fenêtre centrée (8 novembre 2026)", () => {
  it("le « i » d'un terme, la carte de chiffre et le « ? » d'un réglage ouvrent « Sheet » « centre » ; aucune ne se place à la main", () => {
    for (const f of ["src/components/Info.tsx", "src/components/KpiCard.tsx", "src/components/market/AideReglage.tsx"]) {
      const s = lire(f);
      expect(s, `${f} n'ouvre plus la fenêtre centrée`).toMatch(/<Sheet\b[\s\S]*?\bcentre\b/);
      expect(s, `${f} se place de nouveau à la main`).not.toMatch(/createPortal|getBoundingClientRect|position: fixed/);
    }
    expect(lire("src/components/KpiCard.module.css"), "les règles de l'ancienne feuille sont revenues").not.toMatch(/\.scrim|\.sheet|\.grab/);
    expect(lire("src/components/market/AideReglage.module.css"), "l'ancienne bulle posée est revenue").not.toMatch(/\.bulle/);
  });
});

describe("l'astuce de glissement est une bulle au milieu de l'écran (8 novembre 2026)", () => {
  it("l'astuce du pager ouvre la fenêtre centrée, fermée au geste, et n'a plus de pastille à elle", () => {
    const s = lire("src/components/mobile/SwipePager.tsx");
    expect(s, "l'astuce n'est plus la fenêtre centrée").toMatch(/<Sheet open=\{hint\} onClose=\{\(\) => setHint\(false\)\} title=\{[^}]*\} centre>/);
    expect(s, "l'ancienne pastille du bas est revenue").not.toMatch(/styles\.hint/);
    expect(lire("src/components/mobile/SwipePager.module.css"), "les règles de l'ancienne pastille sont revenues").not.toMatch(/\.hint/);
    expect(s, "l'astuce ne se retire plus d'elle-même").toMatch(/window\.setTimeout\(\(\) => setHint\(false\), 4200\)/);
    expect(s, "l'astuce se montre de nouveau à chaque visite").toMatch(/if \(!localStorage\.getItem\(key\) && \(prevHref \|\| nextHref\)\)/);
  });
});
