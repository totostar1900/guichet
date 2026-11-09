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
    expect(c, "le dos n'existe pas en vue détaillée").not.toContain("titres-deplier");
  });
  it("la visite des cartes compactes parle du chiffre de la tuile et du dos", () => {
    const c = cibles("compactes", "cote");
    expect(c).toContain("titres-chiffre");
    expect(c, "l'extension manque à la visite compacte").toContain("titres-deplier");
    expect(c, "la grille détaillée est au dos, pas sur la tuile").not.toContain("titres-grille");
  });
  it("chaque vue a sa visite, et les deux pages ne disent pas la même chose du chiffre", () => {
    expect(cibles("liste", "cote").length).toBeGreaterThan(4);
    expect(cibles("tableau", "cote").length).toBeGreaterThan(4);
    const texte = (p: PageDeLaVisite) => visiteDesTitres({ vue: "detaillees", page: p, t }).find((s) => s.target === "titres-prix")?.text;
    expect(texte("adjudications")).not.toBe(texte("cote"));
  });
  it("chaque repère de la visite existe dans le code de la carte ou de la barre", () => {
    const code = [lire("src/components/OfferCard.tsx"), lire("src/components/mobile/CarteDepliee.tsx"), lire("src/components/market/TeteGroupe.tsx"), lire("src/components/OfferBrowser.tsx"), lire("src/components/MarketToggles.tsx"), lire("src/components/Affichage.tsx"), lire("src/components/market/OngletsMarche.tsx")].join("\n");
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
    expect(c, "la raison de la sélection est de nouveau coupée sur la fiche").toMatch(/\.xl \.badge \{[^}]*white-space: normal;[^}]*\}\s*\.xl \.badge > em \{[^}]*overflow: visible;[^}]*text-overflow: clip;/);
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
    expect(r).toMatch(/<FicheSegments exclure=\{\[\.\.\.\(avecCalendrier \? \[\] : \["calendrier"\]\), \.\.\.\(seanceClient \? \["chiffres"\] : \[\]\)\]\}/);
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
    expect(m, "le glissement ne garde plus la fenêtre centrée").toMatch(/translate\(-50%, calc\(-50% \+ \$\{dy\}px\)\)/);
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
    expect(s, "les lignes similaires ont de nouveau leur carte").toMatch(/lignes=\{lignes\} plat fort \/>/);
    expect(s, "le lien de l'émetteur ne mène plus à la liste filtrée").toMatch(/href=\{`\$\{liste\.href\}\?q=\$\{encodeURIComponent\(o\.issuer\)\}`\}/);
    expect(s, "le lien n'est plus dans le bloc des lignes").toMatch(/<div className=\{styles\.similaires\} data-pane="essentiel">/);
    expect(lire("src/components/accueil/BlocDeLignes.module.css")).toMatch(/\.plat \{[^}]*background: none;[^}]*border: 0;/);
  });
  it("le pied de la fiche range les risques en trois liens : le texte opposable, la leçon, la documentation", () => {
    const p = lire("src/app/offres/[id]/PiedDeFiche.tsx");
    for (const h of ['"/info/risques#risques"', '"/info/les-quatre-risques"', '"/info/mentions#types-de-risques"']) expect(p, h).toContain(h);
    expect(p).toMatch(/<footer className=\{styles\.pied\}/);
    expect(lire("src/app/offres/[id]/page.tsx")).toMatch(/<PiedDeFiche carte=\{/);
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
    expect(lire("src/components/mobile/Sheet.tsx"), "la fenêtre centrée ne se ferme plus au geste").toMatch(/centre \? `translate\(-50%, calc\(-50% \+ \$\{dy\}px\)\)`/);
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

describe("la fiche d'une ligne : des sections qui se lisent (8 novembre 2026, planche 1A · 2A · 3C)", () => {
  const css = () => lire("src/app/offres/[id]/page.module.css");
  const lecture = () => lire("src/app/offres/[id]/FicheReading.tsx");
  const bloc = (s: string, selecteur: string) => s.match(new RegExp(`\\n${selecteur.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]*)\\}`))?.[1] ?? "";

  it("les sections du client sont séparées par l'écart des chapitres, la tête et la bande gardent celui des sections", () => {
    expect(lecture(), "le client n'a plus sa pile de chapitres, ou le desk l'a prise").toMatch(/return mode === "desk" \? corps : <div className="chapitres">\{corps\}<\/div>;/);
    expect(lecture(), "les lignes similaires et le pied ne sont plus dans la pile des sections").toMatch(/\{children\}\s*<\/>\s*\);\s*return mode === "desk"/);
    expect(lire("src/app/offres/[id]/page.tsx"), "la page ne range plus les sorties et le pied dans la lecture").toMatch(/<FicheReading o=\{o\} data=\{fiche\} qty=\{qty\}>\s*<LignesSimilaires o=\{o\} \/>\s*<PiedDeFiche carte=\{[^}]*\}\s*\/>\s*<\/FicheReading>/);
    expect(bloc(css(), ".main"), "la lecture n'est plus la pile de la tête et de la bande").toMatch(/gap: var\(--sections-gap\);/);
  });
  it("un seul titre de section : 17 px (--t-6, +20 %), en gras, en encre pleine, jamais en capitales", () => {
    const h3 = bloc(css(), ".main .sec h3");
    expect(h3, "le titre n'est plus à --t-6").toMatch(/font-size: var\(--t-6\);/);
    expect(h3, "le titre n'est plus en gras").toMatch(/font-weight: 700;/);
    expect(h3, "le titre n'est plus en encre pleine").toMatch(/color: var\(--ink\);/);
    const pied = bloc(css(), ".pied h2");
    expect(pied, "le titre du pied n'est plus celui des sections").toMatch(/font-size: var\(--t-6\);[^}]*font-weight: 700;/);
    expect(pied, "le titre du pied est revenu en capitales").not.toMatch(/text-transform|letter-spacing/);
    const fort = bloc(lire("src/components/TitreDeBloc.module.css"), ".fort");
    expect(fort, "le titre des lignes similaires n'est plus celui des sections").toMatch(/font-size: var\(--t-6\);[^}]*text-transform: none;/);
    expect(lire("src/components/TitreDeBloc.tsx"), "« fort » ne choisit plus la classe").toMatch(/\$\{fort \? styles\.fort : ""\}/);
  });
  it("les lignes similaires ne paraissent que dans l'Essentiel ; le pied aussi pour une action, sous chaque onglet pour les autres lignes", () => {
    expect(lire("src/app/offres/[id]/LignesSimilaires.tsx")).toMatch(/<div className=\{styles\.similaires\} data-pane="essentiel">/);
    expect(lire("src/app/offres/[id]/PiedDeFiche.tsx"), "le pied d'une action n'est plus dans l'Essentiel seulement, ou celui des autres lignes l'est devenu").toMatch(/data-pane=\{carte \? "essentiel" : undefined\}/);
  });
  it("le chiffre en avant puis des rangées chez le client, les cartes au desk ; de quand date le chiffre est la dernière rangée", () => {
    const k = lire("src/app/offres/[id]/Kpis.tsx");
    expect(k, "le client n'a plus le chiffre en avant").toMatch(/if \(mode !== "desk"\) \{[\s\S]*forme="heros"/);
    expect(k, "les rangées ne sont plus des rangées").toMatch(/forme="rangee"/);
    expect(k, "la date du chiffre n'est plus une rangée").toMatch(/\{stamp && <KpiCard forme="rangee" label=\{dateLabel\}/);
    expect(k, "le desk n'a plus ses cartes").toMatch(/return \(\s*<div className=\{styles\.kpis\}>/);
    expect(lecture(), "la puce de date est revenue au-dessus des chiffres").not.toMatch(/<span className=\{`stamp/);
    expect(lecture()).toMatch(/<Kpis o=\{o\} base=\{base\} variation=\{variation3m\} mode=\{mode\} stamp=/);
  });
  it("le calcul se découpe en trois blocs titrés chez le client, un seul au desk", () => {
    const l = lecture();
    expect(l, "le calcul n'est plus découpé").toMatch(/<h3>\{t\("Ce que cela représente"\)\}<\/h3>/);
    expect(l).toMatch(/<h3>\{t\("L'échéancier"\)\}<\/h3>/);
    expect(l, "le desk n'a plus sa lecture d'un bloc").toMatch(/if \(mode === "desk"\) \{\s*return \(\s*<>\s*<h3>\{titre\}<\/h3>/);
    expect(l, "le groupe du calcul n'est plus un groupe de chapitres chez le client").toMatch(/<div className="chapitres" data-pane=\{seanceClient \? "essentiel" : "chiffres"\}>/);
    expect(lire("src/components/RefTotals.tsx"), "le total à plat n'a plus son chiffre en avant").toMatch(/if \(plat\) \{[\s\S]*styles\.grand/);
  });
  it("le calendrier est une frise verticale chez le client ; un onglet sans document le dit", () => {
    expect(lecture(), "la frise n'est plus celle du client").toMatch(/className=\{mode === "desk" \? styles\.tl : styles\.frise\}/);
    expect(bloc(css(), ".frise div::before").length, "les points de la frise ont disparu").toBeGreaterThan(0);
    expect(lecture(), "l'onglet sans document ne parle plus").toMatch(/o\.documents\.length === 0 && !seance && \(\s*<div className=\{styles\.vide\}>/);
  });
});

describe("la fiche d'une action : des encadrés en relief, des graphes, des mosaïques (9 novembre 2026, planche 1A · 2B · 44 px)", () => {
  const dir = "src/app/offres/[id]";
  const action = () => lire(`${dir}/FicheAction.tsx`);
  const bloc = (s: string, selecteur: string) => s.match(new RegExp(`(?:^|\\n)${selecteur.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]*)\\}`))?.[1] ?? "";

  it("le client lit sa propre fiche d'action, le desk garde l'ancienne", () => {
    const l = lire(`${dir}/FicheReading.tsx`);
    expect(l, "la fiche d'une action du client n'est plus à part").toMatch(/if \(mode !== "desk" && o\.kind === "MARCHE" && o\.instrument === "action"\) \{[\s\S]*?<FicheAction o=\{o\} data=\{data\} \/>[\s\S]*?\{children\}/);
    expect(l, "le desk n'a plus sa lecture d'avant (Kpis)").toMatch(/<Kpis o=\{o\} base=\{base\}/);
  });
  it("le titre est À PLAT, au-dessus de l'encadré, jamais dedans", () => {
    expect(action(), "le titre est entré dans la carte").toMatch(/<h3>\s*\{titre\}\s*\{info && <Info text=\{info\} label=\{titre\} \/>\}\s*<\/h3>\s*<Carte plat=\{plat\}>\{children\}<\/Carte>/);
    const c = bloc(lire("src/components/Carte.module.css"), ".carte");
    expect(c, "la carte n'a plus le fond de la surface").toMatch(/background: var\(--surface\);/);
    expect(c, "la carte n'a plus l'ombre de la maison").toMatch(/box-shadow:[^;]*var\(--shadow\);/);
    expect(c, "la carte n'a plus le rayon des choses qu'on touche").toMatch(/border-radius: var\(--rond\);/);
  });
  it("le chiffre majeur est à la taille dominante et les tuiles passent deux par deux", () => {
    const css = lire("src/components/Mosaique.module.css");
    expect(bloc(css, ".valeur"), "le majeur n'est plus à --t-8").toMatch(/font-size: var\(--t-8\);/);
    expect(bloc(css, ".c2"), "quatre tuiles ne sont plus sur deux colonnes").toMatch(/grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
    expect(lire("src/components/Mosaique.tsx"), "le nombre de tuiles ne choisit plus les colonnes").toMatch(/n === 1 \? styles\.c1 : n === 3 && !deux \? styles\.c3 : styles\.c2/);
    expect(lire("src/components/Mosaique.module.css"), "trois tuiles à libellé long ne peuvent plus passer sur deux colonnes").toMatch(/\.derniereLarge \.tuile:last-child \{\s*grid-column: 1 \/ -1;/);
    expect(lire(`${dir}/FicheFonds.tsx`), "les chiffres clés du fonds repassent à trois colonnes serrées").toMatch(/tuiles=\{tuilesCles\} deux \/>/);
    expect(action(), "le rendement n'est plus le chiffre majeur des chiffres clés").toMatch(/majeur=\{<Majeur etiquette=\{t\("Rendement du dernier dividende"\)\} valeur=\{yTxt\} or \/>\}/);
    expect(action(), "le chiffre clé porte de nouveau son propre « ? » : un seul « i » par section").not.toMatch(/<KpiCard/);
  });
  it("Chiffres est regroupé dans l'Essentiel : trois onglets, les sections de chaque onglet sont là, dans l'ordre", () => {
    expect(lire(`${dir}/FicheReading.tsx`), "l'onglet Chiffres est revenu pour une action").toMatch(/<FicheSegments exclure=\{\["calendrier", "chiffres"\]\} mini=\{mini\} \/>\s*<FicheAction/);
    const a = action();
    expect(a, "un bloc de la fiche d'une action est encore rangé dans l'onglet Chiffres").not.toMatch(/pane="chiffres"/);
    const ordre = ['t("Cours")', 't("Chiffres clés")', 't("Séances")', 't("Cotation et règlement")', 't("Documents")', 't("L\'émetteur")', 't("Performance financière")', 't("Marge et rentabilité")', 't("Bilan et capitaux propres")', 't("Dividende par action")', '<GraphesDeValorisation', 't("Actionnaires")'];
    let depuis = 0;
    for (const o of ordre) {
      const i = a.indexOf(o, depuis);
      expect(i, `la section ${o} manque ou n'est plus dans l'ordre`).toBeGreaterThan(-1);
      depuis = i;
    }
    expect(a, "la courbe « Évolution du cours » est revenue : le cours a UNE courbe").not.toMatch(/titre=\{t\("Évolution du cours"\)\}/);
    expect(a, "la tuile « Pour 100 actions au cours vendeur » est revenue : elle ne disait rien de particulier").not.toMatch(/au cours vendeur/);
  });
  it("la courbe a sa liste déroulante (celle de la maison), ses axes et ses volumes ; la fiche lit toutes les séances", () => {
    const c = lire("src/components/CourbeDuCours.tsx");
    expect(c, "la liste des périodes n'est plus celle de la maison").toMatch(/import \{ Select \} from "\.\/ui\/Select";/);
    expect(c, "la liste ne grise plus les périodes sans historique").toMatch(/disabled: !l\.disponible,/);
    expect(c, "les périodes viennent d'ailleurs que de periodes.ts").toMatch(/lirePeriode, periodeParDefaut, PERIODES, volumetrie/);
    expect(c, "les volumes n'ont plus leur axe en titres").toMatch(/<text x=\{2\} y=\{volTop - 14\} className=\{styles\.unite\}>\s*\{t\("titres"\)\}\s*<\/text>/);
    expect(c, "le volume des transactions (la valeur échangée) n'a plus son panneau sous les titres échangés").toMatch(/<text x=\{2\} y=\{valTop - 14\} className=\{styles\.unite\}>\s*\{t\("Valeur échangée"\)\}/);
    expect(c, "la bulle noire n'est plus au-dessus du dessin").toMatch(/<BulleNoire lecture=\{lecture\} x=\{index == null \? 0 : x\(index\)\} W=\{W\} \/>/);
    expect(c, "les dates de l'axe ont perdu leur année").toMatch(/\{fmtDate\(serie\[i\]\.d\)\}/);
    expect(c, "les volumes ne sont plus dessinés").toMatch(/styles\.volume/);
    expect(c, "la volumétrie n'est plus dite sous le graphe").toMatch(/Séances avec échange/);
    expect(lire(`${dir}/FicheReading.tsx`), "l'action ne lit plus toutes ses séances : 2, 3 et 5 ans seraient grisés à tort").toMatch(/o\.instrument === "action" \? 5000 : 60/);
    const p = lire("src/lib/market/periodes.ts");
    expect(p, "les huit périodes ont changé").toMatch(/cle: "3m"[\s\S]*cle: "6m"[\s\S]*cle: "1a"[\s\S]*cle: "debut"[\s\S]*cle: "2a"[\s\S]*cle: "3a"[\s\S]*cle: "5a"[\s\S]*cle: "max"/);
    expect(lire("src/lib/market/performe.ts"), "« Ce qui performe » a de nouveau sa propre fenêtre de trois mois").toMatch(/from "@\/lib\/market\/periodes";/);
  });
  it("une action n'a pas de remboursement : « in fine » est réservé aux obligations", async () => {
    const { repaymentLabel } = await import("@/lib/domain/status");
    const base = { kind: "MARCHE", isin: "XX0000000000", couponRate: null } as never;
    expect(repaymentLabel({ ...(base as object), instrument: "action" } as never), "une action affiche de nouveau un remboursement").toBeUndefined();
    expect(repaymentLabel({ ...(base as object), instrument: "obligation" } as never), "une obligation a perdu son remboursement").toMatch(/in fine/);
  });
  it("les lignes similaires d'une action défilent en cartes, les rangées du pied sont dans une carte plate", () => {
    const s = lire(`${dir}/LignesSimilaires.tsx`);
    expect(s, "les lignes similaires d'une action ne sont plus des cartes").toMatch(/const action = o\.kind === "MARCHE" && o\.instrument === "action";[\s\S]*?const enCartes = action \|\| fonds \|\| seance;/);
    expect(s).toMatch(/<ul className=\{cartes\.rail\}>/);
    expect(bloc(lire(`${dir}/CartesSimilaires.module.css`), ".rail"), "le rail ne défile plus").toMatch(/overflow-x: auto;/);
    expect(lire(`${dir}/PiedDeFiche.tsx`), "le pied n'a plus sa carte").toMatch(/return carte \? <Carte plat>\{liste\}<\/Carte> : liste;/);
    expect(lire(`${dir}/page.tsx`), "la page ne demande plus la carte du pied pour une action").toMatch(/<PiedDeFiche carte=\{\(o\.kind === "MARCHE" && o\.instrument === "action"\) \|\| o\.kind === "FONDS"\} \/>/);
  });
  it("l'Émetteur porte la société : le résultat net sur un axe secondaire, les rapports, le bilan, les dividendes, les actionnaires, la mention en dernier", () => {
    const a = action();
    expect(a, "le résultat net n'est plus sur un axe secondaire").toMatch(/droit=\{\{ unite: echelleResultat\.short, lignes: \[\{ nom: t\("Résultat net"\)/);
    expect(a, "le chiffre d'affaires n'est plus en barres sur l'axe principal").toMatch(/barres=\{\[\{ nom: t\(dernierCompte\.revenueLabel\)/);
    expect(a, "les rapports ne passent plus par finance.ts").toMatch(/margeNettePct, partFondsPropresPct, rendementDividendePct, rentabiliteFondsPropresPct/);
    expect(a, "le rendement du dividende n'est plus la courbe de l'axe secondaire du dividende par action").toMatch(/droit=\{\{ unite: "%", lignes: \[\{ nom: t\("Rendement au cours actuel"\)/);
    expect(a, "la marge est de nouveau tracée par morceaux : points isolés sur une série trouée").toMatch(/const margesFiables = marges\.length >= 2 && marges\.every\(\(v\) => v != null\);/);
    expect(a, "la marge ne suit plus sa fiabilité").toMatch(/\.\.\.\(margesFiables \? \[\{ nom: t\("Marge nette"\)/);
    expect(a, "les autres lignes ne sont plus une section à part").toMatch(/lignesSeulement \/>/);
    expect(a, "la mention courte ne suit plus la dernière section d'un onglet").toMatch(/const fin = \(cle: string\) => \(derniere === cle \? mention : undefined\);/);
    expect(a, "la mention n'est plus sous Documents").toMatch(/<\/Carte>\s*\{mention\}/);
    expect(lire(`${dir}/IssuerCard.tsx`), "l'identité est de nouveau dite deux fois").toMatch(/\{!lignesSeulement && \(\s*<>/);
    const g = lire("src/components/GrapheComptes.tsx");
    expect(g, "l'axe secondaire n'est plus dessiné").toMatch(/droit\?: \{ unite: string; lignes: SerieAnnuelle\[\] \}/);
    expect(g, "une année sans valeur n'est plus un tiret").toMatch(/—/);
  });
  it("les lignes similaires d'une action sont les autres actions, alignées en trois rangées fixes", () => {
    const s = lire(`${dir}/LignesSimilaires.tsx`);
    expect(s, "les lignes similaires d'une action ne sont plus les autres actions").toMatch(/enCartes \? lignesSimilaires\(o, autres, now, 7\)/);
    expect(s, "le jeu en double par ISIN n'est plus écarté").toMatch(/x\.isin !== o\.isin/);
    const css = lire(`${dir}/CartesSimilaires.module.css`);
    expect(css.match(/\.nom \{([^}]*)\}/)?.[1] ?? "", "le nom ne réserve plus ses trois lignes").toMatch(/min-height: calc\(3 \* 1\.3 \* var\(--t-3\)\);/);
    expect(css.match(/\.perf \{([^}]*)\}/)?.[1] ?? "", "la rangée de performance n'a plus de hauteur fixe").toMatch(/min-height: var\(--s-9\);/);
    expect(s, "la pastille n'est plus dans sa rangée").toMatch(/<span className=\{cartes\.perf\}>/);
  });
});

describe("la valorisation d'une action : un graphe par indicateur, une durée pour tous (9 novembre 2026, planche B)", () => {
  const dir = "src/app/offres/[id]";
  const val = () => lire(`${dir}/GraphesDeValorisation.tsx`);

  it("quatre sections à plat dans l'Émetteur, une seule liste de durée pour les quatre", () => {
    const v = val();
    expect((v.match(/<Select\b/g) ?? []).length, "la liste de durée n'est plus UN composant, un seul état").toBe(1);
    expect((v.match(/\{selecteur\(\)\}/g) ?? []).length, "la liste de durée n'est plus dans chaque graphe (capitalisation, les trois indicateurs, la rotation)").toBe(3);
    expect(v, "la liste n'est plus dans l'en-tête de la carte de la capitalisation").toMatch(/<div className=\{fa\.entete\}>\s*<Majeur etiquette=\{t\("Valeur au \{d\}"/);
    expect(v, "la capitalisation n'a plus sa section et son « i »").toMatch(/<Enveloppe pane=\{pane\} panneau=\{panneau\} titre=\{t\("Capitalisation boursière"\)\} info=\{t\(/);
    expect(v, "les trois indicateurs ne sont plus des sections").toMatch(/\{ cle: "per", titre: t\("Rapport cours \/ bénéfice"\)[\s\S]*\{ cle: "pb", titre: t\("Cours \/ valeur comptable"\)[\s\S]*\{ cle: "rendement", titre: t\("Rendement du dividende"\)/);
    expect(v, "la période ne vient plus de la même lecture que le cours").toMatch(/lirePeriode\(reperes, p\.cle\)/);
    expect(v, "les quatre sections ne sont plus dans l'Émetteur").toMatch(/<section className=\{styles\.sec\} data-pane=\{pane\}>[\s\S]*pane = "emetteur"[\s\S]*<Enveloppe key=\{ind\.cle\} pane=\{pane\} panneau=\{panneau\}/);
    expect(v, "les rapports ne sont plus dessinés en marches").toMatch(/<GrapheDeSerie dates=\{dates\} unite=\{ind\.unite\} pas /);
    expect(v, "la mention courte ne suit plus la dernière section (la rotation du flottant)").toMatch(/<Enveloppe pane=\{pane\} panneau=\{panneau\} titre=\{t\("Rotation du flottant"\)\} info=\{t\([^\n]*\)\} fin=\{fin\}>/);
    expect(v, "la bulle d'un mois de la rotation a perdu son année").toMatch(/etiquettesLues=\{mois\.map\(\(m\) => motDeMois\(`\$\{m\.mois\}-01`, true\)\)\}/);
    expect(v, "la rotation du flottant n'a plus sa section, mois par mois").toMatch(/<Enveloppe pane=\{pane\} panneau=\{panneau\} titre=\{t\("Rotation du flottant"\)\} info=\{t\(/);
    expect(v, "la rotation du flottant n'est plus en tuile sous la capitalisation").toMatch(/<Tuiles tuiles=\{\[\[t\("Valeur échangée"\), valeurEchangee\], \[t\("Rotation du flottant"\), rotationTexte\]\]\} \/>/);
    expect(v, "l'avertissement du résultat net supérieur au chiffre d'affaires a disparu").toMatch(/resultatAuDessusDuChiffreDAffaires && ind\.cle !== "rendement"/);
  });
  it("la fiche la place entre le dividende et les actionnaires, et lui passe la mention", () => {
    const a = lire(`${dir}/FicheAction.tsx`);
    expect(a, "la valorisation n'est plus tirée des cotations et des comptes").toMatch(/serieDeValorisation\(\[\.\.\.quotes\]\.reverse\(\)\.map\(\(q\) => \(\{ d: q\.sessionDate, c: q\.close, titres: q\.sharesTotal, flottants: q\.sharesFloat, valeur: q\.valueTraded \}\)\)/);
    expect(a, "la valorisation n'est plus comptée parmi les sections de l'onglet").toMatch(/valorisation\.length >= 2 \? "valorisation" : ""/);
    expect(a, "la mention n'est plus passée à la valorisation").toMatch(/<GraphesDeValorisation serie=\{valorisation\}[\s\S]*?fin=\{fin\("valorisation"\)\} \/>/);
  });
  it("l'axe d'un rapport part de zéro, une valeur absente coupe la courbe, l'exercice entre en vigueur le 1er avril à défaut de date", () => {
    const g = lire("src/components/GrapheDeSerie.tsx");
    expect(g, "l'axe d'un rapport ne part plus de zéro").toMatch(/ticksPropres\(0, Math\.max\(\.\.\.valeurs, 0\.0001\), 4\)/);
    expect(g, "une valeur absente ne coupe plus la courbe").toMatch(/if \(v == null\) return;/);
    expect(lire("src/lib/market/valorisation.ts"), "l'exercice n'entre plus en vigueur le 1er juillet").toMatch(/entreeParDefaut = \(annee: number\): string => `\$\{annee \+ 1\}-04-01`/);
  });
});

describe("les graphes de la fiche : lecture au toucher, années sur l'axe, « i » sur les sections, retour en haut d'onglet (9 novembre 2026)", () => {
  const lectures = ["src/components/CourbeDuCours.tsx", "src/components/GrapheDeSerie.tsx", "src/components/GrapheComptes.tsx"];

  it("chaque graphe de la fiche lit un point par une bulle noire posée au-dessus du dessin, sans cacher le point ni déplacer le tracé", () => {
    for (const f of lectures) {
      const c = lire(f);
      expect(c, `${f} : la bulle noire n'est plus posée`).toMatch(/<BulleNoire lecture=\{lecture\}/);
      expect(c, `${f} : le suivi du doigt n'est plus posé sur le dessin`).toMatch(/\{\.\.\.handlers\}/);
    }
    const b = lire("src/components/charts/lecture.module.css").match(/\.bulle \{([^}]*)\}/)?.[1] ?? "";
    expect(b, "la bulle n'est plus en absolu, au-dessus du dessin").toMatch(/position: absolute;\s*bottom: calc\(100% \+ var\(--s-3\)\);/);
    expect(b, "la bulle n'est plus noire").toMatch(/background: var\(--bulle-bg\);/);
    expect(b, "la bulle capte de nouveau le doigt").toMatch(/pointer-events: none;/);
    for (const f of ["CourbeDuCours", "GrapheDeSerie", "GrapheComptes"]) expect(lire(`src/components/${f}.module.css`), `${f} : le défilement vertical n'est plus laissé à la page`).toMatch(/touch-action: pan-y;/);
  });
  it("l'axe des dates porte TOUJOURS l'année : aucun graphe de la fiche n'écrit « jour mois » seuls", () => {
    for (const f of ["src/components/CourbeDuCours.tsx", "src/components/GrapheDeSerie.tsx"]) expect(lire(f), `${f} : une date de l'axe est écrite sans son année`).not.toMatch(/fmtDate\([^)]*, false\)/);
    expect(lire("src/components/NavChart.tsx"), "l'axe des VL n'écrit l'année que sur les longues périodes").toMatch(/label: \(d: string\) => fmtDate\(d\) \}/);
    expect(lire("src/components/CompareCharts.tsx"), "l'axe du comparateur n'écrit l'année que sur les longues périodes").toMatch(/\{fmtDate\(d\)\.replace\(\/\^1 \/, ""\)\}/);
    expect(lire("src/components/market/IndiceEtNegoce.tsx"), "les mois de l'axe de l'indice n'ont plus leur année au premier repère et en janvier").toMatch(/motDeMois\(p\.on, out\.length === 0 \|\| cle\.slice\(5\) === "01"\)/);
    expect(lire("src/components/mobile/CardBack.tsx"), "les dates de la courbe du dos de carte ont perdu leur année").not.toMatch(/fmtDate\(curve\.(from|to), false\)/);
  });
  it("chaque section de la fiche d'une action a son « i »", () => {
    const dir = "src/app/offres/[id]";
    const a = lire(`${dir}/FicheAction.tsx`);
    expect((a.match(/info=\{t\("/g) ?? []).length, "une section de l'action a perdu son « i »").toBeGreaterThanOrEqual(9);
    expect(a, "les chiffres clés ont perdu le « i » qui porte aussi le calcul du rendement").toMatch(/<Bloc pane="essentiel" titre=\{t\("Chiffres clés"\)\} info=\{infoChiffresCles\}>/);
    expect(a, "le « i » des chiffres clés ne dit plus le calcul du rendement").toMatch(/\.\.\.calcul\.lines\.map\(\(\[k, v\]\) => `• \$\{t\(k\)\} : \$\{t\(v\)\}`\)/);
    expect(a, "les actionnaires ont retrouvé un « i »").toMatch(/<Bloc pane="emetteur" titre=\{t\("Actionnaires"\)\} fin=\{fin\("actionnaires"\)\}>/);
    expect(a, "les bulletins de la cote sont revenus dans les documents").toMatch(/const documents = o\.documents\.filter\(\(d\) => !\/\^bulletin\\b\/i\.test\(d\.name\)\);/);
    expect(a, "la section Documents n'a plus son « i »").toMatch(/<h3>\s*\{t\("Documents"\)\}\s*<Info text=/);
    const v = lire(`${dir}/GraphesDeValorisation.tsx`);
    expect((v.match(/<Enveloppe\b[^>]*\binfo=/g) ?? []).length, "une section de valorisation a perdu son « i »").toBe(3);
    expect(v, "les indicateurs n'ont plus leur « i »").toMatch(/<Enveloppe key=\{ind\.cle\} pane=\{pane\} panneau=\{panneau\} titre=\{ind\.titre\} info=\{ind\.info\}>/);
  });
  it("changer d'onglet page défilée ramène en haut du nouvel onglet, sous la bande", () => {
    const f = lire("src/components/mobile/FichePanes.tsx");
    expect(f, "le retour en haut d'onglet n'est plus calculé").toMatch(/const cible = cibleEnHaut\(premiere\.getBoundingClientRect\(\)\.top \+ window\.scrollY, collage, bande\.offsetHeight, ecart\);/);
    expect(f, "la page défilée ne revient plus en haut").toMatch(/if \(fautRevenirEnHaut\(m\.scrollY, cible\)\) \{\s*defilerVers\(cible, racine\.current\);\s*return;\s*\}/);
    expect(f, "« garder la place » n'a plus la main quand la page n'a pas défilé jusqu'à la bande").toMatch(/\}\s*restituer\(m, barre\(\), racine\.current\);/);
  });
});

describe("quand un exercice entre en vigueur : la date existante, celle du desk, le 1er avril (9 novembre 2026)", () => {
  it("l'ordre est celui du client, et le desk peut saisir la date sans perdre la date existante", () => {
    const v = lire("src/lib/market/valorisation.ts");
    expect(v, "l'ordre des dates a changé").toMatch(/if \(f\.publieLe && JOUR\.test\(f\.publieLe\)\) return f\.publieLe;\s*if \(f\.publieLeDesk && JOUR\.test\(f\.publieLeDesk\)\) return f\.publieLeDesk;\s*return entreeParDefaut\(f\.year\);/);
    const c = lire("src/data/companies.ts");
    expect(c, "la date existante n'est plus un champ des comptes").toMatch(/publieLe\?: string;/);
    expect(c, "la date du desk n'est plus un champ des comptes").toMatch(/publieLeDesk\?: string;/);
    const f = lire("src/app/desk/referentiel/FicheForm.tsx");
    expect(f, "le desk ne peut plus saisir la date de publication").toMatch(/<input type="date" value=\{f\.publieLeDesk\}/);
    expect(f, "la fiche réécrite par le desk perd la date existante").toMatch(/\.\.\.\(f\.publieLe \? \{ publieLe: f\.publieLe \} : \{\}\),/);
    const a = lire("src/app/offres/[id]/FicheAction.tsx");
    expect(a, "les dates ne sont plus passées à la valorisation").toMatch(/publieLe: f\.publieLe, publieLeDesk: f\.publieLeDesk/);
    expect(a, "l'avertissement du résultat net n'est plus sous la performance financière").toMatch(/comptes\.some\(\(f\) => f\.netIncome > f\.revenue\) && <p className=\{fa\.note\}>\{t\("Le résultat net dépasse le chiffre d'affaires publié/);
  });
});

describe("retouches du 9 novembre 2026 (soir) : en-tête sans « ? », liste de période stable, axes lisibles", () => {
  it("l'en-tête de la fiche n'a plus de point d'interrogation : sans profil, le repère ne paraît pas", () => {
    const h = lire("src/components/HorizonMark.tsx");
    expect(h, "le repère sans profil est revenu dans l'en-tête").toMatch(/if \(!hasProfile\) return null;/);
    expect(lire("src/components/HorizonMark.module.css"), "la classe du « ? » est restée").not.toMatch(/\.none \{/);
  });
  it("changer de période ne déplace rien : la liste a une largeur fixe et sans libellé visible, la pastille rogne", () => {
    const c = lire("src/components/CourbeDuCours.module.css");
    expect(c.match(/\.entete \{([^}]*)\}/)?.[1] ?? "", "la ligne de la pastille et de la liste n'est plus à deux colonnes").toMatch(/grid-template-columns: minmax\(0, 1fr\) var\(--largeur-liste\);/);
    expect(c.match(/\.choix \{([^}]*)\}/)?.[1] ?? "", "la liste n'a plus sa largeur fixe").toMatch(/width: var\(--largeur-liste\);/);
    expect(c.match(/\.variation \{([^}]*)\}/)?.[1] ?? "", "la pastille ne rogne plus").toMatch(/text-overflow: ellipsis;/);
    expect(lire("src/components/CourbeDuCours.tsx"), "la liste du cours écrit de nouveau son libellé dans le bouton").toMatch(/libelleVisible=\{false\}/);
    expect(lire("src/app/offres/[id]/GraphesDeValorisation.tsx"), "la liste de durée écrit de nouveau son libellé dans le bouton").toMatch(/libelleVisible=\{false\}/);
    expect(lire("src/app/offres/[id]/FicheAction.module.css").match(/\.entete \{([^}]*)\}/)?.[1] ?? "", "l'en-tête des cartes de valorisation n'est plus à deux colonnes").toMatch(/grid-template-columns: minmax\(0, 1fr\) var\(--largeur-liste\);/);
  });
  it("les repères d'un axe ne se superposent jamais : un graphe de mois écrit ceux qui tiennent", () => {
    const g = lire("src/components/GrapheComptes.tsx");
    expect(g, "l'axe des mois n'est plus éclairci").toMatch(/const reperes = reperesSansChevauchement\(annees\.map\(\(_, j\) => cx\(j\)\), annees\);/);
    expect(g, "les repères sont de nouveau tous écrits").toMatch(/\{annees\.map\(\(a, j\) => \(reperes\[j\] \? \(/);
  });
  it("trois repères de dates sur téléphone pour l'axe des valeurs liquidatives : avec l'année, quatre se touchent", () => {
    expect(lire("src/components/NavChart.tsx")).toMatch(/axisTicks\(dates\.length, phone \? 3 : long \? 5 : 6\)/);
  });
});

describe("la fiche d'un fonds, calquée sur celle d'un titre (10 novembre 2026, planche 1A · 2B · 3A · 4A)", () => {
  const dir = "src/app/offres/[id]";
  const fonds = () => lire(`${dir}/FicheFonds.tsx`);
  const courbe = () => lire("src/components/CourbeDeLaVL.tsx");
  const bloc = (c: string, selecteur: string) => c.match(new RegExp(`(?:^|\\n)${selecteur.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]*)\\}`))?.[1] ?? "";
  it("le client lit la fiche du fonds, le desk garde la sienne, et la bande renomme l'onglet de la société", () => {
    const r = lire(`${dir}/FicheReading.tsx`);
    expect(r, "la fiche du fonds n'est plus rendue chez le client seulement").toMatch(/if \(mode !== "desk" && o\.kind === "FONDS" && o\.fund\) \{[\s\S]*?<FicheFonds o=\{o\} data=\{data\} \/>/);
    expect(r, "l'onglet de la société ne s'appelle plus « Société de gestion »").toMatch(/exclure=\{\["calendrier", "chiffres"\]\} libelles=\{\{ emetteur: "Société de gestion" \}\}/);
    expect(lire("src/components/mobile/FichePanes.tsx"), "la bande ne lit plus les libellés propres à la ligne").toMatch(/\{t\(libelles\[k\] \?\? label\)\}/);
  });
  it("l'Essentiel enchaîne Évolution et Chiffres clés ; plus d'« Investir » ni de simulateur ; la société est un onglet", () => {
    const f = fonds();
    const ordre = ["titre={t(\"Évolution\")}", "titre={t(\"Chiffres clés\")}", "titre={t(\"Société de gestion\")}"].map((x) => f.indexOf(x));
    expect(ordre.every((i) => i > 0), "une section de la fiche a disparu ou a changé de nom").toBe(true);
    expect([...ordre].sort((a, b) => a - b), "les sections ne sont plus dans l'ordre de Titres").toEqual(ordre);
    expect(f, "la carte « Investir » ou le simulateur est revenu").not.toMatch(/titre=\{t\("Investir"\)\}|info\/simulateur/);
    expect(f, "la performance sur douze mois n'est plus le chiffre majeur doré, daté").toMatch(/<Majeur etiquette=\{perf\.etiquette\} valeur=\{signe\(perf\.v\)\} or sous=\{f\.perf1yPct != null \? t\("sur les 12 mois jusqu'au \{d\} · chiffre du bulletin"/);
    expect(f, "l'annualisé depuis la création n'est plus une tuile datée").toMatch(/t\("Rendement annualisé depuis le \{d\}", \{ d: fmtDate\(f\.inceptionDate\) \}\)/);
    expect(f, "les droits d'entrée sont revenus dans les chiffres clés (choix : sans)").not.toMatch(/entryFeePct/);
    expect(f, "la société n'est plus dans l'onglet « emetteur »").toMatch(/<Bloc pane="emetteur" titre=\{t\("Société de gestion"\)\}/);
    expect(f, "les frais à la sortie ne sont plus écrits").toMatch(/Frais du fonds à la sortie/);
    expect(f, "une commission du desk est montrée au client").not.toMatch(/commission/i);
    expect(f, "la fiche du fonds justifie d'où vient la donnée").not.toMatch(/Source : /);
  });
  it("l'onglet Société de gestion range ses voisins : les autres fonds de la société, puis les autres sociétés, la plus fournie d'abord", () => {
    const f = fonds();
    const ordre = ['titre={t("Société de gestion")}', 'titre={t("Autres fonds de cette société")}', 'titre={t("Autres sociétés de gestion")}'].map((x) => f.indexOf(x));
    expect(ordre.every((i) => i > 0), "une des trois sections de la société a disparu ou changé de nom").toBe(true);
    expect([...ordre].sort((a, b) => a - b), "les sections de la société ne sont plus dans l'ordre").toEqual(ordre);
    expect(f, "une société ne mène plus à la liste de ses fonds").toMatch(/href=\{`\/fonds\?gestion=\$\{encodeURIComponent\(s2\.nom\)\}`\}/);
    expect(f, "un fonds voisin ne mène plus à sa fiche").toMatch(/href=\{`\/offres\/\$\{x\.id\}`\}/);
    const r = lire(`${dir}/FicheReading.tsx`);
    expect(r, "le lien d'une société n'est plus le nom que la liste des fonds filtre : « /fonds?gestion=… » ne ramène aucun fonds").toMatch(/parSociete\.set\(k, \{ nom: x\.issuer, n:/);
    expect(lire("src/app/fonds/FondsBody.tsx"), "la liste des fonds ne filtre plus sur l'émetteur : le lien d'une société doit changer avec elle").toMatch(/manager: o\.issuer,/);
    expect(r, "les fonds de la société ne sont plus pris sur la clef normalisée du nom").toMatch(/cleDeGestionnaire\(x\.fund!\.manager\) === cle\)/);
    expect(r, "les sociétés ne sont plus rangées par nombre de fonds").toMatch(/\.sort\(\(a, b\) => b\.n - a\.n \|\| a\.nom\.localeCompare\(b\.nom, "fr"\)\)/);
  });
  it("les documents d'un fonds ne portent pas les bulletins, et la rubrique n'existe que s'il reste une pièce", () => {
    const f = fonds();
    expect(f, "les bulletins de la cote sont de nouveau des documents du fonds").toMatch(/const documents = o\.documents\.filter\(\(d\) => !estUnBulletin\(d\)\);/);
    expect(f, "la rubrique « Documents » s'écrit sans pièce").toMatch(/\{documents\.length > 0 && \(\s*<section className=\{styles\.sec\} data-pane="docs">/);
    expect(lire("src/lib/fiche-volets.ts"), "l'onglet « Documents » d'un fonds sans pièce n'est plus masqué").toMatch(/\? \["docs"\] : \[\]/);
  });
  it("la clef interne d'un fonds ne s'écrit plus sous le titre : un fonds n'a pas d'ISIN", () => {
    expect(lire("src/components/LineIdentity.tsx"), "la clef du fonds est de nouveau écrite comme un ISIN").toMatch(/\{isin && o\.kind !== "FONDS" && <span className=\{styles\.isin\}>/);
  });
  it("l'en-tête d'Évolution suit la mesure, et réserve sa hauteur", () => {
    const c = courbe();
    expect(c, "le chiffre du haut ne suit plus la mesure").toMatch(/mesureLue === "vl" \? \([\s\S]*?\) : mesureLue === "rendement" \? \([\s\S]*?\) : \(/);
    expect(c, "l'en-tête n'est plus dans la cellule qui réserve sa hauteur").toMatch(/<div className=\{styles\.enteteMesure\}>\{entete\}<\/div>/);
    expect(bloc(lire("src/components/CourbeDuCours.module.css"), ".enteteMesure"), "l'en-tête ne réserve plus sa hauteur : la carte saute au changement de mesure").toMatch(/min-height: 6rem;/);
  });
  it("la société de gestion montre le siège et l'agrément lus dans la liste de la COSUMAF ou saisis au desk, jamais inventés", async () => {
    const f = fonds();
    expect(f, "le siège n'est plus lu de la saisie du desk").toMatch(/if \(gestionnaire\?\.siege\) tuilesGestion\.push\(\[t\("Siège"\), gestionnaire\.siege\]\);/);
    expect(f, "le numéro d'agrément n'est plus lu de la saisie du desk").toMatch(/if \(gestionnaire\?\.agrementNo\) tuilesGestion\.push\(\[t\("N° d'agrément"\), gestionnaire\.agrementNo\]\);/);
    expect(f, "la date d'agrément n'est plus lue de la saisie du desk").toMatch(/if \(gestionnaire\?\.agrementDate\) tuilesGestion\.push\(\[t\("Date d'agrément"\), fmtDate\(gestionnaire\.agrementDate\)\]\);/);
    const { GESTIONNAIRES, cleDeGestionnaire } = await import("@/data/gestionnaires");
    expect(GESTIONNAIRES.length, "la liste livrée a changé : relire la source COSUMAF").toBe(15);
    for (const g of GESTIONNAIRES) {
      expect(g.key, `${g.name} : la clef n'est plus celle du nom de bulletin`).toBe(cleDeGestionnaire(g.name));
      expect(g.source, `${g.name} est livrée sans source`).toMatch(/COSUMAF.*Essentiel.*2e semestre 2025/);
      expect(g.verifiedOn, `${g.name} est livrée sans jour de relecture`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(g.agrementNo, `${g.name} : le numéro d'agrément n'a pas la forme de la COSUMAF`).toMatch(/^(MFAC|COSUMAF)-SGO?P(C)?-\d{2}\/\d{4}$/);
      expect(g.agrementDate, `${g.name} : la date d'agrément n'est pas une date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(g.siege, `${g.name} : le siège manque`).toMatch(/, (Cameroun|Congo|Gabon)$/);
    }
    expect(new Set(GESTIONNAIRES.map((g) => g.key)).size, "deux entrées portent la même clef").toBe(GESTIONNAIRES.length);
    const harvest = GESTIONNAIRES.find((g) => g.key === "harvest-asset-management");
    expect([harvest?.siege, harvest?.agrementNo, harvest?.agrementDate], "Harvest ne dit plus ce que la liste de la COSUMAF dit").toEqual(["Douala, Cameroun", "MFAC-SGP-01/2017", "2017-12-14"]);
    const ess = GESTIONNAIRES.find((g) => g.key === "ess-asset-management");
    expect([ess?.siege, ess?.agrementNo, ess?.agrementDate], "ESS ne dit plus ce que la liste dit d'« Emrald Securities Services » (confirmé par le client)").toEqual(["Douala, Cameroun", "COSUMAF-SGP-05/2021", "2021-12-16"]);
    expect(cleDeGestionnaire("AFRICA BRIGHT ASSET MANAGEMENT")).toBe(cleDeGestionnaire("Africa  Bright Asset-Management"));
    expect(cleDeGestionnaire("Société Générale Gestion")).toBe("societe-generale-gestion");
    expect(lire("src/app/desk/referentiel/page.tsx"), "l'onglet du desk liste deux graphies d'une même société comme deux sociétés").toMatch(/if \(o\.kind === "FONDS" && o\.fund && !parCle\.has\(cleDeGestionnaire\(o\.fund\.manager\)\)\) parCle\.set\(/);
    const a = lire("src/app/desk/referentiel/actions.ts");
    expect(a, "une société de gestion s'enregistre sans source").toMatch(/source: z\.string\(\)\.trim\(\)\.min\(5, "Source requise/);
    expect(a, "la saisie ne passe plus par le brouillon et le journal d'audit").toMatch(/saveReferenceDraft\(REF\.gestionnaires, key, \{ op: "set", data \}, desk\.name\);\s*await audit\("reference\.draft"/);
  });
  it("la courbe a trois mesures en commutateur à plat et une seule liste des huit périodes, sans dates libres", () => {
    const c = courbe();
    expect(c, "les trois mesures ont changé").toMatch(/\["vl", "Valeur"\],\s*\["rendement", "Rendement"\],\s*\["placement", "1 M placés"\]/);
    expect(c, "la liste n'est plus celle des huit périodes de Titres").toMatch(/const lectures = PERIODES\.map\(\(p\) => lirePeriode\(points, p\.cle\)\);/);
    expect(c, "la liste a retrouvé un libellé visible : elle élargit la ligne").toMatch(/libelleVisible=\{false\}/);
    expect(c, "des dates libres sont revenues").not.toMatch(/type="date"/);
    expect(c, "le rendement ne passe plus par finance.ts").toMatch(/rendementAnnualisePct\(f\.nav, l\.nav, jours\)/);
    expect(c, "la mention des performances passées n'est plus écrite sous les chiffres").toMatch(/<p className=\{styles\.garde\}>\{t\("Performances passées non garanties"\)\}/);
    expect(c, "la bulle noire n'est plus posée sur la courbe").toMatch(/<BulleNoire lecture=\{lecture\}/);
    expect(c, "le comparatif BTA est revenu sur la courbe d'un fonds (retiré à la demande du client le 10 novembre 2026)").not.toMatch(/benchmark|BTA|referenceLigne/);
    expect(lire("src/components/CourbeDuCours.module.css").match(/\.commutateur button \{([^}]*)\}/)?.[1] ?? "", "le commutateur est plus haut que le sélecteur de période (34 px)").toMatch(/min-height: 30px;/);
    expect(lire("src/components/CourbeDuCours.module.css"), "le commutateur n'a plus de piste à trois colonnes").toMatch(/\.commutateur \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
  });
  it("un fonds jeune a un rendement non annualisé, et la ligne le dit : le bouton n'est jamais grisé", () => {
    const c = courbe();
    expect(c, "le seuil d'historique du rendement n'est plus calculé de la plus courte fenêtre").toMatch(/const JOURS_MINI = Math\.ceil\(FENETRES\[FENETRES\.length - 1\] \* 1\.2\);/);
    expect(c, "le rendement d'un fonds jeune n'est plus l'écart avec la première VL").toMatch(/: cumule\s*\? fenetreNav\.map\(\(p\) => \(\{ d: p\.date, y: fenetreNav\[0\]\.nav > 0 \? \(p\.nav \/ fenetreNav\[0\]\.nav - 1\) \* 100 : 0, nav: p\.nav \}\)\)/);
    expect(c, "le rendement d'un fonds jeune n'est plus étiqueté non annualisé").toMatch(/t\("Rendement depuis le \{d\} · non annualisé"/);
    expect(c, "le bouton « Rendement » est de nouveau grisé pour un fonds jeune").not.toMatch(/disabled=\{m === "rendement"/);
    expect(c, "la ligne qui explique le rendement d'un fonds jeune a disparu").toMatch(/\{!rendementPossible && <p className=\{styles\.indisponible\}>\{t\("Fonds de \{n\} jours : le rendement glissant demande \{mini\} jours/);
  });
  it("la légende réserve ses deux lignes, et l'unité de l'axe est posée au-dessus de la première graduation", () => {
    expect(courbe(), "la légende n'est plus celle qui réserve sa hauteur").toMatch(/className=\{`\$\{styles\.legende\} \$\{styles\.legendeFixe\}`\}/);
    expect(bloc(lire("src/components/CourbeDuCours.module.css"), ".legendeFixe"), "la légende ne réserve plus deux lignes : la carte saute au changement de mesure").toMatch(/min-height: 2lh;/);
    expect(courbe(), "le tracé démarre trop haut : « FCFA » touche la graduation du haut").toMatch(/const y = \(v: number\) => 18 \+ \(haut === bas \? \(bas0 - 18\) \/ 2 : \(1 - \(v - bas\) \/ \(haut - bas\)\) \* \(bas0 - 18\)\);/);
  });
  it("la hauteur rendue à un onglet court reste en bas : la pile ne s'étire pas ligne par ligne", () => {
    expect(lire(`${dir}/page.module.css`).match(/\n\.main \{([^}]*)\}/)?.[1] ?? "", "le vide d'un onglet court s'ouvre de nouveau entre l'en-tête et la barre d'onglets").toMatch(/align-content: start;/);
  });
  it("la société de gestion s'écrit en identité, pas en chiffre majeur", () => {
    expect(fonds(), "le nom de la société est de nouveau un chiffre majeur").toMatch(/<div className=\{fa\.identite\}>[\s\S]*?<b>\{f\.manager\}<\/b>/);
  });
});
