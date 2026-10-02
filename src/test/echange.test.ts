import { describe, expect, it } from "vitest";
import { SILENCE_MS, cleDEchange, cheminDeLaCle, normaliserObjet } from "@/lib/domain/echange";

/**
 * Ce qui fait un échange.
 *
 * LE DÉFAUT CORRIGÉ. La boîte groupait par adresse : la BEAC envoie un avis par
 * séance, donc dix-sept affaires dans un fil unique où rien ne peut être dit
 * réglé. Et l'étiquette, posée là, disait que la personne EST une réclamation.
 *
 * CE CLIQUET TIENT LA RÈGLE, parce qu'elle décide de ce qui se range ensemble
 * pour toujours : la clef est écrite à l'arrivée et ne se recalcule pas, sans
 * quoi un changement de règle ferait sauter les étiquettes d'un échange à
 * l'autre.
 */
const T = "2026-10-02T08:00:00.000Z";
const base = { channel: "email" as const, from: "Awa@Example.CM", receivedAt: T };

describe("l'objet normalisé", () => {
  it("retire les préfixes empilés, pas seulement le premier", () => {
    // Sinon deux messages du même échange auraient deux clefs.
    expect(normaliserObjet("RE: TR : Re: Avis d'émission")).toBe("avis d'emission");
  });

  it("ignore accents, casse et espaces en trop", () => {
    expect(normaliserObjet("  Avis   d'ÉMISSION ")).toBe("avis d'emission");
  });

  it("lit les préfixes numérotés et ceux des autres langues", () => {
    expect(normaliserObjet("Fwd: Re[2]: Hello")).toBe("hello");
    expect(normaliserObjet("AW: Antw: Angebot")).toBe("angebot");
  });

  it("rend une chaîne vide pour un objet absent, qui ne dit rien", () => {
    expect(normaliserObjet(undefined)).toBe("");
    expect(normaliserObjet("   ")).toBe("");
  });

  it("ne prend pas un deux-points ordinaire pour un préfixe", () => {
    // « Objet : » n'est pas « Re: » : couper là perdrait tout l'intitulé.
    expect(normaliserObjet("Adjudication : séance du 9 octobre")).toBe("adjudication : seance du 9 octobre");
  });
});

describe("la clef d'un échange", () => {
  it("suit l'en-tête quand il nomme un message connu", () => {
    const r = cleDEchange({ ...base, subject: "Sans rapport", inReplyTo: "<a@b>" }, { cleDuParent: "o:email:x:projet" });
    // L'en-tête l'emporte sur l'objet : c'est le seul chemin qui ne devine rien.
    expect(r).toEqual({ cle: "o:email:x:projet", chemin: "entete" });
  });

  it("retombe sur l'objet quand le message cité est inconnu", () => {
    const r = cleDEchange({ ...base, subject: "Avis d'émission", inReplyTo: "<perdu@ailleurs>" }, {});
    expect(r.chemin).toBe("objet");
  });

  it("met l'adresse dans la clef, parce que « Bonjour » n'identifie rien", () => {
    const a = cleDEchange({ ...base, subject: "Bonjour" }, {}).cle;
    const b = cleDEchange({ ...base, from: "autre@example.cm", subject: "Bonjour" }, {}).cle;
    expect(a).not.toBe(b);
  });

  it("ignore la casse de l'adresse : une adresse est la même en majuscules", () => {
    expect(cleDEchange({ ...base, subject: "X" }, {}).cle).toBe(cleDEchange({ ...base, from: "awa@example.cm", subject: "X" }, {}).cle);
  });

  it("réunit une réponse et son message par l'objet seul", () => {
    const envoye = cleDEchange({ ...base, subject: "Avis d'émission" }, {}).cle;
    const repondu = cleDEchange({ ...base, subject: "Re: avis d'emission" }, {}).cle;
    expect(repondu).toBe(envoye);
  });
});

describe("le silence, quand il n'y a pas d'objet", () => {
  const wa = { channel: "whatsapp" as const, from: "+237600000000", receivedAt: T };

  it("continue l'échange précédent s'il est encore ouvert", () => {
    const dernier = { receivedAt: new Date(Date.parse(T) - 2 * 3_600_000).toISOString(), convKey: "s:whatsapp:+237600000000:hier" };
    expect(cleDEchange(wa, { dernier }).cle).toBe("s:whatsapp:+237600000000:hier");
  });

  it("en ouvre un nouveau au delà du silence", () => {
    const dernier = { receivedAt: new Date(Date.parse(T) - SILENCE_MS - 1).toISOString(), convKey: "s:whatsapp:+237600000000:vieux" };
    expect(cleDEchange(wa, { dernier }).cle).not.toBe("s:whatsapp:+237600000000:vieux");
  });

  it("tient la borne exacte : à 36 h pile, l'échange est clos", () => {
    const pile = { receivedAt: new Date(Date.parse(T) - SILENCE_MS).toISOString(), convKey: "k" };
    const juste = { receivedAt: new Date(Date.parse(T) - SILENCE_MS + 1).toISOString(), convKey: "k" };
    expect(cleDEchange(wa, { dernier: pile }).cle).not.toBe("k");
    expect(cleDEchange(wa, { dernier: juste }).cle).toBe("k");
  });

  it("ouvre plutôt que de coller quand l'écart est illisible ou négatif", () => {
    /* Dans le doute on sépare : deux échanges se recollent d'un geste, deux
       affaires collées se remarquent trop tard. */
    expect(cleDEchange(wa, { dernier: { receivedAt: "avant-hier", convKey: "k" } }).cle).not.toBe("k");
    expect(cleDEchange(wa, { dernier: { receivedAt: "2026-10-03T00:00:00.000Z", convKey: "k" } }).cle).not.toBe("k");
  });

  it("ouvre un échange quand le correspondant écrit pour la première fois", () => {
    expect(cleDEchange(wa, {}).chemin).toBe("silence");
  });

  it("un courriel sans objet suit la même règle que WhatsApp", () => {
    // Un objet vide ne forme pas une clef « sans objet » qui rassemblerait des
    // affaires sans rapport.
    expect(cleDEchange({ ...base, subject: "   " }, {}).chemin).toBe("silence");
  });
});

describe("le chemin se relit dans la clef", () => {
  it("sans colonne de plus pour le redire", () => {
    expect(cheminDeLaCle(cleDEchange({ ...base, subject: "X" }, {}).cle)).toBe("objet");
    expect(cheminDeLaCle(cleDEchange({ ...base }, {}).cle)).toBe("silence");
  });
});
