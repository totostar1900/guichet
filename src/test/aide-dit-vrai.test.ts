import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PUBLIC_DOCS } from "@/data/docs";
import { LESSONS } from "@/data/lessons";
import { AIDE_PAGES } from "@/lib/nav-groups";

const ROOT = resolve(__dirname, "../..");
const lire = (p: string) => readFileSync(join(ROOT, p), "utf8");

/** Le source sans ses notes : un commentaire raconte le passé, il ne le contredit pas. */
export const sansNotes = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * L'AIDE DIT-ELLE VRAI SUR L'APPLICATION ?
 *
 * ─── Ce que « docs-exactes » ne voit pas ────────────────────────────────────
 *
 * « docs-exactes » compte des gestes, des migrations, des tâches planifiées :
 * ce qu'une page de doctrine peut vérifier contre le code sans rien savoir de
 * l'écran. Il ne sait pas lire « La barre du bas donne cinq sièges :
 * Portefeuille, Instruments, Trade, Marché, Aide » et la comparer au dock.
 *
 * C'était pourtant la page que le CLIENT lit. Relevée le 31 octobre 2026 en la
 * reprenant comme on avait repris le sondage :
 *
 *   « cinq sièges … Portefeuille, Instruments » — quatre, depuis que Trade a
 *   absorbé Instruments, et le premier s'appelle Accueil ;
 *   « Portefeuille › Mes documents », deux fois — c'est Accueil ;
 *   « Votre compte › Mon profil » — la page s'appelle Profil d'investisseur,
 *   et « Profil » est une autre page (nom, ville, canaux) ;
 *   « le bouton Filtrer · Trier » — il porte « Revenir aux filtres » sur les
 *   fonds ;
 *   « huit éclairages de deux minutes » — la page en affiche cinq de deux
 *   minutes et trois de trois, sur le même écran.
 *
 * Une page publique ne casse rien quand elle ment : on la lit, on la croit, et
 * l'on cherche un onglet qui n'existe plus. C'est la même panne que celle que
 * « docs-exactes » nomme dans son premier paragraphe, sur une famille de
 * faits qu'il ne lit pas.
 *
 * ─── Ce que cette feuille tient ────────────────────────────────────────────
 *
 * La vérité est LUE, jamais recopiée : le dock dans « MobileShell », les
 * étiquettes de page dans « nav-groups », les durées dans « lessons ». Une
 * liste de noms écrite ici se périmerait au premier renommage, et c'est
 * exactement la panne qu'on garde.
 */
const AIDE = "src/data/docs/aide.ts";

