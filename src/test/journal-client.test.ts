import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { clefDuJour, estQuotidien, genreDe, GENRES, GESTES } from "@/lib/domain/journal-client";

/**
 * LE JOURNAL DOIT COUVRIR LES GESTES, SINON IL NE SERT À RIEN.
 *
 * Au 10 octobre 2026, huit gestes de client sur quarante et un laissaient une
 * trace, et seulement parce qu'ils touchaient à une décision du desk. Un
 * journal se juge à sa couverture : s'il manque le tiers des gestes, la tenue
 * et l'activité qu'on en tire sont fausses sans que rien ne le dise.
 *
 * Ce cliquet lit les fichiers d'actions du client et exige que chaque action
 * exportée note quelque chose, ou figure dans la liste des dispensées, avec
 * sa raison. Une action ajoutée demain tombe donc au rouge jusqu'à ce que
 * quelqu'un ait tranché.
 */
const ROOT = process.cwd();
const FICHIERS = [
  "src/app/moi/actions.ts",
  "src/app/moi/counter-actions.ts",
  "src/app/moi/modifier-actions.ts",
  "src/app/moi/ordres/[id]/actions.ts",
  "src/app/moi/standing-actions.ts",
  "src/app/moi/prelevements/actions.ts",
  "src/app/moi/profil/actions.ts",
  "src/app/moi/reclamation/actions.ts",
  "src/app/moi/securite/actions.ts",
  "src/app/offres/[id]/actions.ts",
  "src/app/ouvrir-un-compte/actions.ts",
];

/**
 * Les gestes qu'on ne note pas, et pourquoi. Chaque ligne est une décision,
 * pas un oubli : un nom qui disparaît de la liste doit se mettre à noter.
 */
const DISPENSEES: Record<string, string> = {
  beginPasskey: "demande le défi au navigateur ; rien n'est encore enrôlé",
  guestSendEmailCode: "un visiteur sans compte n'a pas de journal",
  guestVerifyEmailCode: "le compte naît ici ; le premier geste noté est le suivant",
  complaintPrepareAction: "premier temps d'une réclamation, le dépôt est noté",
  envoyerCodeMandatAction: "le code part, le mandat se note à la signature",
  setKindAction: "noté par « dossier.ouvert » dans la même fonction",
  sendConventionCodeAction: "le code part, la convention se note à l'acceptation",
  verifyConventionCodeAction: "noté par « convention.acceptee » dans la même fonction",
  saveIdentityAction: "noté par « dossier.identite » dans la même fonction",
  uploadDocAction: "noté par « dossier.piece.deposee » dans la même fonction",
  removeDocAction: "noté par « dossier.piece.retiree » dans la même fonction",
  saveFundsProfileAction: "noté par « dossier.finances » dans la même fonction",
  saveConsentsAction: "noté par « consentement.pose » dans la même fonction",
  addPersonAction: "noté par « dossier.personne.ajoutee » dans la même fonction",
  removePersonAction: "noté par « dossier.personne.retiree » dans la même fonction",
  submitFileAction: "noté par « dossier.soumis » dans la même fonction",
  answerCounter: "noté par « ordre.contre.* » dans la même fonction",
  retirerMonOrdre: "noté par « ordre.retire » dans la même fonction",
  identityAction: "noté par « profil.modifie » dans la même fonction",
  contactAction: "noté par « profil.modifie » dans la même fonction",
  acceptTerms: "noté par « convention.acceptee » dans la même fonction",
  consentAction: "noté par « consentement.pose » dans la même fonction",
  prefsAction: "noté par « preferences.posees » dans la même fonction",
  statementAction: "noté par « releve.demande » dans la même fonction",
  createStandingAction: "noté par « epargne.creee » dans la même fonction",
  createReinvestAction: "noté par « ordre.reinvesti » dans la même fonction",
  stopStandingAction: "noté par « epargne.arretee » dans la même fonction",
  modifierStandingAction: "noté par « epargne.modifiee » dans la même fonction",
  creerMandatAction: "noté par « mandat.cree » dans la même fonction",
  signerMandatAction: "noté par « mandat.signe » dans la même fonction",
  revoquerMandatAction: "noté par « mandat.revoque » dans la même fonction",
  complaintDepositAction: "noté par « reclamation.deposee » dans la même fonction",
  finishPasskey: "noté par « securite.clef.enrolee » dans la même fonction",
  enrolPin: "noté par « securite.code.pose » dans la même fonction",
  forgetDeviceAction: "noté par « securite.appareil.oublie » dans la même fonction",
  submitIntent: "noté par « ordre.depose » dans la même fonction",
  toggleWatch: "noté par « ligne.suivie » dans la même fonction",
  sendPhoneProof: "noté par « canal.preuve.envoyee » dans la même fonction",
  checkPhoneProof: "noté par « canal.prouve » dans la même fonction",
  contacterSurLigne: "noté par « message.envoye » dans la même fonction",
  saveProfile: "noté par « dossier.finances » dans la même fonction",
  envoyerCodeOrdreAction: "le code part, l ordre se note à la signature",
  signerOrdreAction: "noté par « ordre.signe » dans la même fonction",
  optionsDeClefAction: "demande le défi au navigateur ; rien n est signé",
  signerAvecLaClefAction: "passe par signerOrdreAction, qui note",
  signerAvecLeCodeDeLAppareilAction: "passe par signerOrdreAction, qui note",
};

