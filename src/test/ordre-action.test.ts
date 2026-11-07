import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const lire = (p: string) => readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const form = lire("src/components/IntentForm.tsx");
const actions = lire("src/app/offres/[id]/actions.ts");

/**
 * L'ORDRE SUR UNE ACTION (7 novembre 2026) : le client dit une quantité, il ne choisit pas son cours ; l'achat et la vente se lisent pareil ; « Entrée » passe à la case suivante.
 */
describe("l'ordre sur une action", () => {
  it("ne laisse pas le client fixer le cours d'une action, ni à l'écran ni au serveur", () => {
    expect(form, "le cours d'une action n'est plus imposé").toMatch(/const coursImpose = offer\.kind === "MARCHE" && offer\.instrument === "action";/);
    expect(form, "une limite saisie compte encore sur une action").toMatch(/const lim = !coursImpose && limitNum/);
    const debut = form.indexOf("{coursImpose ? (");
    const imposé = form.slice(debut, form.indexOf(") : (", debut));
    expect(imposé, "le cours d'une action est redevenu un champ qu'on tape").toMatch(/readOnly/);
    expect(imposé, "le cours d'une action part encore vers le desk").not.toMatch(/name="limitPrice"/);
    expect(actions, "le serveur retient une limite postée à la main sur une action").toMatch(/limitPrice: !\(offer\.kind === "MARCHE" && offer\.instrument === "action"\) &&/);
  });

  it("fait taper la quantité par défaut dans les deux sens, l'achat comme la vente", () => {
    expect(form, "l'achat ne tape plus la quantité par défaut : il ne ressemble plus à la vente").toMatch(/useState<"titres" \| "francs">\(offer\.kind === "MARCHE" \? "titres" : "francs"\)/);
  });

  it("passe à la case suivante sur « Entrée », sans jamais envoyer l'ordre", () => {
    expect(form, "le formulaire n'écoute plus « Entrée »").toMatch(/onKeyDown=\{entrerPourSuivre\}/);
    const debutF = form.indexOf("const entrerPourSuivre");
    const f = form.slice(debutF, form.indexOf("const parse =", debutF));
    expect(f, "« Entrée » doit être retenue, sinon elle envoie le formulaire").toMatch(/e\.preventDefault\(\)/);
    expect(f, "« Entrée » ne doit pas envoyer l'ordre").not.toMatch(/requestSubmit|\.submit\(/);
    expect(f, "le message libre perd son retour à la ligne").toMatch(/instanceof HTMLInputElement/);
    expect(f, "au dernier champ, « Entrée » ne passe plus à l'étape suivante").toMatch(/else if \(step < 3\) goTo\(step \+ 1\)/);
  });
});
