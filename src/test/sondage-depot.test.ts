import { FAUX_NEXT_CACHE } from "./faux-next-cache";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/types";

/**
 * CE QUE LE CLIENT DÉPOSE, ET CE QUE LE DESK EN FAIT.
 *
 * Les règles du gabarit sont tenues par « sondage.test.ts » ; ce qu'on mesure
 * ici est ce que les deux actions en font vraiment — le serveur refuse-t-il les
 * mêmes manques que le formulaire, une réponse hérite-t-elle de sa question,
 * une clôture emporte-t-elle les réponses.
 *
 * LE FORMULAIRE EST UNE COMMODITÉ, PAS UNE GARANTIE : ces actions s'appellent
 * sans lui, par un champ retiré à l'inspecteur ou un POST reconstruit. Une
 * règle qui ne vit que dans le navigateur ne vit pas.
 */
const client: Session = { userId: "u-sondeur", role: "client", name: "Son Deur", email: "s@example.com", segment: "Personne physique · Douala", tier: 1, provider: "dev", mfaEnrolled: true, mfaVerified: true, kycStatus: "approuve", conventionAccepted: true };
const desk: Session = { userId: "u-desk", role: "desk", name: "Desk Test", email: "desk@example.com", segment: "Desk", tier: 2, provider: "dev", mfaEnrolled: true, mfaVerified: true };
let courant: Session = client;

vi.mock("@/lib/auth", () => ({
  getSession: async () => courant,
  requireSession: async () => courant,
  requireDesk: async () => desk,
  requireResponsable: async () => desk,
  authMode: () => "dev",
}));
vi.mock("next/cache", () => FAUX_NEXT_CACHE);

beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
});

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

const LIGNE = { instrument: "OTA", country: "Cameroun", tenor: "5 ans", montant: "50 000 000", dansJours: "30" };