const lire = (f: string) => readFileSync(path.join(ROOT, f), "utf8");
const actionsDe = (src: string) => [...src.matchAll(/^export async function (\w+)/gm)].map((m) => m[1]);

describe("la couverture du journal", () => {
  it("lit bien les dix fichiers d'actions du client", () => {
    // Un parcours qui ne trouve rien ressemble trait pour trait à un succès.
    const total = FICHIERS.flatMap((f) => actionsDe(lire(f))).length;
    expect(total).toBeGreaterThanOrEqual(40);
  });

  it("chaque action du client note un geste, ou dit pourquoi elle n'en note pas", () => {
    const nus: string[] = [];
    for (const f of FICHIERS) {
      const src = lire(f);
      for (const nom of actionsDe(src)) {
        if (DISPENSEES[nom]) continue;
        nus.push(`${f} · ${nom}`);
      }
    }
    expect(nus, `ces actions ne laissent aucune trace :\n  ${nus.join("\n  ")}`).toEqual([]);
  });

  it("et les fichiers qui notent importent bien le scripteur", () => {
    for (const f of FICHIERS) {
      const src = lire(f);
      if (!src.includes("await noter(")) continue;
      expect(src, f).toMatch(/import \{ noter \} from "@\/lib\/journal"/);
    }
  });

  it("tout geste noté existe au catalogue", () => {
    /* Une faute de frappe écrirait une ligne que personne ne saurait plus
       nommer, et elle ne se verrait qu'au bout d'un an de registre. */
    const inconnus: string[] = [];
    for (const f of [...FICHIERS, "src/lib/journal.ts"]) {
      for (const m of lire(f).matchAll(/noter\(\s*"([^"]+)"/g)) if (!GESTES[m[1]]) inconnus.push(`${f} · ${m[1]}`);
    }
    expect(inconnus, `gestes hors catalogue :\n  ${inconnus.join("\n  ")}`).toEqual([]);
  });
});

describe("le catalogue des gestes", () => {
  it("donne à chacun une famille connue et deux phrases", () => {
    for (const [nom, g] of Object.entries(GESTES)) {
      expect(GENRES, nom).toContain(g.genre);
      expect(g.phrase.length, nom).toBeGreaterThan(5);
      expect(g.auDesk.length, nom).toBeGreaterThan(5);
      // Au client on dit « vous », au desk on parle de lui : les deux ne se confondent pas.
      expect(g.phrase, nom).not.toBe(g.auDesk);
    }
  });

  it("couvre les sept familles", () => {
    const vues = new Set(Object.values(GESTES).map((g) => g.genre));
    expect([...vues].sort()).toEqual([...GENRES].sort());
  });
});

describe("une consultation ne s'écrit qu'une fois par jour", () => {
  it("les consultations sont quotidiennes, les gestes ne le sont pas", () => {
    expect(estQuotidien("vu.fiche")).toBe(true);
    expect(estQuotidien("ordre.depose")).toBe(false);
    expect(genreDe("vu.document")).toBe("consultation");
  });

  it("la clef change avec l'objet et avec le jour, jamais avec l'heure", () => {
    /* Sans elle, ouvrir dix fois la même fiche dans l'après-midi écrirait dix
       lignes : le fil deviendrait illisible et le registre grossirait de ce
       qui n'apprend rien. */
    const a = clefDuJour("u1", "vu.fiche", "o1", "2026-10-10");
    expect(clefDuJour("u1", "vu.fiche", "o1", "2026-10-10")).toBe(a);
    expect(clefDuJour("u1", "vu.fiche", "o2", "2026-10-10")).not.toBe(a);
    expect(clefDuJour("u1", "vu.fiche", "o1", "2026-10-11")).not.toBe(a);
    expect(clefDuJour("u2", "vu.fiche", "o1", "2026-10-10")).not.toBe(a);
  });
});

describe("le scripteur ne casse jamais le geste qu'il note", () => {
  const src = readFileSync(path.join(ROOT, "src/lib/journal.ts"), "utf8");

  it("avale ses propres erreurs", () => {
    // Un client qui signe son mandat ne doit pas voir sa signature échouer
    // parce qu'une ligne de registre n'est pas passée.
    expect(src).toMatch(/catch \(e\) \{\s*console\.error\("journal :"/);
    expect(src).toMatch(/^export async function noter\([\s\S]*?\): Promise<void> \{\s*try \{/m);
  });

  it("refuse un nom hors catalogue plutôt que d'écrire une ligne sans nom", () => {
    expect(src).toMatch(/if \(!GESTES\[geste\]\)/);
  });

  it("ne note rien pour un visiteur sans compte", () => {
    expect(src).toMatch(/if \(!userId\) return;/);
  });
});

describe("le registre est à part de la chaîne d'audit", () => {
  it("il ne relit pas son dernier maillon avant d'écrire", () => {
    /* L'audit enchaîne chaque ligne à la précédente par un condensé, ce qui
       lui impose une lecture avant chaque écriture. Tenable pour une décision
       du desk, intenable pour des milliers de gestes de clients. */
    const sb = readFileSync(path.join(ROOT, "src/lib/data/supabase.ts"), "utf8");
    const bloc = sb.slice(sb.indexOf("async logClientAction"), sb.indexOf("async listClientActions"));
    expect(bloc).not.toMatch(/prev_hash|order\(/);
    expect(bloc).toMatch(/error\.code !== "23505"/);
  });

  it("et la migration pose l'index qui refuse un doublon de consultation", () => {
    const sql = readFileSync(path.join(ROOT, "supabase/migrations/0081_journal_des_gestes.sql"), "utf8");
    expect(sql).toMatch(/create unique index if not exists client_actions_clef_du_jour/);
    expect(sql).toMatch(/create policy "client lit ses gestes"/);
  });
});

describe("rien n'a été oublié dans les dossiers d'actions", () => {
  it("la liste des fichiers suit les dossiers du client", () => {
    /* Un onzième fichier d'actions client ajouté ailleurs échapperait au
       cliquet : on relit les dossiers plutôt que de faire confiance à la
       liste. */
    const trouves: string[] = [];
    const walk = (d: string) => {
      for (const e of readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
        if (e.isDirectory()) walk(`${d}/${e.name}`);
        else if (/actions\.ts$/.test(e.name)) trouves.push(`${d}/${e.name}`);
      }
    };
    for (const racine of ["src/app/moi", "src/app/offres", "src/app/ouvrir-un-compte"]) walk(racine);
    expect(trouves.sort()).toEqual([...FICHIERS].sort());
  });
});

/**
 * L'ANGLE MORT DU SCANNER DE CLEFS, FERMÉ PAR UN CLIQUET.
 *
 * Les phrases du catalogue passent par « t(GESTES[x].phrase) » : le scanner
 * ne lit que les littéraux, et un geste ajouté sans sa traduction sortirait
 * en français dans la version anglaise sans que rien n'échoue. On compare
 * donc le catalogue au dictionnaire, puisque c'est la seule façon de le voir.
 */
describe("les phrases du catalogue sont traduites", () => {
  it("chacune a son entrée anglaise, dans les deux voix", async () => {
    const { EN_JOURNAL } = await import("@/i18n/en-journal");
    const { GENRE_LABEL: LAB } = await import("@/lib/domain/journal-client");
    const manquantes: string[] = [];
    for (const [nom, g] of Object.entries(GESTES)) {
      if (!EN_JOURNAL[g.phrase]) manquantes.push(`${nom} · ${g.phrase}`);
      if (!EN_JOURNAL[g.auDesk]) manquantes.push(`${nom} · ${g.auDesk}`);
    }
    for (const v of Object.values(LAB)) if (!EN_JOURNAL[v]) manquantes.push(`famille · ${v}`);
    expect(manquantes, `sans traduction :\n  ${manquantes.join("\n  ")}`).toEqual([]);
  });

  it("et le dictionnaire est bien monté dans le noyau", () => {
    expect(readFileSync(path.join(ROOT, "src/i18n/core.ts"), "utf8")).toMatch(/\.\.\.EN_JOURNAL,/);
  });
});

/* Le magasin mémoire, exercé pour de bon : c'est lui qui sert la démonstration
   et les captures du guide, et une écriture qui n'y marche pas ne se verrait
   nulle part ailleurs. */
describe("le registre, écrit et relu", () => {
  it("garde un geste, et le rend au client qui l'a fait", async () => {
    delete (globalThis as { __guichetStore?: unknown }).__guichetStore;
    const { memoryRepository: m } = await import("@/lib/data/memory");
    await m.logClientAction({ userId: "u1", geste: "ordre.depose", genre: "ordre", objet: "PF-0001", detail: "OTA 2031" });
    await m.logClientAction({ userId: "u2", geste: "mandat.signe", genre: "especes", objet: "MP-0001" });
    const siens = await m.listClientActions({ userId: "u1" });
    expect(siens.map((x) => x.geste)).toEqual(["ordre.depose"]);
    expect(siens[0]).toMatchObject({ objet: "PF-0001", detail: "OTA 2031" });
    expect(await m.listClientActions({ genre: "especes" })).toHaveLength(1);
  });

  it("refuse une seconde consultation du même objet le même jour", async () => {
    delete (globalThis as { __guichetStore?: unknown }).__guichetStore;
    const { memoryRepository: m } = await import("@/lib/data/memory");
    const clef = clefDuJour("u1", "vu.fiche", "o1", "2026-10-10");
    await m.logClientAction({ userId: "u1", geste: "vu.fiche", genre: "consultation", objet: "o1", clefDuJour: clef });
    await m.logClientAction({ userId: "u1", geste: "vu.fiche", genre: "consultation", objet: "o1", clefDuJour: clef });
    await m.logClientAction({ userId: "u1", geste: "vu.fiche", genre: "consultation", objet: "o2", clefDuJour: clefDuJour("u1", "vu.fiche", "o2", "2026-10-10") });
    expect(await m.listClientActions({ userId: "u1" })).toHaveLength(2);
  });

  it("et la clef ne sort jamais du registre", async () => {
    // Elle sert à refuser un doublon, pas à être lue : rien ne l'affiche.
    delete (globalThis as { __guichetStore?: unknown }).__guichetStore;
    const { memoryRepository: m } = await import("@/lib/data/memory");
    await m.logClientAction({ userId: "u1", geste: "vu.fiche", genre: "consultation", objet: "o1", clefDuJour: "x" });
    expect(Object.keys((await m.listClientActions({ userId: "u1" }))[0])).not.toContain("clefDuJour");
  });
});

/**
 * UNE CONSULTATION SE NOTE DEPUIS LE NAVIGATEUR, JAMAIS AU RENDU.
 *
 * Trois raisons, et chacune ferait mentir le registre. Les listes préchargent
 * la fiche voisine avant tout clic : un rendu qui noterait son passage
 * inscrirait des fiches survolées. Un onglet ouvert en arrière-plan n'est pas
 * une consultation. Et un composant serveur peut se rendre deux fois pour une
 * seule visite ; le registre n'a pas à compter les rendus.
 */
describe("ce qui note les consultations", () => {
  const lire = (f: string) => readFileSync(path.join(ROOT, f), "utf8");
  const PAGES: [string, string][] = [
    ["src/app/offres/[id]/page.tsx", "vu.fiche"],
    ["src/app/page.tsx", "vu.portefeuille"],
    ["src/app/moi/documents/[id]/page.tsx", "vu.document"],
    ["src/app/calendrier/page.tsx", "vu.seance"],
  ];

  it.each(PAGES)("%s pose le témoin, et ne note pas au rendu", (f, geste) => {
    const src = lire(f);
    expect(src).toContain(`geste="${geste}"`);
    expect(src).toMatch(/import \{ Vu \} from "@\/components\/Vu"/);
    // La page ne doit jamais appeler le scripteur elle-même.
    expect(src).not.toMatch(/await noter\(/);
  });

  it("le témoin attend que la page soit visible, et ne note qu'une fois", () => {
    const src = lire("src/components/Vu.tsx");
    expect(src).toMatch(/"use client"/);
    expect(src).toMatch(/document\.visibilityState !== "visible"/);
    expect(src).toMatch(/if \(fait\.current\) return;/);
    // Rien n'est attendu : une ligne de registre ne vaut pas qu'on interrompe une lecture.
    expect(src).toMatch(/\.catch\(\(\) => \{\}\)/);
  });

  it("et l'action ouverte au client n'accepte que des consultations", () => {
    /* Elle est appelable depuis le navigateur : sans ce garde, n'importe qui
       écrirait « a signé un ordre » dans le registre. */
    const src = lire("src/app/journal-actions.ts");
    expect(src).toMatch(/genreDe\(geste\) !== "consultation"/);
    expect(src).toMatch(/objet\.slice\(0, 120\)/);
  });
});

/**
 * LA PURGE : UNE PROMESSE ÉCRITE DANS UN CONTRAT.
 *
 * L'article 8 de la convention dit treize mois de détail, puis des compteurs
 * sans le geste. Ce n'est donc plus un réglage qu'on ajuste : une promesse
 * écrite et tenue par personne est pire que pas de promesse.
 */
describe("la purge du registre", () => {
  it("garde treize mois, et pas douze", async () => {
    /* Une comparaison d'une année sur l'autre doit toujours tomber dans le
       détail, sinon le mois de référence disparaît la veille du jour où on
       le compare. Et le score ne regarde que douze mois : il n'est jamais
       touché par la purge. */
    const { MOIS_DE_DETAIL, borneDeLaPurge } = await import("@/lib/domain/journal-client");
    expect(MOIS_DE_DETAIL).toBe(13);
    expect(borneDeLaPurge(new Date("2027-12-10T12:00:00Z")).toISOString().slice(0, 10)).toBe("2026-11-10");
  });

  it("résume puis supprime, et rend le compte", async () => {
    delete (globalThis as { __guichetStore?: unknown }).__guichetStore;
    const { memoryRepository: m } = await import("@/lib/data/memory");
    const vieux = { userId: "u1", geste: "vu.fiche", genre: "consultation" as const, objet: "o1" };
    // Deux gestes anciens du même mois et de la même famille, un récent.
    await m.logClientAction({ ...vieux });
    await m.logClientAction({ ...vieux, objet: "o2" });
    const n = await m.purgerGestes(new Date(Date.now() + 86_400_000));
    expect(n).toBe(2);
    expect(await m.listClientActions({ userId: "u1" })).toHaveLength(0);
  });

  it("ne touche à rien quand rien n'est assez vieux", async () => {
    /* Le registre a commencé le 10 octobre 2026 : le robot ne supprimera rien
       avant novembre 2027, et il doit le dire plutôt que laisser croire qu'il
       a travaillé. */
    delete (globalThis as { __guichetStore?: unknown }).__guichetStore;
    const { memoryRepository: m } = await import("@/lib/data/memory");
    await m.logClientAction({ userId: "u1", geste: "ordre.depose", genre: "ordre" });
    expect(await m.purgerGestes(new Date("2020-01-01"))).toBe(0);
    expect(await m.listClientActions({ userId: "u1" })).toHaveLength(1);
  });

  it("l'agrégation et la suppression sont un seul ordre en base", () => {
    /* Deux instructions séparées laisseraient, en cas d'arrêt entre les deux,
       soit des compteurs doublés, soit des gestes perdus sans compteur. */
    const sql = readFileSync(path.join(ROOT, "supabase/migrations/0083_purge_du_journal_des_gestes.sql"), "utf8");
    expect(sql).toMatch(/with partis as \(\s*delete from client_actions where at < avant/);
    expect(sql).toMatch(/on conflict \(user_id, mois, genre\) do update set n = client_actions_mensuel\.n \+ excluded\.n/);
    expect(sql).toMatch(/create policy "client lit ses compteurs"/);
  });

  it("et le robot est déclaré, surveillé, et ne décide de rien", () => {
    expect(readFileSync(path.join(ROOT, "vercel.json"), "utf8")).toContain("/api/cron/purge-gestes");
    expect(readFileSync(path.join(ROOT, "src/lib/domain/robots.ts"), "utf8")).toMatch(/cle: "purge-gestes"/);
    const route = readFileSync(path.join(ROOT, "src/app/api/cron/purge-gestes/route.ts"), "utf8");
    expect(route).toMatch(/borneDeLaPurge\(\)/);
    // La borne vit dans le domaine : le robot donne l'heure, il ne la fixe pas.
    expect(route).not.toMatch(/setMonth|13/);
  });
});
