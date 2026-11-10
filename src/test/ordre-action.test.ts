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

  it("fait taper le montant par défaut dans les deux sens, l'achat comme la vente (10 novembre 2026, inverse du 7 novembre)", () => {
    expect(form, "l'achat ou la vente ne tape plus le montant par défaut").toMatch(/useState<"titres" \| "francs">\(offer\.kind === "MARCHE" && \["vente", "rachat", "cession"\]\.includes\(initialType\) && initialAmount \? "titres" : "francs"\)/);
    expect(form, "la vente ne peut plus se taper en montant").toMatch(/const byCash = market && unit === "francs";/);
    expect(form, "le champ qui commande n'est plus le montant").toMatch(/data-order-field\s+inputMode="numeric"\s+placeholder="1 000 000"/);
  });
  it("le montant est le premier champ du trio, puis le cours, puis la quantité", () => {
    const m = form.indexOf('<div className={`${styles.trio} ${styles.carteDuChiffre}`}>');
    const trio = form.slice(m, form.indexOf("trioFoot", m));
    const ordre = ["Montant (FCFA)", "Cours (FCFA)", "Quantité (actions)"].map((x) => trio.indexOf(x));
    expect(ordre.every((n) => n > -1) && ordre[0] < ordre[1] && ordre[1] < ordre[2], `l'ordre du trio n'est plus montant, cours, quantité : ${ordre.join(",")}`).toBe(true);
  });
  it("« Continuer » est dans une barre collante, grisée tant que l'étape n'est pas remplie, avec un « Retour » plus petit", () => {
    expect(form).toMatch(/<BarreDEtape indice=\{step < 3 && !etape\.ok \? etape\.indice : undefined\}>/);
    expect(form, "« Continuer » n'est plus grisé quand l'étape est incomplète").toMatch(/disabled=\{!etape\.ok\} onClick=\{\(\) => goTo\(step \+ 1\)\}/);
    expect(form, "le « Retour » de la première étape ne ramène plus à la fiche").toMatch(/href=\{`\/offres\/\$\{offer\.id\}`\}/);
    const css = readFileSync("src/components/mobile/BarreDEtape.module.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css, "la barre n'est plus fixée en bas sur téléphone").toMatch(/\.barre \{[^}]*position: fixed;[^}]*bottom: calc\(56px \+ env\(safe-area-inset-bottom, 0px\)\)/);
    expect(css, "le bouton grisé n'est plus grisé").toMatch(/\.suivant:disabled \{[^}]*background: var\(--surface-2\)/);
    expect(css, "le retour n'est plus plus petit que l'action").toMatch(/\.retour \{[^}]*font-size: 0\.8rem/);
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
