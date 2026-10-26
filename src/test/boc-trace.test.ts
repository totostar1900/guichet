import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { RACINE } from "./racine";
import { memoryRepository as r } from "@/lib/data/memory";
import { cloturerLesSorties } from "@/lib/market/boc";
import type { Offer } from "@/lib/domain/types";

/**
 * CE QUE LE ROBOT DU BULLETIN LAISSE DERRIÈRE LUI.
 *
 * RELEVÉ À LA REVUE DES ROBOTS du 26 octobre 2026, et c'est la trouvaille la
 * plus sournoise du lot : ce robot était la SEULE porte de la maison à écrire
 * une offre sans `expectedVersion`.
 *
 * L'ASYMÉTRIE ÉTAIT LE DANGER, et non l'absence de garde. Quand le robot
 * écrivait pendant la saisie du desk, le desk se voyait refusé et le savait.
 * Dans l'autre sens, le robot écrasait le geste du desk en silence — et comme
 * il POSAIT lui-même `version + 1`, le numéro qu'il laissait pouvait être
 * exactement celui que le desk venait de poser. Plus rien, ensuite, ne
 * permettait de voir que deux écritures différentes avaient porté la même
 * version. La ligne lue cent millisecondes trop tôt gagnait.
 *
 * ET LA CLÔTURE D'UNE LIGNE NE LAISSAIT AUCUNE TRACE, là où le desk qui fait
 * le même geste à la main laisse « offer.withdraw » avec le même après. Le même
 * événement tracé par une porte et pas par l'autre : le registre paraissait
 * complet.
 */
const ligne = (o: Partial<Offer>): Offer =>
  ({
    id: "boc-essai",
    kind: "MARCHE",
    isin: "CM0000099999",
    title: "Essai · obligation",
    issuer: "État",
    country: "Cameroun",
    currency: "FCFA",
    status: "published",
    hidden: false,
    blurb: "",
    documents: [],
    nominal: 10_000,
    commissionPct: 0,
    version: 4,
    ...o,
  }) as Offer;

describe("la clôture d'une ligne sortie de la cote", () => {
  beforeEach(async () => {
    for (const o of await r.listOffers()) if (o.id.startsWith("boc-essai")) await r.upsertOffer({ ...o, status: "published", version: o.version + 1 });
  });

  it("s'inscrit au registre, avec son avant, son après et la main du robot", async () => {
    const o = await r.upsertOffer(ligne({ id: "boc-essai-1" }));
    const bouges = await cloturerLesSorties([{ offerId: o.id, detail: "absente de 5 séances · échéance passée" }], await r.listOffers());

    expect(bouges).toEqual([]);
    expect((await r.listOffers()).find((x) => x.id === o.id)!.status).toBe("matured");

    const lignes = await r.listAudit({ entity: "offer", entityId: o.id });
    expect(lignes).toHaveLength(1);
    const [a] = lignes;
    /* LE MÊME NOM QUE LA PORTE HUMAINE : c'est tout le point. Un desk qui
       cherche « qui a clôturé cette ligne » filtre une action, pas deux. */
    expect(a.action).toBe("offer.withdraw");
    expect((a.before as { status: string; version: number })).toEqual({ status: "published", version: o.version });
    expect((a.after as { status: string }).status).toBe("matured");
    expect(a.actor).toMatch(/robot/i);
    expect(a.actor).not.toBe("système");
    // Le motif de la sortie voyage avec la ligne : sans lui, « clôturée » n'est pas une réponse.
    expect(a.reason).toContain("échéance passée");
  });

  it("laisse la ligne tranquille quand une main l'a bougée pendant le tour", async () => {
    /* LE SENS QUI MANQUAIT. Le desk republie la ligne à l'instant où le robot
       s'apprête à la clôturer : c'est le desk qui gagne, et le robot le dit au
       lieu de l'écraser. */
    const o = await r.upsertOffer(ligne({ id: "boc-essai-2", version: 4 }));
    /* L'instantané du rapprochement : il a vu la version 4. Le desk écrit
       ensuite, et c'est cela que le robot ne doit pas écraser. */
    const vues = await r.listOffers();
    await r.upsertOffer({ ...o, blurb: "le desk vient d'écrire ici", version: 5 });

    const bouges = await cloturerLesSorties([{ offerId: o.id, detail: "absente de 5 séances" }], vues);

    expect(bouges).toEqual([o.title]);
    const apres = (await r.listOffers()).find((x) => x.id === o.id)!;
    expect(apres.status).toBe("published");
    expect(apres.blurb).toBe("le desk vient d'écrire ici");
    expect(apres.version).toBe(5);
    // Rien n'a eu lieu : rien n'est au registre.
    expect(await r.listAudit({ entity: "offer", entityId: o.id })).toHaveLength(0);
  });

  it("un conflit sur une ligne ne coûte pas les autres", async () => {
    /* Le tour écrit cent lignes. Lever sur la première rendrait la cote de la
       journée à la merci d'une seule saisie du desk. */
    const bougee = await r.upsertOffer(ligne({ id: "boc-essai-3", version: 4 }));
    const saine = await r.upsertOffer(ligne({ id: "boc-essai-4", title: "Essai · action", version: 2 }));
    const vues = await r.listOffers();
    await r.upsertOffer({ ...bougee, version: 9 });

    const bouges = await cloturerLesSorties(
      [
        { offerId: bougee.id, detail: "absente de 5 séances" },
        { offerId: saine.id, detail: "absente de 6 séances" },
      ],
      vues,
    );

    expect(bouges).toEqual([bougee.title]);
    expect((await r.listOffers()).find((x) => x.id === saine.id)!.status).toBe("matured");
    expect(await r.listAudit({ entity: "offer", entityId: saine.id })).toHaveLength(1);
  });

  it("ne clôture rien quand on ne lui donne rien", async () => {
    // Non vacuité : une fonction qui clôturerait tout passerait les trois ci-dessus.
    const o = await r.upsertOffer(ligne({ id: "boc-essai-5" }));
    expect(await cloturerLesSorties([], await r.listOffers())).toEqual([]);
    expect((await r.listOffers()).find((x) => x.id === o.id)!.status).toBe("published");
    expect(await r.listAudit({ entity: "offer", entityId: o.id })).toHaveLength(0);
  });
});

describe("toute écriture d'offre du robot porte sa garde de version", () => {
  it("aucune ne s'en passe, et le relevé voit bien quelque chose", () => {
    /* LE CLIQUET QUI MANQUAIT. Trois écritures vivaient dans ce module, aucune
       gardée ; une quatrième l'aurait été de la même façon, et le défaut est
       invisible à la lecture — une écriture sans garde ressemble trait pour
       trait à une écriture gardée, jusqu'au jour où deux mains se croisent.

       L'ingestion elle-même n'est pas éprouvable sans un PDF de huit cents
       kilo-octets absent du dépôt, d'où ce balayage de source : il est faible,
       mais il tient la seule chose qu'on ne peut pas voir autrement. */
    const src = readFileSync(`${RACINE}/src/lib/market/boc.ts`, "utf8");
    const ecritures = src.match(/r\.upsertOffer\([^;]*/g) ?? [];
    expect(ecritures.length).toBeGreaterThanOrEqual(2);
    const sansGarde = ecritures.filter((e) => !/expectedVersion/.test(e));
    expect(sansGarde, "une écriture d'offre du robot sans garde de version").toEqual([]);
    // Et la main est nommée sur l'historique de version, pas seulement dans l'audit.
    expect(ecritures.filter((e) => !/by: ROBOT/.test(e))).toEqual([]);
  });
});
