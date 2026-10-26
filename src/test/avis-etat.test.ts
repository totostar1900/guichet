import { readFileSync, readdirSync } from "node:fs";
import { FAUX_NEXT_CACHE } from "./faux-next-cache";
import { RACINE } from "./racine";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/types";

/**
 * QUAND L'AVIS D'ÉTAT NE PART PAS, LE DESK L'APPREND.
 *
 * RELEVÉ EN SUITE DE LA REVUE DES ROBOTS du 26 octobre 2026. Dix appels
 * annonçaient au client un changement d'état et JETAIENT le résultat — cinq
 * sous un `if (offer)` qui ne disait rien à personne, cinq sans même cela.
 * `notifyIntentUpdated` rendait `void`, donc aucun n'avait de quoi savoir.
 *
 * CE QUE CE SILENCE COÛTE, par ordre :
 *
 *   « SERVIE », « NON SERVIE », « RÉGLÉE » sont les mots qu'un client veut
 *   savoir dans la seconde, sur un geste qu'il n'a pas fait. Deux de ces
 *   appels tournent EN LOT, sur toutes les intentions d'une ligne : personne
 *   n'y regarde un envoi à la fois.
 *
 *   LA CONTRE-PROPOSITION PORTE UNE ÉCHÉANCE. Un client qui n'en est pas
 *   averti laisse courir le délai, et sa réponse devient caduque toute seule :
 *   un message qui ne part pas se transforme en refus par expiration, sans que
 *   personne n'ait refusé.
 *
 * ET LEURS VOISINES IMMÉDIATES INSCRIVAIENT DÉJÀ LEUR ÉCHEC — un document non
 * généré, un avis d'opéré non produit, un mouvement d'espèces non inscrit.
 * L'avis au client était, à chaque fois, la seule ligne muette du voisinage.
 *
 * ─── POURQUOI CES ÉPREUVES MESURENT L'ÉCHEC ────────────────────────────────
 *
 * Aucun fournisseur n'est posé en épreuve, donc tout envoi ressort
 * « skipped » : c'est l'état par défaut, et c'est précisément le chemin qui
 * était avalé. Le chemin heureux se mesure ailleurs, par NOTIFY_DEMO.
 */
const desk: Session = { userId: "u-desk", role: "desk", name: "Desk Test", email: "desk@example.com", segment: "Desk", tier: 2, provider: "dev", mfaEnrolled: true, mfaVerified: true };
let current: Session = desk;

vi.mock("@/lib/auth", () => ({
  getSession: async () => current,
  requireSession: async () => current,
  requireDesk: async () => current,
  requireResponsable: async () => desk,
  authMode: () => "dev",
}));
vi.mock("next/cache", () => FAUX_NEXT_CACHE);

beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
});

/** Ces actions prennent un formulaire : c'est par là qu'un écran les appelle. */
const formulaire = (champs: Record<string, string>): FormData => {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) f.set(k, v);
  return f;
};

/**
 * Les lignes du fil qui parlent de CET ordre, et d'aucun autre.
 *
 * Le dépôt est commun au fichier : chercher « non remis » dans tout le fil
 * trouvait la plainte d'une épreuve antérieure, et chercher la référence
 * trouvait les lignes ordinaires du même ordre. Les deux passaient côte à côte
 * sans jamais épingler la paire — trouvé en réintroduisant le défaut, qui n'a
 * pas fait tomber l'épreuve qu'il aurait dû faire tomber.
 */
const filDe = async (ref: string): Promise<string[]> => {
  const { repo } = await import("@/lib/data");
  return (await repo().listEvents(300)).map((e) => e.html).filter((h) => h.includes(ref));
};

/** Un ordre reçu, joignable par e-mail, sur une ligne du jeu d'essai. */
async function ordre(clientId: string) {
  const { repo } = await import("@/lib/data");
  const r = repo();
  const i = await r.createIntent({
    offerId: "mkt-bhc",
    type: "achat",
    amount: 500_000,
    channel: "E-mail",
    contactEmail: "client@exemple.com",
    clientId,
    clientName: "Client Avis",
    clientSegment: "Personne physique",
  });
  return { r, i };
}

