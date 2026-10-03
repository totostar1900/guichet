import { describe, expect, it } from "vitest";
import { OUVERTE } from "@/lib/domain/cash";
import { PASSAGES } from "@/lib/documents/passages-catalog";

/**
 * LA CONVENTION DIT CE QUE LE CODE FAIT.
 *
 * Un client signe la convention ; le code exécute. Quand les deux divergent,
 * c'est toujours le texte signé qui a raison devant un régulateur, et c'est
 * l'application qui est en faute. Ce cliquet tient le seul endroit où ils se
 * parlent : les espèces.
 *
 * LA DIVERGENCE A VRAIMENT EU LIEU. L'article 2 disait « L'Intermédiaire n'a
 * pas la garde des espèces du Titulaire », et c'était exact tant que la
 * politique renvoyait tout solde. Le 2 octobre 2026 la maison a répondu
 * l'inverse : cet argent appartient au client et peut rester aussi longtemps
 * qu'il le souhaite. Le code a changé le jour même ; la convention est restée
 * en l'état, et rien ne l'a signalé.
 *
 * Aucun cliquet ne pouvait la voir, parce qu'elle vit ENTRE deux fichiers :
 * chacun était cohérent, et c'est leur rapport qui ne l'était plus. Celui-ci
 * les lit ensemble.
 */
const convention = () => PASSAGES.convention ?? [];
const texte = (clef: string, lang: "fr" | "en" = "fr") => convention().find((p) => p.key === clef)?.[lang] ?? "";

describe("la convention et la politique des espèces se répondent", () => {
  it("ne nie pas la détention quand la politique l'autorise", () => {
    /* La phrase est partie de l'article 2, où elle était d'ailleurs un corps
       étranger : cet article porte sur la conservation des TITRES. */
    if (!OUVERTE.holdIdle) return;
    for (const p of convention()) {
      expect(p.fr, p.key).not.toMatch(/n'a pas la garde des espèces/i);
      expect(p.en, p.key).not.toMatch(/does not hold the Holder's cash/i);
    }
  });

  it("dit au Titulaire que son solde lui appartient et qu'il peut le réclamer", () => {
    const fr = texte("art_especes");
    const en = texte("art_especes", "en");
    expect(fr).toMatch(/lui appartiennent/);
    expect(fr).toMatch(/aussi longtemps que le Titulaire le souhaite/);
    expect(fr).toMatch(/demander le versement/);
    expect(en).toMatch(/belong to the Holder/);
    expect(en).toMatch(/request payment/);
  });

  it("ne promet que le solde DISPONIBLE, et dit ce que le mot exclut", () => {
    /* La moitié qui compte. Sans elle, la convention promettrait un versement
       que le desk refuserait à bon droit, parce que l'argent affecté au
       règlement d'un ordre vivant n'est pas réclamable : ce règlement
       resterait sans provision. C'est le genre d'écart qu'une réclamation
       trouve en premier. */
    const fr = texte("art_especes");
    expect(fr).toMatch(/solde disponible/);
    expect(fr).toMatch(/n'est pas affecté au règlement d'une opération en cours/);
    expect(texte("art_especes", "en")).toMatch(/not committed to the settlement of an operation in progress/);
  });

  it("garde la ségrégation, qui y était déjà", () => {
    // Elle est ce que la page Rapprochement contrôle, et elle précède la règle nouvelle.
    expect(texte("art_especes")).toMatch(/ségrégué des fonds propres de l'Intermédiaire/);
  });

  it("ne dit pas qu'un mouvement se corrige, puisque la base le refuse", () => {
    expect(texte("art_especes")).toMatch(/ne se corrige pas/);
    expect(texte("art_especes")).toMatch(/mouvement en sens inverse/);
  });

  it("regarde bien quelque chose", () => {
    // Non vacuité : un catalogue vidé ou renommé passerait au vert.
    expect(convention().length).toBeGreaterThan(8);
    expect(texte("art_conservation")).toMatch(/sous-compte nominatif/);
  });
});
