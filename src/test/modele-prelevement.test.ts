import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * LE MODÈLE SOUMIS À META ET L'ENVOI DOIVENT COMPTER PAREIL.
 *
 * Un modèle approuvé avec cinq variables et un envoi qui en passe quatre est
 * refusé à CHAQUE message, et le refus ne se lit que dans la réponse de l'API
 * de Meta : rien, dans l'application, ne dirait que les préavis ne partent
 * plus. C'est une panne muette parfaite, et elle naîtrait d'une phrase
 * retouchée d'un côté sans l'autre.
 *
 * Ce cliquet lit les deux sources : le texte à soumettre
 * (`docs/modele-whatsapp-prelevement.md`), qui est ce que Georges recopie
 * dans WhatsApp Manager, et le tableau de paramètres du code.
 */
const DOC = "docs/modele-whatsapp-prelevement.md";
const SRC = "src/lib/notify/prelevement.ts";

const doc = () => readFileSync(DOC, "utf8");
const src = () => readFileSync(SRC, "utf8");

/** Les corps du modèle, entre les barrières de code qui suivent « Corps, version … ». */
function corps(langue: string): string {
  const d = doc();
  const i = d.indexOf(`### Corps, version ${langue}`);
  expect(i, `section « Corps, version ${langue} » introuvable dans ${DOC}`).toBeGreaterThan(0);
  const debut = d.indexOf("```", i);
  const fin = d.indexOf("```", debut + 3);
  return d.slice(debut + 3, fin).trim();
}

const variables = (s: string) => [...new Set([...s.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);

describe("le modèle guichet_prelevement", () => {
  it("porte les mêmes variables en français et en anglais", () => {
    expect(variables(corps("française"))).toEqual(variables(corps("anglaise")));
  });

  it("les numérote de 1 à 5, sans trou", () => {
    expect(variables(corps("française"))).toEqual([1, 2, 3, 4, 5]);
  });

  it("et le code en passe exactement autant, dans l'ordre", () => {
    const m = /params: \[fmtDate\(p\.dueOn\), fmt\(p\.amount\), m\.bankName, quoi, m\.ref\]/.exec(src());
    expect(m, "le tableau de paramètres du préavis a changé : relire le modèle avant de resoumettre").not.toBeNull();
  });

  it("ne commence ni ne finit par une variable, et n'en colle jamais deux", () => {
    /* Trois règles de Meta, et chacune fait refuser le modèle à la
       soumission. Les vérifier ici évite un aller-retour de plusieurs jours
       avec un examinateur. */
    for (const langue of ["française", "anglaise"]) {
      const c = corps(langue);
      expect(c.startsWith("{{"), langue).toBe(false);
      expect(c.endsWith("}}"), langue).toBe(false);
      expect(/\}\}[\s,.;]*\{\{/.test(c), langue).toBe(false);
    }
  });

  it("nomme la maison dans le texte fixe, jamais dans une variable", () => {
    // Meta refuse un modèle dont l'identité de l'expéditeur est variable.
    expect(corps("française")).toContain("Purpose Capital");
    expect(corps("anglaise")).toContain("Purpose Capital");
  });

  it("tient dans les bornes de Meta : corps sous 1024, pied sous 60", () => {
    expect(corps("française").length).toBeLessThan(1024);
    expect(corps("anglaise").length).toBeLessThan(1024);
    const d = doc();
    const i = d.indexOf("### Pied de page");
    const debut = d.indexOf("```", i);
    const pied = d.slice(debut + 3, d.indexOf("```", debut + 3)).trim();
    expect(pied.length).toBeLessThanOrEqual(60);
  });

  it("se nomme pareil dans le document et dans le code", () => {
    expect(doc()).toContain("guichet_prelevement");
    expect(src()).toMatch(/WA_TEMPLATE_PRELEVEMENT \|\| "guichet_prelevement"/);
  });

  it("et le préavis part bien AVEC son modèle", () => {
    /* Sans modèle, l'envoi retombe en texte libre, que Meta n'accepte que
       dans la fenêtre de 24 h ouverte par le client : un préavis parti cinq
       jours avant l'échéance échouerait presque toujours. */
    expect(src()).toMatch(/notifyRaw\("intent_update", contact, \{ subject: `Prélèvement du \$\{fmtDate\(p\.dueOn\)\}`, text, template \}\)/);
  });
});
