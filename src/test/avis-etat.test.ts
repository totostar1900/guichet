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

/**
 * LE FAIT EST SÉLECTIONNABLE, ET LA PAGE N'A PAS À DEVINER.
 *
 * RELEVÉ LE 26 OCTOBRE 2026, au moment de réunir les deux pannes d'un même
 * événement sur la page Santé. Un fournisseur qui refuse laisse une ligne
 * « failed » au registre des envois, que la page montrait ; mais quand RIEN
 * n'a pu être tenté — aucun contact joignable, aucun canal ouvert — aucune
 * ligne n'entre à ce registre. Le fait ne vivait que dans une phrase au fil,
 * qui se lit en défilant, et le desk avait donc deux endroits à regarder pour
 * une seule question : à qui dois-je téléphoner.
 *
 * D'OÙ LE GENRE « AVIS_MANQUE ». L'autre voie était de chercher des mots dans
 * du HTML, ce qui marche jusqu'au jour où quelqu'un ajuste une phrase — et
 * casse alors EN SILENCE une page de surveillance, qui est la pire des
 * régressions possibles à cet endroit.
 */
describe("un avis dû et non remis porte son genre", () => {
  it("la porte l'inscrit au fil sous « avis_manque », et non sous « system »", async () => {
    current = desk;
    const { i } = await ordre("u-avis-genre");
    const { transitionIntent } = await import("@/app/desk/actions");
    const { repo } = await import("@/lib/data");

    await transitionIntent(formulaire({ intentId: i.id, state: "confirmee" }));

    const siennes = (await repo().listEvents(300)).filter((e) => e.html.includes(i.ref));
    const manque = siennes.find((e) => /non remis/i.test(e.html))!;
    expect(manque, "aucune plainte : l'épreuve ne mesure plus rien").toBeTruthy();
    expect(manque.kind, "la plainte reste au genre « system » : la page Santé ne saura pas la retrouver").toBe("avis_manque");
    /* ET ELLE PORTE L'ORDRE : sans « intentId », la ligne se lit mais ne se
       relie à rien, et le desk ne peut pas ouvrir la fiche depuis la page. */
    expect(manque.intentId).toBe(i.id);
  });

  it("aucun autre genre ne sert à dire un avis non remis", () => {
    /* LE CLIQUET QUI COMPTE. Cinq endroits écrivaient cette plainte, chacun à
       sa façon ; un sixième qui l'écrirait sous « system » redeviendrait
       invisible sur la page Santé — et invisible exactement comme avant, c'est
       à dire sans que rien ne le signale. */
    const fautifs: string[] = [];
    const parcourir = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = `${dir}/${e.name}`;
        if (e.isDirectory()) {
          parcourir(p);
          continue;
        }
        if (!e.name.endsWith(".ts") && !e.name.endsWith(".tsx")) continue;
        const src = readFileSync(p, "utf8");
        /* Chaque appel à logEvent, pris d'un bloc : on regarde ceux qui parlent
           d'un avis que le client n'a pas eu, et l'on exige leur genre. */
        for (const m of src.matchAll(/logEvent\(\{[^;]*?\}\)/g)) {
          const bloc = m[0];
          if (!/non remis|non annonc|non envoy/i.test(bloc)) continue;
          if (!/kind: "avis_manque"/.test(bloc)) fautifs.push(`${p.slice(RACINE.length + 1)} · ${bloc.slice(0, 70).replace(/\s+/g, " ")}…`);
        }
      }
    };
    for (const d of ["src/app", "src/lib"]) parcourir(`${RACINE}/${d}`);
    expect(fautifs, "un avis dû et non remis s'inscrit sous un genre que la page Santé ne regarde pas").toEqual([]);

    // Non vacuité : le relevé doit voir les cinq plaintes qui existent.
    let vues = 0;
    const compter = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = `${dir}/${e.name}`;
        if (e.isDirectory()) compter(p);
        else if (e.name.endsWith(".ts") || e.name.endsWith(".tsx")) vues += [...readFileSync(p, "utf8").matchAll(/kind: "avis_manque"/g)].length;
      }
    };
    for (const d of ["src/app", "src/lib"]) compter(`${RACINE}/${d}`);
    expect(vues, "le relevé ne voit plus les plaintes : il ne protège plus rien").toBeGreaterThanOrEqual(5);
  });

  it("la page Santé les choisit par leur genre, et non par leurs mots", () => {
    /* Une page de surveillance qui reconnaît son sujet à une phrase se casse le
       jour où la phrase bouge, et se casse en silence. */
    const page = readFileSync(`${RACINE}/src/app/desk/sante/page.tsx`, "utf8");
    expect(page).toMatch(/e\.kind === "avis_manque"/);
    expect(page, "la page cherche des mots dans le fil : elle cassera à la première phrase ajustée").not.toMatch(/non remis.*test\(|includes\("non remis"\)/);
    /* ET ELLE LIT LE FIL POUR DE BON. Trouvé en vérification à l'envers : en
       remplaçant la lecture par un tableau vide, la page compilait, s'affichait,
       montrait toujours les refus du fournisseur — et perdait l'autre moitié de
       son sujet sans qu'aucune épreuve ne bronche. Un filtre juste sur une
       lecture absente est la panne la plus confortable qu'on puisse écrire. */
    expect(page, "la page ne lit plus le fil : le panneau a perdu la moitié de son sujet").toMatch(/repo\(\)\s*\.listEvents\(|repo\(\)\.listEvents\(/);
  });

  it("le genre existe des deux côtés du modèle", () => {
    /* Le modèle vit dans « types.ts » ET dans les migrations : un genre déclaré
       d'un seul côté lèverait à la première écriture en base, là où le dépôt en
       mémoire l'accepterait sans broncher. C'est la divergence la plus coûteuse
       de cette maison, et elle a déjà été payée une fois. */
    const types = readFileSync(`${RACINE}/src/lib/domain/types.ts`, "utf8");
    expect(types).toContain('"avis_manque"');
    const sql = readdirSync(`${RACINE}/supabase/migrations`)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => readFileSync(`${RACINE}/supabase/migrations/${f}`, "utf8"))
      .join("\n");
    expect(sql, "le genre manque aux migrations : la première écriture lèvera en base").toMatch(/add value if not exists 'avis_manque'/);
  });
});