describe("le dépôt d'une attente par le client", () => {
  it("accepte une ligne complète et la garde telle quelle", async () => {
    const { deposerLaLigne } = await import("@/app/sondage/actions");
    const { repo } = await import("@/lib/data");
    const res = await deposerLaLigne(null, form({ ...LIGNE, rate: "6,5", pricePct: "99" }));
    expect(res.ok, res.ok ? "" : res.error).toBe(true);
    if (!res.ok) return;
    const l = (await repo().listLignesSondees({ userId: client.userId })).find((x) => x.ref === res.ref)!;
    expect(l.origine).toBe("client");
    expect(l.montant, "le montant groupé n'a pas été lu").toBe(50_000_000);
    expect(l.rate, "la virgule décimale n'a pas été lue").toBe(6.5);
    expect(l.pricePct).toBe(99);
    expect(l.clientName).toBe(client.name);
    expect(l.state).toBe("ouverte");
  });

  it("refuse ce que le gabarit refuse, avec les mêmes mots", async () => {
    const { deposerLaLigne } = await import("@/app/sondage/actions");
    const sans = async (champ: string) => {
      const f = form(LIGNE);
      f.delete(champ);
      return deposerLaLigne(null, f);
    };
    expect((await sans("tenor")).ok, "une ligne sans durée est passée").toBe(false);
    expect((await sans("montant")).ok, "une ligne sans montant est passée").toBe(false);
    expect((await sans("dansJours")).ok, "une ligne sans « à partir de quand » est passée").toBe(false);
    const r = await deposerLaLigne(null, form({ ...LIGNE, rate: "65" }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/faute de frappe/);
  });

  it("refuse un Trésor hors de la zone", async () => {
    const { deposerLaLigne } = await import("@/app/sondage/actions");
    const r = await deposerLaLigne(null, form({ ...LIGNE, country: "France" }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/zone/);
  });

  /* UN BON N'A PAS DE PRIX, et l'action le laisse tomber plutôt que de refuser
     l'ordre : le client qui change de compartiment après avoir rempli le prix
     ne doit pas voir son dépôt refusé pour un champ que l'écran venait de
     cacher. C'est la contrainte de la base qui l'exige, et elle est tenue. */
  it("laisse tomber le prix sur un bon au lieu de refuser le dépôt", async () => {
    const { deposerLaLigne } = await import("@/app/sondage/actions");
    const { repo } = await import("@/lib/data");
    const res = await deposerLaLigne(null, form({ ...LIGNE, instrument: "BTA", tenor: "52 semaines", rate: "5,5", pricePct: "99" }));
    expect(res.ok, res.ok ? "" : res.error).toBe(true);
    if (!res.ok) return;
    const l = (await repo().listLignesSondees({ userId: client.userId })).find((x) => x.ref === res.ref)!;
    expect(l.pricePct, "un prix a été gardé sur un bon : la base le refusera").toBeUndefined();
    expect(l.rate).toBe(5.5);
  });

  /**
   * UNE RÉPONSE HÉRITE DE SA QUESTION, et c'est tout l'intérêt d'y répondre.
   *
   * Le client y dit « combien » et « quand » ; le Trésor, la durée et le
   * compartiment viennent de la question. Sans cet héritage, un formulaire
   * trafiqué produirait une réponse qui ne répond pas à ce qu'on a demandé, et
   * la consolidation la compterait quand même — sous l'en-tête de la question.
   */
  it("fait hériter une réponse des caractéristiques de sa question", async () => {
    const { deposerLaLigne } = await import("@/app/sondage/actions");
    const { repo } = await import("@/lib/data");
    const r = repo();
    const question = (await r.listLignesSondees({ origine: "desk" })).find((q) => q.state !== "close")!;
    expect(question, "le jeu d'essai doit porter une question ouverte").toBeTruthy();

    // On ment sur le pays et la durée : la question doit gagner.
    const res = await deposerLaLigne(null, form({ repondA: question.id, instrument: "BTA", country: "Tchad", tenor: "99 ans", montant: "20 000 000", dansJours: "15" }));
    expect(res.ok, res.ok ? "" : res.error).toBe(true);
    if (!res.ok) return;
    const l = (await r.listLignesSondees({ userId: client.userId })).find((x) => x.ref === res.ref)!;
    expect(l.repondA).toBe(question.id);
    expect(l.country, "la réponse a imposé son propre Trésor à la question").toBe(question.country);
    expect(l.tenor, "la réponse a imposé sa propre durée").toBe(question.tenor);
    expect(l.instrument, "la réponse a imposé son propre compartiment").toBe(question.instrument);
    expect(l.montant).toBe(20_000_000);
  });

  /* DEUX RÉPONSES À LA MÊME QUESTION COMPTERAIENT DEUX FOIS dans le consensus
     porté au Trésor, et le client qui corrige son montant croirait l'avoir
     remplacé. La seconde remplace donc la première. */
  it("remplace la réponse précédente au lieu de l'additionner", async () => {
    const { deposerLaLigne } = await import("@/app/sondage/actions");
    const { repo } = await import("@/lib/data");
    const r = repo();
    const question = (await r.listLignesSondees({ origine: "desk" })).find((q) => q.state !== "close")!;
    courant = { ...client, userId: "u-double" };
    await deposerLaLigne(null, form({ repondA: question.id, instrument: "OTA", montant: "10 000 000", dansJours: "10" }));
    await deposerLaLigne(null, form({ repondA: question.id, instrument: "OTA", montant: "40 000 000", dansJours: "10" }));
    const siennes = (await r.listLignesSondees({ userId: "u-double" })).filter((x) => x.repondA === question.id);
    courant = client;
    expect(siennes.filter((x) => x.state !== "close"), "deux réponses vivantes du même client sur la même question").toHaveLength(1);
    expect(siennes.find((x) => x.state !== "close")!.montant).toBe(40_000_000);
    expect(siennes.find((x) => x.state === "close")!.closedReason).toMatch(/Remplacée/);
  });

  it("laisse le client retirer la sienne, et seulement la sienne", async () => {
    const { deposerLaLigne, retirerLaLigne } = await import("@/app/sondage/actions");
    const { repo } = await import("@/lib/data");
    const res = await deposerLaLigne(null, form(LIGNE));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const r = repo();
    const mienne = (await r.listLignesSondees({ userId: client.userId })).find((x) => x.ref === res.ref)!;
    expect((await retirerLaLigne(mienne.id)).ok).toBe(true);
    expect((await r.listLignesSondees({ userId: client.userId })).find((x) => x.id === mienne.id)!.state).toBe("close");

    /* CELLE D'UN AUTRE NE SE RETIRE PAS. Sans ce refus, l'identifiant d'une
       attente — qui paraît dans l'URL d'aucune page mais traverse un
       formulaire — suffirait à retirer la demande d'un concurrent. */
    const autre = (await r.listLignesSondees({ origine: "desk" }))[0];
    expect((await retirerLaLigne(autre.id)).ok, "une attente qui n'est pas la sienne s'est retirée").toBe(false);
  });
});

describe("ce que le desk en fait", () => {
  it("pose une question, qui paraît sans nom de client", async () => {
    const { poserLaQuestion } = await import("@/app/desk/sondage/actions");
    const { repo } = await import("@/lib/data");
    const res = await poserLaQuestion(null, form({ instrument: "BTA", country: "Tchad", tenor: "13 semaines", rate: "5", montant: "300 000 000", dansJours: "20" }));
    expect(res.ok, res.ok ? "" : res.error).toBe(true);
    const q = (await repo().listLignesSondees({ origine: "desk" })).find((x) => x.tenor === "13 semaines")!;
    expect(q.userId, "une question du desk porte un client : elle paraîtrait comme l'attente de quelqu'un").toBeUndefined();
    expect(q.montant).toBe(300_000_000);
  });

  /**
   * LA CLÔTURE EMPORTE LES RÉPONSES, et le motif suit.
   *
   * Une réponse à une question close n'attend plus rien ; la laisser ouverte la
   * ferait compter dans un consensus sans en-tête. Et une attente qui disparaît
   * sans un mot est une attente qu'on ne redonnera pas : le client lit le motif
   * sur sa page.
   */
  it("clôt une question avec ses réponses, et chacune porte le motif", async () => {
    const { poserLaQuestion, statuerSurLaLigne } = await import("@/app/desk/sondage/actions");
    const { deposerLaLigne } = await import("@/app/sondage/actions");
    const { repo } = await import("@/lib/data");
    const r = repo();
    await poserLaQuestion(null, form({ instrument: "OTA", country: "Guinée éq.", tenor: "8 ans", montant: "200 000 000", dansJours: "40" }));
    const q = (await r.listLignesSondees({ origine: "desk" })).find((x) => x.tenor === "8 ans")!;
    courant = { ...client, userId: "u-clos" };
    const rep = await deposerLaLigne(null, form({ repondA: q.id, instrument: "OTA", montant: "15 000 000", dansJours: "12" }));
    courant = client;
    expect(rep.ok).toBe(true);

    const res = await statuerSurLaLigne(null, form({ id: q.id, etat: "close", motif: "Le Trésor a confirmé qu'il n'émettra pas sur cette durée." }));
    expect(res.ok, res.ok ? "" : res.error).toBe(true);
    const toutes = await r.listLignesSondees();
    expect(toutes.find((x) => x.id === q.id)!.state).toBe("close");
    const suite = toutes.find((x) => x.repondA === q.id)!;
    expect(suite.state, "la réponse est restée ouverte sous une question close").toBe("close");
    expect(suite.closedReason, "la réponse a été close sans un mot au client").toBeTruthy();
  });

  it("constate « portée au Trésor » sur la question et ses réponses", async () => {
    const { poserLaQuestion, statuerSurLaLigne } = await import("@/app/desk/sondage/actions");
    const { deposerLaLigne } = await import("@/app/sondage/actions");
    const { repo } = await import("@/lib/data");
    const r = repo();
    await poserLaQuestion(null, form({ instrument: "OTA", country: "Gabon", tenor: "9 ans", montant: "200 000 000", dansJours: "40" }));
    const q = (await r.listLignesSondees({ origine: "desk" })).find((x) => x.tenor === "9 ans")!;
    courant = { ...client, userId: "u-portee" };
    await deposerLaLigne(null, form({ repondA: q.id, instrument: "OTA", montant: "15 000 000", dansJours: "12" }));
    courant = client;
    await statuerSurLaLigne(null, form({ id: q.id, etat: "consolidee" }));
    const toutes = await r.listLignesSondees();
    expect(toutes.find((x) => x.id === q.id)!.state).toBe("consolidee");
    expect(toutes.find((x) => x.repondA === q.id)!.state).toBe("consolidee");
  });

  it("refuse un état qu'il ne connaît pas", async () => {
    const { statuerSurLaLigne } = await import("@/app/desk/sondage/actions");
    const { repo } = await import("@/lib/data");
    const q = (await repo().listLignesSondees({ origine: "desk" }))[0];
    const res = await statuerSurLaLigne(null, form({ id: q.id, etat: "ouverte" }));
    expect(res.ok).toBe(false);
  });
});

/**
 * MODIFIER SON INTENTION : SUR PLACE, ET SOUS LA MÊME RÉFÉRENCE.
 *
 * « Ajouter “modifier” comme possibilité. » Ce que l'action doit faire n'est pas
 * « retirer puis redéposer » : la référence est l'adresse à laquelle le client et
 * le desk se parlent au téléphone — « votre SD-1022 » — et un client qui corrige
 * un chiffre n'a pas changé d'intention. Lui faire perdre son adresse, c'est lui
 * faire croire qu'il a fait deux fois quelque chose, et c'est faire compter deux
 * lignes au desk là où il n'y en a qu'une.
 */
describe("la modification d'une intention", () => {
  it("écrit sur place, garde la référence, et ne crée rien", async () => {
    const { deposerLaLigne, modifierLaLigne } = await import("@/app/sondage/actions");
    const { repo } = await import("@/lib/data");
    courant = client;
    const dep = await deposerLaLigne(null, form({ ...LIGNE, rate: "6,5" }));
    expect(dep.ok, dep.ok ? "" : dep.error).toBe(true);
    if (!dep.ok) return;
    const avant = (await repo().listLignesSondees({ userId: client.userId })).find((x) => x.ref === dep.ref)!;
    const combien = (await repo().listLignesSondees({ userId: client.userId })).length;

    const mod = await modifierLaLigne(null, form({ ...LIGNE, id: avant.id, montant: "60 000 000", rate: "6,75" }));
    expect(mod.ok, mod.ok ? "" : mod.error).toBe(true);
    if (!mod.ok) return;
    expect(mod.ref, "la modification a changé l'adresse de l'intention").toBe(avant.ref);

    const apres = (await repo().listLignesSondees({ userId: client.userId })).find((x) => x.id === avant.id)!;
    expect(apres.montant).toBe(60_000_000);
    expect(apres.rate).toBe(6.75);
    expect(apres.state, "une intention modifiée ne doit pas se clore").toBe("ouverte");
    expect((await repo().listLignesSondees({ userId: client.userId })).length, "la modification a créé une seconde ligne : le desk en compterait deux").toBe(combien);
  });

  it("refuse l'intention d'un autre, et celle qui est close", async () => {
    const { deposerLaLigne, modifierLaLigne, retirerLaLigne } = await import("@/app/sondage/actions");
    courant = client;
    const dep = await deposerLaLigne(null, form(LIGNE));
    expect(dep.ok).toBe(true);
    if (!dep.ok) return;
    const { repo } = await import("@/lib/data");
    const sienne = (await repo().listLignesSondees({ userId: client.userId })).find((x) => x.ref === dep.ref)!;

    /* UN AUTRE CLIENT NE LA TOUCHE PAS. Le formulaire ne le propose pas ; cette
       action s'appelle sans formulaire, par un POST reconstruit. */
    courant = { ...client, userId: "u-autre", name: "Autre" };
    const vol = await modifierLaLigne(null, form({ ...LIGNE, id: sienne.id, montant: "999 000 000" }));
    expect(vol.ok, "un client a modifié l'intention d'un autre").toBe(false);
    if (!vol.ok) expect(vol.error).toMatch(/n'est pas la vôtre/);

    /* ET UNE INTENTION CLOSE NE SE ROUVRE PAS PAR UNE MODIFICATION : le desk a
       déjà agi dessus ou cessé de la compter, et la rouvrir ferait rentrer dans
       un consensus une demande que plus personne ne surveille. */
    courant = client;
    await retirerLaLigne(sienne.id);
    const close = await modifierLaLigne(null, form({ ...LIGNE, id: sienne.id, montant: "60 000 000" }));
    expect(close.ok, "une intention close s'est rouverte par une modification").toBe(false);
    if (!close.ok) expect(close.error).toMatch(/close/);
  });

  it("refuse les mêmes manques qu'un dépôt, et ne touche à rien quand elle refuse", async () => {
    const { deposerLaLigne, modifierLaLigne } = await import("@/app/sondage/actions");
    const { repo } = await import("@/lib/data");
    courant = client;
    const dep = await deposerLaLigne(null, form({ ...LIGNE, rate: "6,5" }));
    expect(dep.ok).toBe(true);
    if (!dep.ok) return;
    const avant = (await repo().listLignesSondees({ userId: client.userId })).find((x) => x.ref === dep.ref)!;

    /* Un taux de 65 au lieu de 6,5 : le dépôt le refuse, la modification aussi,
       sinon la table aurait deux portes et une seule serrure. */
    const faux = await modifierLaLigne(null, form({ ...LIGNE, id: avant.id, rate: "65" }));
    expect(faux.ok, "une modification a fait passer ce qu'un dépôt refuse").toBe(false);
    const inchange = (await repo().listLignesSondees({ userId: client.userId })).find((x) => x.id === avant.id)!;
    expect(inchange.rate, "le refus a quand même écrit").toBe(6.5);
    expect(inchange.montant).toBe(50_000_000);
  });

  it("recompte le délai depuis la création, et pas depuis aujourd'hui", async () => {
    /**
     * L'ÉPREUVE QUI MANQUAIT, trouvée en vérifiant à l'envers le 26 octobre
     * 2026 : celle du dessous déposait la ligne À L'INSTANT, et sur une ligne du
     * jour la conversion ne déplace rien — elle restait donc verte avec la
     * conversion RETIRÉE. Une intention se modifie des jours après sa naissance,
     * et c'est là que le piège se referme.
     *
     * ON VIEILLIT DONC LA LIGNE avant de la rouvrir. Le client voit « il reste
     * N jours », tape N, et la base doit garder N + l'âge — sinon la date recule
     * de l'âge de la ligne, et sur une intention plus ancienne elle tombe dans
     * le passé, où le robot la clôt le soir même.
     */
    const { deposerLaLigne, modifierLaLigne } = await import("@/app/sondage/actions");
    const { repo } = await import("@/lib/data");
    const { prete, joursRestants } = await import("@/lib/domain/sondage");
    const { localIso } = await import("@/lib/format");
    courant = client;
    /* LA LIGNE NAÎT DOUZE JOURS PLUS TÔT : l'horloge recule le temps du dépôt,
       et revient avant la modification. C'est la seule façon d'obtenir une
       ligne âgée sans forcer une porte que le contrat ferme. */
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.now() - 12 * 86_400_000));
    const dep = await deposerLaLigne(null, form({ ...LIGNE, dansJours: "30" }));
    vi.useRealTimers();
    expect(dep.ok, dep.ok ? "" : dep.error).toBe(true);
    if (!dep.ok) return;
    const l = (await repo().listLignesSondees({ userId: client.userId })).find((x) => x.ref === dep.ref)!;

    /* DOUZE JOURS DE PLUS AU COMPTEUR : « dans 30 jours » posé il y a douze
       jours, c'est dans dix-huit. On ne vieillit pas la ligne après coup — le
       dépôt en mémoire rend des copies, et le contrat ne laisse pas toucher une
       date de naissance, ce qui est très bien ainsi : on avance l'horloge. */
    const vieillie = l;
    const aujourdHui = localIso(new Date());
    expect(joursRestants(vieillie, aujourdHui), "l'âge supposé est faux : l'épreuve ne mesure rien").toBe(18);

    /* Le client lit « 18 », garde 18, et sa date ne doit pas bouger d'un jour.
       Écrit tel quel, le délai ramènerait la date douze jours en arrière. */
    const mod = await modifierLaLigne(null, form({ ...LIGNE, id: l.id, dansJours: "18" }));
    expect(mod.ok, mod.ok ? "" : mod.error).toBe(true);
    const apres = (await repo().listLignesSondees({ userId: client.userId })).find((x) => x.id === l.id)!;
    expect(apres.dansJours, "le délai n'a pas été recompté depuis la création : la date vient de reculer de douze jours").toBe(30);
    expect(prete(apres), "la date de l'intention a bougé sans que personne la touche").toBe(prete(vieillie));
  });

  it("ne laisse pas la modification déplacer la date de l'intention", async () => {
    /* LE PIÈGE SANS SYMPTÔME, et c'est pour lui que cette épreuve existe : le
       délai est gardé DEPUIS LA CRÉATION, le client le pense depuis aujourd'hui.
       Rouvrir et réenregistrer le nombre que le champ montre ne doit pas bouger
       la date d'un jour. L'arithmétique est tenue par « sondage » ; ce qu'on
       mesure ici est que l'action l'emploie vraiment. */
    const { deposerLaLigne, modifierLaLigne } = await import("@/app/sondage/actions");
    const { repo } = await import("@/lib/data");
    const { prete, joursRestants } = await import("@/lib/domain/sondage");
    const { localIso } = await import("@/lib/format");
    courant = client;
    const dep = await deposerLaLigne(null, form({ ...LIGNE, dansJours: "30" }));
    expect(dep.ok).toBe(true);
    if (!dep.ok) return;
    const avant = (await repo().listLignesSondees({ userId: client.userId })).find((x) => x.ref === dep.ref)!;
    const vise = prete(avant);

    const aujourdHui = localIso(new Date());
    const montre = joursRestants(avant, aujourdHui)!;
    const mod = await modifierLaLigne(null, form({ ...LIGNE, id: avant.id, montant: "60 000 000", dansJours: String(montre) }));
    expect(mod.ok, mod.ok ? "" : mod.error).toBe(true);
    const apres = (await repo().listLignesSondees({ userId: client.userId })).find((x) => x.id === avant.id)!;
    expect(prete(apres), "la modification a déplacé la date sans que personne la touche").toBe(vise);
  });
});

/**
 * CE QUE LE DESK APPREND, ET CE QUE LE CLIENT APPREND.
 *
 * LES DEUX TROUS DE LA REVUE À 360° du 26 octobre 2026, et ils se ressemblent :
 * une écriture exacte en base, et personne de prévenu.
 *
 *   LE SONDAGE N'ÉCRIVAIT RIEN AU FIL DU DESK. C'était le SEUL geste client de
 *   toute l'application dans ce cas — un mandat signé, un versement demandé, un
 *   ordre retiré y sont tous. Une attente poussée à onze heures n'apparaissait
 *   nulle part sur « /desk », et la tuile du matin ne compte que les groupes
 *   déjà mûrs : « reçue par le desk » était vrai de la base et faux de la
 *   maison.
 *
 *   ET LA CONSOLIDATION ÉTAIT MUETTE côté client, alors que sa page lui promet
 *   « le desk vous rappellera avant la clôture ».
 *
 * CES ÉPREUVES LISENT CE QUI EST ÉCRIT, pas le code : un `logEvent` peut être
 * appelé avec une phrase vide, et une notification peut partir sans nommer la
 * ligne. Ce qu'on vérifie est ce qu'un humain lira.
 */
describe("ce que le sondage dit au desk et au client", () => {
  it("porte au fil du desk le dépôt, la modification et le retrait", async () => {
    const { deposerLaLigne, modifierLaLigne, retirerLaLigne } = await import("@/app/sondage/actions");
    const { repo } = await import("@/lib/data");
    courant = client;
    const dep = await deposerLaLigne(null, form({ ...LIGNE, rate: "6,5" }));
    expect(dep.ok, dep.ok ? "" : dep.error).toBe(true);
    if (!dep.ok) return;
    const ligne = (await repo().listLignesSondees({ userId: client.userId })).find((x) => x.ref === dep.ref)!;

    const dit = async () => (await repo().listEvents(50)).filter((e) => e.html.includes(dep.ref)).map((e) => e.html);
    const apresDepot = await dit();
    expect(apresDepot.length, "le dépôt d'une attente n'arrive pas au fil du desk : il ne se verra que sur la page du sondage").toBeGreaterThan(0);
    /* Le desk doit pouvoir décider sans ouvrir la page : qui, quoi, combien. */
    expect(apresDepot[0], "le fil ne dit pas qui a poussé l'attente").toContain(client.name);
    expect(apresDepot[0], "le fil ne dit pas le montant").toMatch(/50\s?000\s?000|50 000 000/);

    await modifierLaLigne(null, form({ ...LIGNE, id: ligne.id, montant: "60 000 000", rate: "6,5" }));
    const apresModif = await dit();
    expect(apresModif.length, "la modification n'arrive pas au fil du desk").toBeGreaterThan(apresDepot.length);
    /* L'AVANT ET L'APRÈS : le desk a pu porter la première version dans sa
       tête, et « modifiée » sans chiffres l'obligerait à rouvrir la page. */
    expect(apresModif[0], "le fil ne dit pas ce qui a changé").toMatch(/→/);

    await retirerLaLigne(ligne.id);
    const apresRetrait = await dit();
    expect(apresRetrait.length, "le retrait n'arrive pas au fil du desk, alors qu'il enlève des francs d'un consensus").toBeGreaterThan(apresModif.length);
    expect(apresRetrait[0], "le fil ne dit pas que l'attente est retirée").toMatch(/retire/i);
  });

  it("prévient chaque client quand le desk porte la ligne au Trésor", async () => {
    const { deposerLaLigne } = await import("@/app/sondage/actions");
    const { poserLaQuestion, statuerSurLaLigne } = await import("@/app/desk/sondage/actions");
    const { repo } = await import("@/lib/data");

    /* UN CLIENT JOIGNABLE : « getContact » décide seul si un message peut
       partir, et un client sans canal ne mesurerait que le cas d'échec. */
    const joignable = { ...client, userId: "c-avc", name: "Assur-Vie Centrale" };
    courant = desk;
    const q = await poserLaQuestion(null, form({ instrument: "OTA", country: "Cameroun", tenor: "7 ans", rate: "6,8", montant: "400 000 000", dansJours: "25" }));
    expect(q.ok, q.ok ? "" : q.error).toBe(true);
    const question = (await repo().listLignesSondees({ origine: "desk" })).find((x) => x.tenor === "7 ans")!;

    courant = joignable;
    const rep = await deposerLaLigne(null, form({ repondA: question.id, instrument: "OTA", montant: "100 000 000", dansJours: "20" }));
    expect(rep.ok, rep.ok ? "" : rep.error).toBe(true);
    if (!rep.ok) return;

    const avant = (await repo().listNotifications(200)).length;
    courant = desk;
    const st = await statuerSurLaLigne(null, form({ id: question.id, etat: "consolidee" }));
    expect(st.ok, st.ok ? "" : st.error).toBe(true);

    const apres = await repo().listNotifications(200);
    const siennes = apres.filter((n) => n.body.includes(rep.ref));
    expect(apres.length, "la consolidation n'a prévenu personne : la page promet pourtant un rappel").toBeGreaterThan(avant);
    expect(siennes.length, "le client dont la ligne est portée n'est pas nommément prévenu").toBeGreaterThan(0);
    /* CE QUE LE MESSAGE NE DOIT PAS DIRE : aucune séance promise. La maison
       n'adjuge pas, et un client qui lirait « vous recevrez des titres » la
       tiendrait pour responsable du silence d'un État. */
    const texte = siennes[0].body;
    expect(texte, "le message ne dit pas que la ligne est portée").toMatch(/portée au Trésor/);
    expect(texte, "le message ne redit pas que rien n'engage le client").toMatch(/Rien ne vous engage/);
    expect(texte, "le message promet une séance que personne n'a annoncée").not.toMatch(/vous recevrez|sera émise|aura lieu/i);
  });
});
