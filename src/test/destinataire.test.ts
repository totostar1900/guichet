import { readFileSync, readdirSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RACINE } from "./racine";
import type { ClientFile } from "@/lib/domain/kyc";
import type { Contact } from "@/lib/domain/types";

/**
 * À QUI ON PARLE, QUAND ON NE PARLE PAS D'UN ORDRE.
 *
 * Ce résolveur a été écrit le 26 octobre 2026 parce que des modules d'envoi
 * s'étaient mis à chercher le destinataire chacun à sa façon : un client aurait
 * été prévenu d'un versement et pas d'une consolidation, pour la seule raison
 * que l'un cherchait moins loin que l'autre.
 *
 * ET IL N'AVAIT AUCUNE ÉPREUVE, ce qui est l'ironie de l'affaire : le module
 * dont tout le travail est d'empêcher une dérive ne tenait rien lui-même. Deux
 * défauts y ont vécu jusqu'à cette feuille, et aucun des deux ne se voit à la
 * lecture.
 *
 * LE PREMIER : il rendait l'entrée de répertoire DÈS QU'ELLE EXISTAIT. En base,
 * le répertoire est la table des profils, un profil existe pour tout compte, et
 * son numéro comme son adresse peuvent être nuls tous les deux — `createClientFile`
 * n'y recopie rien, seul `updateClientFile` le fait. Le client reçu au guichet,
 * dont la fiche vient d'être ouverte avec ses coordonnées, avait donc un profil
 * vide, le résolveur s'arrêtait dessus, et l'envoi échouait sur « aucun canal
 * joignable » — dans le cas EXACT pour lequel le repli sur le dossier existait.
 *
 * LE SECOND, dans la copie à la main du module des prélèvements : l'accord
 * WhatsApp déduit de la présence d'un numéro.
 *
 * ─── POURQUOI LE DÉPÔT EST SIMULÉ ICI ──────────────────────────────────────
 *
 * Le dépôt en mémoire rend joignable le propriétaire de toute fiche qu'on y
 * ouvre : « le répertoire est vide mais le dossier porte un numéro » ne s'y
 * fabrique pas, et c'est la seule situation qui compte. Deux sources en entrée,
 * un contact en sortie : on les donne telles quelles.
 */
const sources = vi.hoisted(() => ({ contact: undefined as Contact | undefined, dossier: undefined as ClientFile | undefined }));
vi.mock("@/lib/data", () => ({
  repo: () => ({
    getContact: async () => sources.contact,
    getClientFileByUser: async () => sources.dossier,
  }),
}));

const { contactDuClient } = await import("@/lib/notify/destinataire");

const repertoire = (c: Partial<Contact>): Contact => ({ id: "u1", name: "Au Répertoire", segment: "Personne physique", whatsappOptIn: false, ...c });
const fiche = (identity: Partial<ClientFile["identity"]>, consents: ClientFile["consents"] = {}): ClientFile =>
  ({ id: "f1", userId: "u1", kind: "physique", status: "approuve", identity: { name: "Au Dossier", ...identity }, persons: [], documents: [], funds: { pep: false }, profile: { category: "non_professionnel" }, consents, review: {}, createdAt: "", updatedAt: "" }) as ClientFile;

