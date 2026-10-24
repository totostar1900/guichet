import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { joursEnMots } from "@/lib/domain/echeances";
import { rappelMessage } from "@/lib/watch";
import type { Offer } from "@/lib/domain/types";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
/* Le code, et non ce qu'on en dit : les trois surfaces CITENT les trois mots
   dans leurs commentaires, justement pour expliquer qu'elles les partagent. */
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const marche = (d: string, dans: string[]) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) marche(p, dans);
    else if (/\.tsx?$/.test(e.name) && !e.name.endsWith(".test.ts")) dans.push(path.relative(ROOT, p));
  }
};

/**
 * LE TEMPS QUI RESTE SE DIT D'UNE SEULE FAÇON.
 *
 * `echeances.ts` pose la règle en tête : « Clôture le 29 octobre » oblige le
 * lecteur à faire la soustraction, et il la fait mal — la page sait quel jour
 * on est, lui doit s'en souvenir.
 *
 * RELEVÉ DU 24 OCTOBRE 2026. Trois surfaces portent cette question, et aucune
 * des trois n'était en règle de la bonne manière :
 *
 *   LE RAPPEL QUOTIDIEN (`watch.rappelMessage`) et LA BANDE DES ÉCHÉANCES
 *   écrivaient le MÊME ternaire à trois branches, l'un en littéraux français,
 *   l'autre à travers `t()`. La seconde copie portait au-dessus d'elle un
 *   commentaire disant « les mêmes mots que le message de rappel » : un
 *   commentaire qui déclare une copie ne l'empêche pas de diverger, il nomme
 *   seulement le jour où elle divergera.
 *
 *   LA CARTE DE LA PROVISION, sur la page d'arrivée, ne la tenait pas du
 *   tout : « Prochaine échéance · 14 février », et la soustraction pour le
 *   lecteur. C'est pourtant la surface où elle décide le plus — un coupon
 *   modifie la provision, donc ce que le client peut engager d'ici là.
 *
 * CE QUE CETTE ÉPREUVE GARDE : une définition, trois surfaces qui l'appellent,
 * et personne qui réécrive le ternaire.
 */
describe("le temps qui reste", () => {
  /* NON VACUITÉ D'ABORD. Tout ce qui suit lit des fichiers ; si la fonction
     elle-même ne rendait plus les trois branches, la règle garderait la forme
     d'un partage sans son contenu. */
  it("dit les trois branches, et deux d'entre elles ne sont pas un nombre", () => {
    expect(joursEnMots(0)).toEqual({ key: "aujourd'hui" });
    expect(joursEnMots(1)).toEqual({ key: "demain" });
    expect(joursEnMots(3)).toEqual({ key: "dans {n} jours", params: { n: "3" } });
    /* « dans 0 jours » et « dans 1 jours » ne se disent pas, et c'est tout
       l'objet des deux premières branches. */
    expect(joursEnMots(0).key).not.toContain("{n}");
    expect(joursEnMots(1).key).not.toContain("{n}");
  });

  /* UNE CLÔTURE DÉJÀ PASSÉE SE LIT « aujourd'hui », et non « dans -2 jours ».
     Le rappel s'arrête à la clôture, mais il tourne une fois par jour : le
     passage du dernier jour au suivant ne doit pas produire un nombre
     négatif dans un courriel. */
  it("ne laisse pas un retard s'écrire en jours négatifs", () => {
    expect(joursEnMots(-2)).toEqual({ key: "aujourd'hui" });
  });

  it("est appelé par les trois surfaces qui posent la question", () => {
    for (const [f, quoi] of [
      ["src/lib/watch.ts", "le rappel quotidien d'une séance suivie"],
      ["src/components/CeQuiFermeBientot.tsx", "la bande des échéances"],
      ["src/app/Console.tsx", "la carte de la provision, sur la page d'arrivée"],
    ] as const) {
      expect(code(f), `${quoi} ne passe plus par « joursEnMots » : il réécrit le temps qui reste à sa façon`).toContain("joursEnMots");
    }
  });

  /* ET LA CARTE DE LA PROVISION LE DIT DANS SA PHRASE, pas dans une
     quatrième case. Cette page a retiré en octobre une date écrite trois fois
     sous trois noms ; le temps qui reste entre donc dans la phrase qui dit
     déjà ce que le flux vaut, et le trou « {quand} » est la trace de cette
     décision dans la clef elle-même. */
  it("fait entrer le temps qui reste dans la phrase du flux, et non dans une case de plus", () => {
    const console_ = code("src/app/Console.tsx");
    expect(console_, "la phrase du prochain flux ne dit plus quand il tombe : la case au-dessus ne donne que la date").toMatch(/sur \{l\}, \{quand\}/);
    expect(console_, "le « quand » de la phrase ne vient plus du flux déjà trié : un second calcul, donc un second arrondi").toContain("joursEnMots(prochain.inDays)");
  });

  /* LE TERNAIRE NE SE RÉÉCRIT NULLE PART. Les deux mots à moins de quatre-
     vingts caractères l'un de l'autre sont la signature de la règle ; deux
     fichiers ont le droit de les porter, et ce droit est nommé plutôt que
     compté — la question est QUI, pas COMBIEN. */
  const PERMIS: Record<string, string> = {
    "src/lib/domain/echeances.ts": "la définition",
    "src/lib/digest.ts": "« Clôtures aujourd'hui et demain », un titre de rubrique du récapitulatif du desk : il nomme une fenêtre de deux jours, il ne mesure pas un reste",
  };

  it("ne laisse personne d'autre réécrire les trois branches", () => {
    const fichiers: string[] = [];
    marche(path.join(ROOT, "src"), fichiers);
    const signature = /aujourd'hui[\s\S]{0,80}demain|demain[\s\S]{0,80}aujourd'hui/;
    const porteurs = fichiers.filter((f) => !f.includes("i18n") && signature.test(code(f)));
    /* Non vacuité du relevé : si plus personne ne portait la signature, le
       filtre serait muet et la règle ne garderait rien. */
    expect(porteurs, "plus aucun fichier ne porte les deux mots : la signature ne décrit plus la règle qu'elle garde").not.toEqual([]);
    expect(porteurs.filter((f) => !PERMIS[f]).sort(), "ces fichiers réécrivent le temps qui reste au lieu d'appeler « joursEnMots »").toEqual([]);
  });

  /* LE COURRIEL GARDE SON FRANÇAIS. Il part dans la langue de la maison
     quelle que soit celle de lecture, et la clef EST la phrase française :
     c'est pourquoi `translate("fr", …)` la rend telle quelle. Une surface qui
     partagerait la fonction mais perdrait ses mots n'aurait rien gagné. */
  it("laisse le rappel quotidien en français, trous remplis", () => {
    const o = { id: "o1", title: "BTA 13 semaines" } as Offer;
    expect(rappelMessage(o, 0).text).toContain("ferme aujourd'hui");
    expect(rappelMessage(o, 1).text).toContain("ferme demain");
    expect(rappelMessage(o, 4).text).toContain("ferme dans 4 jours");
    expect(rappelMessage(o, 4).text, "le trou du gabarit est resté dans le courriel").not.toContain("{n}");
  });
});