describe("la transition du desk", () => {
  it("dit au fil que l'avis n'est pas parti, et n'annule pas la transition", async () => {
    current = desk;
    const { i, r } = await ordre("u-avis-1");
    const { transitionIntent } = await import("@/app/desk/actions");

    await transitionIntent(formulaire({ intentId: i.id, state: "confirmee" }));

    // LA TRANSITION TIENT : refuser un changement d'état parce qu'un canal est
    // cassé serait le pire des deux maux.
    expect((await r.listIntents()).find((x) => x.id === i.id)!.state).toBe("confirmee");
    const plainte = (await filDe(i.ref)).find((h) => /non remis/i.test(h));
    expect(plainte, "l'avis d'état non remis est passé sous silence").toBeTruthy();
    expect(plainte).toMatch(/avis « .* » non remis/i);
    /* LA RAISON NOMME LE CANAL : « non remis » sans canal ne se répare pas, et
       « e-mail : skipped » se répare autrement qu'un client sans coordonnées. */
    expect(plainte, "la plainte ne nomme pas le canal : elle ne se répare pas").toMatch(/non remis<\/b> · email/i);
  });

  it("nomme l'état dans la plainte, et non « avis »", async () => {
    /* Un desk qui lit son fil doit savoir LEQUEL des avis manque : « servie »
       se rattrape par un téléphone, « confirmée » peut attendre le suivant. */
    current = desk;
    const { i } = await ordre("u-avis-2");
    const { transitionIntent } = await import("@/app/desk/actions");
    await transitionIntent(formulaire({ intentId: i.id, state: "confirmee" }));
    const { INTENT_STATE_LABEL } = await import("@/lib/domain/intent");
    const plainte = (await filDe(i.ref)).find((h) => /non remis/i.test(h));
    expect(plainte).toContain(`avis « ${INTENT_STATE_LABEL.confirmee} » non remis`);
  });

  it("ne se plaint pas d'un avis qui est parti", async () => {
    /* NON VACUITÉ, et elle porte sur les deux épreuves ci-dessus : une porte
       qui se plaindrait à chaque transition les ferait passer au vert en
       remplissant le fil de bruit, ce qui est l'autre façon de ne rien dire. */
    current = desk;
    process.env.NOTIFY_DEMO = "1";
    try {
      const { i } = await ordre("u-avis-3");
      const { transitionIntent } = await import("@/app/desk/actions");
      await transitionIntent(formulaire({ intentId: i.id, state: "confirmee" }));
      const plaintes = (await (await import("@/lib/data")).repo().listEvents(200)).filter((e) => /non remis/i.test(e.html) && e.html.includes(i.ref));
      expect(plaintes, "la maison se plaint d'un avis qui est bel et bien parti").toEqual([]);
    } finally {
      delete process.env.NOTIFY_DEMO;
    }
  });
});

describe("la contre-proposition", () => {
  it("dit au fil que le client n'a pas été averti de l'échéance", async () => {
    /* LA CONSÉQUENCE LA PLUS NETTE DES DIX. Le délai court depuis l'envoi : un
       client qui n'est pas averti le laisse passer, et sa réponse devient
       caduque. Le silence se change en refus que personne n'a prononcé. */
    current = desk;
    const { i, r } = await ordre("u-avis-4");
    const { proposeCounter } = await import("@/app/desk/counter-actions");

    await proposeCounter(formulaire({ intentId: i.id, amount: "400000", until: new Date(Date.now() + 3 * 86_400_000).toISOString() }));

    expect((await r.listIntents()).find((x) => x.id === i.id)!.state).toBe("contre_proposee");
    const plainte = (await filDe(i.ref)).find((h) => /non remis/i.test(h));
    expect(plainte, "la contre-proposition non annoncée est passée sous silence").toBeTruthy();
    expect(plainte).toMatch(/avis « .* » non remis/i);
  });
});

describe("une seule porte annonce l'état d'un ordre", () => {
  it("aucun appelant ne passe par l'envoi nu", () => {
    /* LE CLIQUET QUI MANQUAIT. Dix appels écrivaient la même ligne, et chacun
       l'a écrite un peu autrement : cinq avec un `if (offer)` mort, un avec un
       try/catch vide, quatre sans rien. Une porte unique est ce qui empêche la
       onzième de recommencer.
       L'EXCEPTION EST LE ROBOT DES ARBITRAGES, et sa raison est écrite : il
       annonce un ÉVÉNEMENT DE MÉTIER — une borne qui a joué — que le client ne
       peut distinguer d'aucun autre silence, et il range ces échecs dans son
       compte rendu, ce qu'une porte générique ne saurait pas faire. */
    const PROPRES = ["src/lib/notify/dispatch.ts", "src/lib/arbitrage/tour.ts"];
    const fautifs: string[] = [];
    const parcourir = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = `${dir}/${e.name}`;
        if (e.isDirectory()) {
          parcourir(p);
          continue;
        }
        if (!e.name.endsWith(".ts") && !e.name.endsWith(".tsx")) continue;
        const rel = p.slice(RACINE.length + 1);
        if (PROPRES.includes(rel)) continue;
        if (/\bnotifyIntentUpdated\(/.test(readFileSync(p, "utf8"))) fautifs.push(rel);
      }
    };
    for (const d of ["src/app", "src/lib"]) parcourir(`${RACINE}/${d}`);
    expect(fautifs, "un appelant annonce un état sans passer par la porte qui dit les échecs").toEqual([]);

    /* NON VACUITÉ : la porte existe, elle est employée, et les deux exceptions
       désignent de vrais fichiers. Sans cela, un `direLEtatDeLOrdre` renommé
       passerait au vert en ne trouvant plus personne. */
    const porte = readFileSync(`${RACINE}/src/lib/notify/dispatch.ts`, "utf8");
    expect(porte).toMatch(/export async function direLEtatDeLOrdre\(/);
    const appels: string[] = [];
    const compter = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = `${dir}/${e.name}`;
        if (e.isDirectory()) compter(p);
        else if ((e.name.endsWith(".ts") || e.name.endsWith(".tsx")) && /await direLEtatDeLOrdre\(/.test(readFileSync(p, "utf8"))) appels.push(p);
      }
    };
    for (const d of ["src/app", "src/lib"]) compter(`${RACINE}/${d}`);
    expect(appels.length, "plus personne n'emploie la porte : le relevé ne protège plus rien").toBeGreaterThanOrEqual(6);
    for (const x of PROPRES) expect(readFileSync(`${RACINE}/${x}`, "utf8").length).toBeGreaterThan(0);
  });
});