describe("le destinataire d'un client", () => {
  beforeEach(() => {
    sources.contact = undefined;
    sources.dossier = undefined;
  });

  it("vient du répertoire dès qu'il porte un canal", async () => {
    sources.contact = repertoire({ email: "r@exemple.com", whatsappOptIn: true, phone: "+237600000001" });
    sources.dossier = fiche({ email: "d@exemple.com", phone: "+237699999999" });
    const c = await contactDuClient("u1");
    expect(c?.email, "le dossier a pris le pas sur le répertoire, qui porte ce qui est confirmé").toBe("r@exemple.com");
    expect(c?.phone).toBe("+237600000001");
    expect(c?.name).toBe("Au Répertoire");
  });

  it("complète du dossier ce que le répertoire laisse vide", async () => {
    /* LE CAS QUI A MOTIVÉ CE MODULE, et que le module ne traitait pas : un
       profil existe, vide, et la fiche porte tout. Un résolveur qui s'arrête au
       profil rend ce client INJOIGNABLE, et la maison croit l'avoir prévenu. */
    sources.contact = repertoire({ name: "", segment: "" });
    sources.dossier = fiche({ email: "d@exemple.com", phone: "+237600000002" });
    const c = await contactDuClient("u1");
    expect(c, "un client dont seul le dossier porte des coordonnées est resté injoignable").toBeTruthy();
    expect(c?.email).toBe("d@exemple.com");
    expect(c?.phone).toBe("+237600000002");
    expect(c?.name).toBe("Au Dossier");
  });

  it("un seul canal au répertoire suffit : le dossier ne complète pas l'autre", async () => {
    /* LA MOITIÉ SURPRENANTE DE LA RÈGLE, et elle est délibérée. Un profil qui
       porte un numéro et pas d'adresse dit que le client est joignable ; aller
       chercher dans la fiche une adresse que le répertoire ne nomme pas ferait
       écrire la maison quelque part que le registre confirmé n'annonce pas. Le
       repli sert le profil VIDE, qui est le cas qui cassait, et lui seul. */
    sources.contact = repertoire({ phone: "+237600000003" });
    sources.dossier = fiche({ phone: "+237699999999", email: "d@exemple.com" });
    const c = await contactDuClient("u1");
    expect(c?.phone, "un numéro confirmé a été remplacé par celui du dossier").toBe("+237600000003");
    expect(c?.email, "la maison écrirait à une adresse que le répertoire ne nomme pas").toBeUndefined();
  });

  it("ne ressuscite jamais un accord WhatsApp révoqué", async () => {
    /* LA FAUTE GRAVE QU'UN REPLI NAÏF COMMETTRAIT. Révoquer l'accord écrit
       « whatsapp_opt_in = false » sur le profil et NE TOUCHE PAS à
       « consents.whatsappAt » du dossier. Lire l'accord du dossier dès qu'on
       complète un canal enverrait donc un message à quelqu'un qui a dit non. */
    sources.contact = repertoire({ whatsappOptIn: false });
    sources.dossier = fiche({ phone: "+237600000004" }, { whatsappAt: "2026-01-01T00:00:00.000Z" });
    expect((await contactDuClient("u1"))?.whatsappOptIn).toBe(false);
  });

  it("sans répertoire du tout, la date du dossier est le seul accord qu'on ait", async () => {
    sources.dossier = fiche({ phone: "+237600000005" }, { whatsappAt: "2026-01-01T00:00:00.000Z" });
    expect((await contactDuClient("u1"))?.whatsappOptIn).toBe(true);
  });

  it("ne suppose pas l'accord d'un numéro", async () => {
    // Le numéro est un fait ; l'accord d'être joint par ce canal est un consentement.
    sources.dossier = fiche({ phone: "+237600000006" });
    expect((await contactDuClient("u1"))?.whatsappOptIn).toBe(false);
  });

  it("ne rend personne quand il n'y a ni numéro ni adresse", async () => {
    /* Non vacuité : un résolveur qui fabriquerait toujours un contact passerait
       toutes les épreuves ci-dessus, et la maison croirait joindre un client
       dont elle n'a aucune coordonnée. */
    sources.contact = repertoire({});
    sources.dossier = fiche({});
    expect(await contactDuClient("u1")).toBeUndefined();
    sources.contact = undefined;
    sources.dossier = undefined;
    expect(await contactDuClient("u1")).toBeUndefined();
  });

  it("prend le nom de secours plutôt que l'identifiant", async () => {
    // « Bonjour u-9f3a… » est le genre de message qui apprend à ne plus les lire.
    sources.dossier = fiche({ name: "", email: "d@exemple.com" });
    expect((await contactDuClient("u1", "Nom de Secours"))?.name).toBe("Nom de Secours");
  });
});

/**
 * ET LA DÉRIVE NE DOIT PAS REVENIR.
 *
 * Elle avait survécu à deux endroits après l'écriture du résolveur — le module
 * du sondage, qui ne lisait que le répertoire, et celui des prélèvements, qui
 * portait une copie complète avec ses deux défauts — et rien ne l'avait
 * signalée. Un module qui cherche son destinataire lui-même ressemble trait
 * pour trait à un module qui le résout bien.
 */
describe("tout module de notification passe par un résolveur", () => {
  it("aucun ne cherche le répertoire pour son compte", () => {
    const D = `${RACINE}/src/lib/notify/`;
    /* TROIS RÉSOLVEURS SONT PERMIS, chacun pour une raison écrite :
       « destinataire » pour un client, « preavis » pour une instruction — qui
       porte le contact donné en la signant et doit atteindre là où le préavis
       est arrivé — et « dispatch » pour une intention, qui porte le contact
       donné en passant l'ordre. */
    const RESOLVEURS = ["destinataire.ts", "preavis.ts", "dispatch.ts"];
    const fichiers = readdirSync(D).filter((x) => x.endsWith(".ts") && !x.endsWith(".test.ts"));
    const fautifs = fichiers.filter((f) => !RESOLVEURS.includes(f) && /\.getContact\(/.test(readFileSync(`${D}${f}`, "utf8")));
    expect(fautifs, "un module d'envoi cherche le répertoire pour son compte : c'est ainsi que deux clients sont prévenus différemment").toEqual([]);
    // Non vacuité : le relevé doit avoir lu des modules, et les résolveurs doivent exister.
    expect(fichiers.length).toBeGreaterThan(4);
    for (const x of RESOLVEURS) expect(fichiers, `${x} a disparu : la liste des exceptions ne protège plus rien`).toContain(x);
  });
});
