import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { RACINE } from "./racine";

/**
 * L'ORDRE COMMENCÉ ATTEND, SANS DATE LIMITE.
 *
 * DEMANDÉ LE 28 OCTOBRE 2026 : « sans date limite, s'assurer que l'ordre
 * commencé apparaisse dans les notifications tant qu'il n'est pas confirmé ou
 * annulé ». La question posée était « au bout de combien de temps cesse-t-il
 * d'attendre ? » et la réponse est : jamais. Il part, on le jette, ou il
 * attend.
 *
 * CE QUI SE PERDAIT : un montant tapé puis abandonné — une page fermée, un
 * appel reçu, un détour par ses coordonnées — n'était retrouvable nulle part.
 * Il fallait tout retaper, et le plus souvent on ne revenait pas.
 *
 * IL VIT SUR L'APPAREIL ET NULLE PART AILLEURS : rien n'a été envoyé, la
 * maison ne doit pas détenir un engagement que le client n'a pas pris, et le
 * desk ne doit pas voir au carnet un ordre dont personne ne lui a parlé.
 */
const magasin = new Map<string, string>();
const faireUnNavigateur = () => {
  const ls = {
    getItem: (k: string) => magasin.get(k) ?? null,
    setItem: (k: string, v: string) => void magasin.set(k, v),
    removeItem: (k: string) => void magasin.delete(k),
  };
  (globalThis as unknown as { localStorage: typeof ls }).localStorage = ls;
  (globalThis as unknown as { window: { dispatchEvent: () => boolean } }).window = { dispatchEvent: () => true };
};

describe("le brouillon d'un ordre", () => {
  beforeEach(() => {
    magasin.clear();
    faireUnNavigateur();
  });

  it("se garde, se relit, et rouvre l'ordre là où il a été laissé", async () => {
    const { poserLeBrouillon, lireLeBrouillon, reprendre } = await import("@/lib/brouillon");
    poserLeBrouillon({ offerId: "mkt-bhc", titre: "BGFI Holding", type: "achat", montant: "1 086 000" });
    const b = lireLeBrouillon();
    expect(b?.offerId).toBe("mkt-bhc");
    expect(b?.montant).toBe("1 086 000");
    /* L'adresse de reprise repose le sens ET la somme : la page les relit, et
       le formulaire se retrouve dans l'état où on l'avait laissé. Les espaces
       du nombre tapé n'y survivent pas — une adresse ne les porte pas. */
    expect(reprendre(b!)).toBe("/offres/mkt-bhc/intention?intent=achat&qty=1086000");
  });

  it("s'efface quand il n'y a plus rien à garder", async () => {
    const { poserLeBrouillon, lireLeBrouillon } = await import("@/lib/brouillon");
    poserLeBrouillon({ offerId: "o", titre: "T", type: "achat", montant: "500" });
    expect(lireLeBrouillon()).not.toBeNull();
    poserLeBrouillon({ offerId: "o", titre: "T", type: "achat", montant: "   " });
    expect(lireLeBrouillon(), "un champ vidé laisse un brouillon fantôme").toBeNull();
    poserLeBrouillon({ offerId: "o", titre: "T", type: "achat", montant: "500" });
    poserLeBrouillon(null);
    expect(lireLeBrouillon(), "l'ordre parti ou abandonné laisse son brouillon derrière lui").toBeNull();
  });

  it("n'en garde qu'un, le dernier commencé", async () => {
    /* Deux brouillons feraient deux notifications, donc une liste à gérer,
       pour un geste qu'on reprend dans la minute ou qu'on oublie. */
    const { poserLeBrouillon, lireLeBrouillon } = await import("@/lib/brouillon");
    poserLeBrouillon({ offerId: "un", titre: "Un", type: "achat", montant: "100" });
    poserLeBrouillon({ offerId: "deux", titre: "Deux", type: "ferme", montant: "200" });
    expect(lireLeBrouillon()?.offerId).toBe("deux");
  });

  it("ne se relit pas s'il ne mène à rien", async () => {
    // Non vacuité : sans cette garde, une notification pourrait pointer nulle part.
    const { lireLeBrouillon } = await import("@/lib/brouillon");
    magasin.set("guichet:brouillon", JSON.stringify({ offerId: "", titre: "T", type: "achat", montant: "500" }));
    expect(lireLeBrouillon()).toBeNull();
    magasin.set("guichet:brouillon", "{ceci n'est pas du json");
    expect(lireLeBrouillon(), "un brouillon illisible fait tomber la barre entière").toBeNull();
  });

  it("n'a aucune date limite, nulle part", () => {
    /* C'EST LA DEMANDE, ET ELLE SE TIENT PAR L'ABSENCE : un brouillon qui
       s'effacerait au bout d'un jour ferait exactement ce qu'on répare —
       perdre le travail de quelqu'un sans le lui dire. La date qu'il porte
       sert à l'afficher, jamais à décider de sa mort. */
    const src = readFileSync(`${RACINE}/src/lib/brouillon.ts`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(src, "une péremption est apparue dans le brouillon").not.toMatch(/Date\.now\(\)\s*-|expire|perime|maxAge|ttl|864e5|86400/i);
  });
});

describe("ce que la cloche en fait", () => {
  const barre = () => readFileSync(`${RACINE}/src/components/mobile/BarreDuCompte.tsx`, "utf8").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const form = () => readFileSync(`${RACINE}/src/components/IntentForm.tsx`, "utf8").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

  it("le compte, même quand le dossier n'attend rien", () => {
    /* Sans cela, un client dont le dossier est en ordre n'aurait pas de
       cloche du tout, et son ordre commencé ne se verrait nulle part. */
    const b = barre();
    expect(b, "le brouillon n'entre plus dans le compte").toMatch(/const combien = attentes\.length \+ \(brouillon \? 1 : 0\)/);
    expect(b, "la cloche ne paraît plus pour un brouillon seul").toMatch(/\{combien > 0 && \(/);
  });

  it("l'offre à reprendre, et à abandonner sur place", () => {
    const b = barre();
    expect(b, "on ne peut plus reprendre l'ordre depuis la cloche").toMatch(/href=\{reprendre\(brouillon\)\}/);
    /* L'ABANDON SE JOUE ICI, et c'est l'exception à la règle des attentes :
       celles-ci renvoient à la page où la décision se prend, parce que le
       desk tient quelque chose. Un brouillon, lui, n'engage personne. */
    expect(b, "on ne peut plus abandonner l'ordre commencé").toMatch(/onClick=\{\(\) => poserLeBrouillon\(null\)\}/);
  });

  it("et le formulaire l'efface quand l'ordre part", () => {
    expect(form(), "un ordre envoyé laisse son brouillon dans la cloche").toMatch(/if \(state\?\.ok\) return poserLeBrouillon\(null\)/);
  });

  it("la somme d'un ordre de bourse s'amorce enfin depuis l'adresse", () => {
    /* Relevé en reprenant un brouillon : l'adresse portait le montant, la page
       le lisait, et l'écran restait vide — sur une ligne cotée en achat, le
       champ qui commande tout est « cash », et personne ne l'amorçait. Aucun
       lien portant un montant ne pré-remplissait donc une ligne cotée. */
    expect(form(), "la somme d'un ordre de bourse ne s'amorce plus : la reprise rouvrira un écran vide").toMatch(/const \[cash, setCash\] = useState\(offer\.kind === "MARCHE"[\s\S]{0,160}initialAmount/);
  });
});