/** Les paires « français / anglais » que le fichier écrit en `l("…", "…")`. */
export function paires(source: string): { fr: string; en: string }[] {
  return [...source.matchAll(/l\("((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\)/g)].map((m) => ({ fr: m[1].replace(/\\"/g, '"'), en: m[2].replace(/\\"/g, '"') }));
}

/** Les sièges du dock, dans leur ordre : la propriété « label » de chaque entrée, suivie de « icon ». */
export function siegesDuDock(shell: string): string[] {
  return [...sansNotes(shell).matchAll(/label:\s*t\("([^"]+)"\),\s*icon/g)].map((m) => m[1]);
}

/** Les étiquettes de page que « nav-groups » déclare. */
export function etiquettesDePages(navGroups: string): string[] {
  return [...sansNotes(navGroups).matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
}

const MOTS: Record<string, number> = { un: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10 };
const EN_MOTS: Record<number, string> = Object.fromEntries(Object.entries(MOTS).map(([m, n]) => [n, m]));

/** « quatre sièges : A, B, C, D. » → { n: 4, noms: [A, B, C, D] } */
export function annonceDeSieges(texte: string): { n: number; noms: string[] }[] {
  return [...texte.matchAll(/\b(un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix) sièges : ([^.]+)\./g)].map((m) => ({ n: MOTS[m[1]], noms: m[2].split(", ").map((x) => x.trim()) }));
}

/**
 * Chaque « X › Y ».
 *
 * DEUX SAUTS, ET DEUX EXIGENCES DIFFÉRENTES — c'est ce que la première
 * écriture n'avait pas, et un relevé lâche l'a laissé passer.
 *
 * APRÈS UN SIÈGE OU « VOTRE COMPTE », on arrive sur une PAGE : le nom doit
 * être une étiquette de « nav-groups ». C'est là que « Cet appareil » se
 * cachait : la page s'appelle « Paramétrages » depuis le 28 octobre, mais
 * « Cet appareil » reste écrit ailleurs dans l'application — comme nom par
 * défaut d'un appareil enregistré. Un relevé qui accepte tout mot écrit
 * quelque part l'acceptait. Vérifié en le laissant faire : il rendait vert.
 *
 * APRÈS UNE PAGE, on arrive sur ce qu'elle porte — un bouton, une section —
 * et il n'existe pas de table des boutons : le nom doit alors être écrit
 * quelque part dans l'application. C'est plus lâche, et c'est tout ce qu'on
 * peut garder sans écrire la liste à la main.
 */
export function cheminsInconnus(texte: string, lieux: string[], pages: string[], litteraux: Set<string>): string[] {
  const fautes: string[] = [];
  for (const m of texte.matchAll(/ › /g)) {
    const i = m.index!;
    const avant = texte.slice(Math.max(0, i - 40), i);
    const apres = texte.slice(i + 3, i + 3 + 40);
    if (lieux.some((l) => avant.endsWith(l))) {
      if (!pages.some((p) => apres.startsWith(p))) fautes.push(`« … › ${apres.split(/[,;:.] /)[0]} » : aucune page ne porte ce nom`);
    } else if (pages.some((p) => avant.endsWith(p))) {
      if (![...litteraux].some((x) => x.length >= 4 && apres.startsWith(x))) fautes.push(`« … › ${apres.split(/[,;:.] /)[0]} » : l'application n'écrit ce nom nulle part`);
    } else fautes.push(`« ${avant.trim().split(" ").slice(-2).join(" ")} › … » : ce n'est ni un siège ni une page`);
  }
  return fautes;
}

/** Les durées que le texte annonce pour un éclairage : « de deux minutes », « de deux à trois minutes ». */
export function dureesAnnoncees(texte: string): { de: number; a: number }[] {
  const mot = "(un|deux|trois|quatre|cinq)";
  return [...texte.matchAll(new RegExp(`éclairages? (?:de|se lit en) ${mot}(?: à ${mot})? minutes?`, "g"))].map((m) => ({ de: MOTS[m[1]], a: MOTS[m[2] ?? m[1]] }));
}

/** Ce que l'application écrit entre guillemets, hors docs, traductions et épreuves. */
export const litteraux = (): Set<string> => {
  const out = new Set<string>();
  const marche = (d: string) => {
    for (const e of readdirSync(join(ROOT, d), { withFileTypes: true })) {
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) {
        if (["test", "i18n"].includes(e.name) || p === "src/data/docs") continue;
        marche(p);
      } else if (/\.tsx?$/.test(e.name)) {
        for (const m of sansNotes(lire(p)).matchAll(/"((?:[^"\\\n]|\\.){2,60})"|'((?:[^'\\\n]|\\.){2,60})'|`([^`\n$]{2,60})`/g)) out.add(m[1] ?? m[2] ?? m[3]);
      }
    }
  };
  marche("src");
  return out;
};


/** Les suites de `k` mots, sans accents ni ponctuation : ce que deux descriptions peuvent se partager. */
const suites = (texte: string, k: number): Set<string> => {
  const mots = texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + k <= mots.length; i++) out.add(mots.slice(i, i + k).join(" "));
  return out;
};

/** Les paires de descriptions qui partagent une même suite de quatre mots. */
export function recouvrements(descriptions: { nom: string; texte: string }[], k = 4): string[] {
  const fautes: string[] = [];
  for (let i = 0; i < descriptions.length; i++) {
    for (let j = i + 1; j < descriptions.length; j++) {
      const a = suites(descriptions[i].texte, k);
      const communes = [...suites(descriptions[j].texte, k)].filter((x) => a.has(x));
      if (communes.length) fautes.push(`${descriptions[i].nom} ⟷ ${descriptions[j].nom} : « ${communes[0]} »${communes.length > 1 ? ` (+${communes.length - 1})` : ""}`);
    }
  }
  return fautes;
}

describe("les sièges de l'aide sont ceux du dock", () => {
  const dock = siegesDuDock(lire("src/components/mobile/MobileShell.tsx"));
  const fr = paires(lire(AIDE));

  it("annonce le bon nombre de sièges, et les nomme dans l'ordre du dock", () => {
    /* NON VACUITÉ, D'ABORD : le dock a bien été lu. Un motif qui ne trouve
       plus aucun siège rendrait « aucune annonce fausse » — c'est ce que
       répond aussi une page irréprochable. */
    expect(dock, "le dock n'a pas été relu : le motif ne trouve plus ses étiquettes").toEqual(["Accueil", "Trade", "Marché", "Aide"]);
    const annonces = fr.flatMap((p) => annonceDeSieges(p.fr));
    expect(annonces.length, "la page ne dit plus combien de sièges porte la barre du bas : la clause ne garde plus rien").toBeGreaterThan(0);
    for (const a of annonces) {
      expect(a.noms, `la page nomme ${a.n} sièges : ${a.noms.join(", ")} — le dock en porte ${dock.length}`).toEqual(dock);
      expect(a.n, "le compte annoncé n'est pas celui des noms qui le suivent").toBe(a.noms.length);
    }
  });

  it("dit la même chose en anglais : autant de sièges, autant de noms", () => {
    /* LES DEUX LANGUES SE TIENNENT. La correction d'un seul côté laisse un
       lecteur anglais devant l'ancienne barre. On ne compare pas les mots —
       « Home » pour « Accueil » est une traduction — mais le nombre. */
    for (const p of fr) {
      const a = annonceDeSieges(p.fr)[0];
      if (!a) continue;
      const en = /\b(\w+) seats: ([^.]+)\./.exec(p.en);
      expect(en, "la phrase anglaise n'annonce plus de sièges").toBeTruthy();
      expect(en![2].split(", ").length, `en anglais la barre porte ${en![2].split(", ").length} sièges, en français ${a.noms.length}`).toBe(a.noms.length);
      expect(EN_MOTS[a.n] && en![1], "le compte anglais n'est pas écrit en lettres").toBeTruthy();
    }
  });
});

describe("les chemins que l'aide cite existent", () => {
  /* LES LIEUX SONT LES SIÈGES, PAS LES PAGES : après un siège on arrive sur une
     page (nom strict), après une page sur ce qu'elle porte (nom écrit quelque
     part). Mettre les pages dans les lieux les rendait strictes toutes les
     deux, et « Sécurité › Ajouter cet appareil » tombait à tort. */
  const lieux = [...siegesDuDock(lire("src/components/mobile/MobileShell.tsx"))];
  const pages = etiquettesDePages(lire("src/lib/nav-groups.ts"));
  /* « VOTRE COMPTE » EST UN LIEU QU'AUCUNE TABLE NE PORTE : c'est le bouton de
     l'initiale, dans la barre du compte. On le lit donc là où il est écrit
     plutôt que de l'ajouter à la main. */
  if (sansNotes(lire("src/components/mobile/BarreDuCompte.tsx")).includes('t("Votre compte")')) lieux.push("Votre compte");

  it("ne cite « X › Y » que si X est un siège ou un lieu, et Y une page", () => {
    const fr = paires(lire(AIDE));
    const textes = fr.map((p) => p.fr);
    const connus = litteraux();
    const fautes = textes.flatMap((t) => cheminsInconnus(t, lieux, pages, connus));
    expect(fautes, `ces chemins ne mènent nulle part dans l'application :\n  ${fautes.join("\n  ")}`).toEqual([]);
    /* NON VACUITÉ : le relevé a vu des chemins. */
    expect(textes.reduce((n, t) => n + (t.match(/ › /g) ?? []).length, 0), "la page ne cite plus aucun chemin : la clause ne garde plus rien").toBeGreaterThanOrEqual(3);
    /* Et chaque chemin écrit en français l'est en anglais : une correction à
       un seul côté laisserait l'ancien nom à l'autre lecteur. */
    for (const p of fr) expect((p.en.match(/ › /g) ?? []).length, `« ${p.fr.slice(0, 50)}… » : le nombre de chemins diffère d'une langue à l'autre`).toBe((p.fr.match(/ › /g) ?? []).length);
  });

  it("et le relevé voit bien un chemin faux", () => {
    /* La fonction est PURE, et c'est ce qui permet de l'éprouver sans l'état
       du dépôt : trois formes à refuser, deux à laisser. */
    const L = ["Accueil", "Trade", "Votre compte"];
    const P = ["Mes documents", "Profil d'investisseur", "Sécurité", "Paramétrages"];
    const X = new Set(["Ajouter cet appareil", "Cet appareil"]); // « Cet appareil » existe ailleurs que comme page : c'est le piège
    expect(cheminsInconnus("dans Portefeuille › Mes documents et vous", L, P, X), "un siège disparu n'est plus refusé").toHaveLength(1);
    expect(cheminsInconnus("dans Votre compte › Mon profil : votre horizon", L, P, X), "une page inexistante n'est plus refusée").toHaveLength(1);
    expect(cheminsInconnus("dans Votre compte › Cet appareil.", L, P, X), "une page renommée passe parce que son ancien nom est écrit ailleurs").toHaveLength(1);
    expect(cheminsInconnus("dans Accueil › Mes documents et vous", L, P, X), "un chemin vrai est refusé : le relevé rendra de faux rouges").toEqual([]);
    expect(cheminsInconnus("dans Votre compte › Sécurité › Ajouter cet appareil", L, P, X), "un bouton d'une page est refusé").toEqual([]);
    expect(cheminsInconnus("dans Votre compte › Sécurité › Inventé", L, P, X), "un bouton inventé d'une page n'est plus refusé").toHaveLength(1);
    expect(cheminsInconnus("aucun chemin ici", L, P, X)).toEqual([]);
  });
});

describe("les boutons que l'aide nomme existent", () => {
  /** Les noms de boutons ou de pages cités entre « » : une majuscule, sans chiffre. Les exemples en minuscules sont des phrases, pas des noms. */
  const nomsCites = (texte: string): string[] => [...texte.matchAll(/«\s*([A-ZÉ][^»]{1,38}?)\s*»/g)].map((m) => m[1]).filter((x) => !/\d/.test(x));

  it("ne cite aucun nom de bouton ou de page que l'application ne porte pas", () => {
    const connus = litteraux();
    const cites = paires(lire(AIDE)).flatMap((p) => nomsCites(p.fr));
    const inconnus = [...new Set(cites.filter((c) => !connus.has(c)))];
    expect(inconnus, `ces noms ne sont écrits nulle part dans l'application :\n  « ${inconnus.join(" »\n  « ")} »`).toEqual([]);
    /* NON VACUITÉ, DES DEUX CÔTÉS : l'univers est vaste, et l'on a bien cité. */
    expect(connus.size, "le relevé des libellés de l'application n'a presque rien lu").toBeGreaterThan(3000);
    expect(cites.length, "la page ne cite plus aucun nom : la clause ne garde plus rien").toBeGreaterThan(15);
  });

  it("et le relevé voit bien un nom inventé", () => {
    expect(nomsCites("le bouton « Filtrer · Trier » en bas, puis « Suivre » ; « je souscris ce montant » n'en est pas un")).toEqual(["Filtrer · Trier", "Suivre"]);
    expect(nomsCites("« 93 % » et « i »")).toEqual([]);
  });
});

describe("les durées que l'aide annonce sont celles des éclairages", () => {
  const minutes = LESSONS.map((l) => l.minutes);
  const [min, max] = [Math.min(...minutes), Math.max(...minutes)];

  /** Le français que l'application écrit, hors traductions et épreuves, et hors son propre fichier. */
  const sources = (): { chemin: string; texte: string }[] => {
    const out: { chemin: string; texte: string }[] = [];
    const marche = (d: string) => {
      for (const e of readdirSync(join(ROOT, d), { withFileTypes: true })) {
        const p = `${d}/${e.name}`;
        if (e.isDirectory()) {
          if (["test", "i18n"].includes(e.name)) continue;
          marche(p);
        } else if (/\.tsx?$/.test(e.name)) out.push({ chemin: p, texte: sansNotes(lire(p)) });
      }
    };
    marche("src");
    return out;
  };

  it("ne promet pas une durée que les leçons ne tiennent pas", () => {
    expect([min, max], "les leçons n'ont plus de durée lue : la clause ne garde plus rien").not.toContain(Infinity);
    const fautes: string[] = [];
    let vues = 0;
    for (const { chemin, texte } of sources()) {
      for (const d of dureesAnnoncees(texte)) {
        vues++;
        if (d.de !== min || d.a !== max) fautes.push(`${chemin} · « de ${EN_MOTS[d.de]}${d.a !== d.de ? ` à ${EN_MOTS[d.a]}` : ""} minutes » — les leçons vont de ${EN_MOTS[min]} à ${EN_MOTS[max]}`);
      }
    }
    expect(fautes, `ces textes annoncent une durée que les leçons contredisent :\n  ${fautes.join("\n  ")}`).toEqual([]);
    /* Mesuré le 31 octobre 2026 : huit endroits. Le plancher est plus bas pour
       qu'une promesse retirée à bon escient ne fasse pas tomber la clause,
       mais assez haut pour qu'un motif aveugle ne passe pas. */
    expect(vues, "le relevé ne voit plus les durées annoncées : son zéro ne prouve rien").toBeGreaterThanOrEqual(6);
  });

  it("et les huit éclairages sont huit", () => {
    const premiers = LESSONS.filter((l) => !l.section);
    expect(premiers.length, "le premier parcours n'a plus huit leçons : « huit éclairages » est faux partout").toBe(8);
    const fautes: string[] = [];
    for (const { chemin, texte } of sources()) if (/\b(?:sept|neuf|dix|six) éclairages de/.test(texte)) fautes.push(chemin);
    expect(fautes, "un texte annonce un autre nombre d'éclairages que le premier parcours n'en porte").toEqual([]);
  });

  it("et le relevé voit bien une durée fausse", () => {
    expect(dureesAnnoncees("huit éclairages de deux minutes, et un éclairage de deux à trois minutes qui va avec")).toEqual([
      { de: 2, a: 2 },
      { de: 2, a: 3 },
    ]);
    expect(dureesAnnoncees("chaque éclairage se lit en deux à trois minutes")).toEqual([{ de: 2, a: 3 }]);
    expect(dureesAnnoncees("Votre profil financier en deux minutes"), "une durée qui n'est pas celle d'un éclairage est comptée").toEqual([]);
  });
});

describe("deux pages distinctes ne se décrivent pas pareil", () => {
  /**
   * « CE QUE LA MAISON FAIT, ET CE QU'ELLE NE FAIT PAS » décrivait la tuile
   * « Ce que Guichet fait pour vous » ; « ce que la maison ne promet pas, et ce
   * qu'elle ne fait pas » décrivait la ligne « Risques et limites ». Deux
   * descriptions presque identiques, deux pages, un seul siège : le lecteur
   * ne savait pas laquelle ouvrir, et la maison non plus, quand elle a dû dire
   * si c'étaient deux pages voulues. Elles le sont — l'une dit ce qu'est
   * Guichet, l'autre ce qu'une intention engage — et leurs descriptions le
   * disent maintenant chacune.
   *
   * LA RÈGLE EST GÉNÉRIQUE, parce que le cas ne l'est pas : une description
   * qui en recopie une autre est le premier signe que deux pages se
   * recouvrent. Quatre mots de suite, et non trois — « ce que la » et « et les
   * » reviennent dans toutes les phrases françaises, et un cliquet qui crie à
   * chaque article finit désarmé.
   */
  const descriptions = () => [
    ...AIDE_PAGES.map((p) => ({ nom: `la ligne « ${p.label} »`, texte: p.hint })),
    ...(PUBLIC_DOCS[0]?.chapters ?? []).filter((c) => c.promesse).map((c) => ({ nom: `la tuile « ${c.title.fr} »`, texte: c.promesse!.fr })),
  ];

  it("ne laisse aucune paire de descriptions du siège se recouvrir", () => {
    const d = descriptions();
    const fautes = recouvrements(d);
    expect(fautes, `ces descriptions se recouvrent : les deux pages disent-elles vraiment deux choses ?\n  ${fautes.join("\n  ")}`).toEqual([]);
    /* NON VACUITÉ : on a bien lu les sept lignes du siège et les huit tuiles de chapitre. */
    expect(d.length, "le relevé ne lit plus les descriptions du siège : son zéro ne prouve rien").toBeGreaterThanOrEqual(14);
  });

  it("et le relevé voit bien deux descriptions qui se recouvrent", () => {
    const avant = [
      { nom: "tuile", texte: "ce que la maison fait, et ce qu'elle ne fait pas" },
      { nom: "ligne", texte: "ce que la maison ne promet pas, et ce qu'elle ne fait pas" },
    ];
    expect(recouvrements(avant), "l'ancien recouvrement n'est plus vu").toHaveLength(1);
    const apres = [
      { nom: "tuile", texte: "ce qu'est Guichet, et ce qu'il ne fait pas à votre place" },
      { nom: "ligne", texte: "ce qu'une intention engage, la limite de chaque opération, les risques, et comment réclamer" },
    ];
    expect(recouvrements(apres), "deux descriptions distinctes sont prises pour un recouvrement : le relevé criera à chaque article").toEqual([]);
  });
});
