import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * LE RÉFÉRENTIEL EST GARDÉ ENTRE LES REQUÊTES : CE QUI LE VIDE DOIT ÊTRE SÛR.
 *
 * Il coûtait 669 ms sur CHAQUE page des DEUX hôtes, relu intégralement à
 * chaque visiteur alors qu'il ne change que lorsqu'une personne du desk
 * publie. Le mettre en cache était le plus gros gain disponible, et aussi le
 * plus dangereux : un barème, une politique ou une durée périmés se servent
 * SANS BRUIT, et c'est la famille de pannes que la maison poursuit depuis le
 * 1er octobre.
 *
 * CE QUI LE REND SÛR N'EST PAS UNE DURÉE, C'EST UN ENDROIT UNIQUE. Toutes les
 * écritures passent par le dépôt, donc la purge vit dans son enveloppe
 * (« data/memo.ts ») plutôt que chez les six appelants d'aujourd'hui. Reste
 * le risque réel : qu'une méthode d'écriture NOUVELLE soit ajoutée à
 * l'interface sans être classée. Elle écrirait, et plus rien ne purgerait.
 *
 * Cet essai est là pour cela, et pour rien d'autre : il compare l'interface
 * du dépôt à la liste des purges, et tombe si une méthode portant
 * « Reference » n'est ni une lecture ni une écriture déclarée.
 */
const ROOT = path.resolve(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

const INTERFACE = lire("src/lib/data/repository.ts");
const MEMO = lire("src/lib/data/memo.ts");
const REFERENCE = lire("src/lib/reference.ts");

/** Les méthodes de l'interface dont le nom porte « Reference ». */
const methodesDuReferentiel = (): string[] => {
  const out = new Set<string>();
  for (const m of INTERFACE.matchAll(/^\s{2}(\w*[Rr]eference\w*)\s*\(/gm)) out.add(m[1]);
  return [...out].sort();
};

/** Ce qu'une liste nommée dans un fichier contient, lue dans la source. */
const ensemble = (src: string, nom: string): string[] => {
  const m = src.match(new RegExp(`${nom}\\s*=\\s*new Set\\(\\[([^\\]]*)\\]`));
  if (!m) return [];
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
};

describe("le référentiel en cache, et ce qui le vide", () => {
  const READS = ensemble(MEMO, "READS");
  const ECRITURES = ensemble(MEMO, "ECRITURES_DU_REFERENTIEL");

  it("trouve bien les listes à surveiller", () => {
    // Une garde qui ne lit rien passe toujours.
    expect(READS.length, "la liste des lectures est introuvable dans memo.ts").toBeGreaterThan(20);
    expect(ECRITURES.length, "la liste des écritures du référentiel est introuvable").toBeGreaterThan(0);
    expect(methodesDuReferentiel().length, "aucune méthode « Reference » dans l'interface du dépôt").toBeGreaterThanOrEqual(5);
  });

  it("chaque méthode du référentiel est classée : lecture, ou écriture qui purge", () => {
    const orphelines = methodesDuReferentiel().filter((m) => !READS.includes(m) && !ECRITURES.includes(m));
    expect(
      orphelines,
      `ces méthodes écrivent ou lisent le référentiel sans être classées.\n` +
        `Une écriture non classée ne purgerait pas le cache, et la maison servirait un barème périmé SANS BRUIT.\n` +
        `Les ranger dans « READS » ou dans « ECRITURES_DU_REFERENTIEL », dans src/lib/data/memo.ts :\n  ${orphelines.join("\n  ")}`,
    ).toEqual([]);
  });

  it("aucune écriture déclarée n'est aussi une lecture", () => {
    /* Une méthode dans les deux listes serait mémoïsée ET purgerait : le
       mémo rendrait la valeur d'avant l'écriture. */
    const deuxFois = ECRITURES.filter((m) => READS.includes(m));
    expect(deuxFois, "une méthode ne peut pas être à la fois lecture mémoïsée et écriture").toEqual([]);
  });

  it("la lecture porte l'étiquette que la purge vide", () => {
    expect(REFERENCE, "le référentiel doit être gardé entre les requêtes").toMatch(/unstable_cache\(/);
    expect(REFERENCE).toMatch(/tags:\s*\[ETIQUETTE_REFERENTIEL\]/);
    expect(MEMO, "la purge doit viser la même étiquette, importée et non recopiée").toMatch(/ETIQUETTE_REFERENTIEL/);
    expect(MEMO, "l'étiquette ne doit pas être réécrite à la main dans memo.ts").not.toMatch(/"referentiel"/);
  });

  it("aucun essai ne repose une simulation partielle de « next/cache »", () => {
    /**
     * DIX-SEPT ESSAIS LA POSAIENT CHACUN À SA FAÇON, avec les seules fonctions
     * dont ils avaient besoin ce jour-là. Le jour où la source en a importé
     * une de plus, cinquante-sept essais sont tombés d'un coup. Une simulation
     * partielle ne protège de rien : elle casse au premier ajout, et autant de
     * fois qu'il y a de copies. Elles passent toutes par « FAUX_NEXT_CACHE ».
     */
    const dossier = path.join(ROOT, "src/test");
    const fautifs: string[] = [];
    for (const f of fs.readdirSync(dossier)) {
      if (!f.endsWith(".ts") && !f.endsWith(".tsx")) continue;
      const src = fs.readFileSync(path.join(dossier, f), "utf8");
      for (const m of src.matchAll(/vi\.(?:do)?Mock\("next\/cache",\s*\(\)\s*=>\s*([^;]+)\);/g)) {
        if (!m[1].includes("FAUX_NEXT_CACHE")) fautifs.push(`${f} · ${m[1].slice(0, 44)}`);
      }
    }
    expect(fautifs, `ces essais simulent « next/cache » à la main :\n  ${fautifs.join("\n  ")}\n  Utiliser « FAUX_NEXT_CACHE » de « src/test/faux-next-cache.ts ».`).toEqual([]);
  });

  it("la lecture du référentiel survit hors d'une requête", () => {
    /* Les crons, les scripts et le robot lisent le référentiel sans rendre de
       page, et « unstable_cache » y jette « incrementalCache missing ». Sans
       repli, la note du matin et le ramassage de la BEAC tomberaient. */
    expect(REFERENCE, "la lecture gardée doit se rabattre sur une lecture nue").toMatch(/catch\s*\{\s*return direct\(kind\);/);
  });

  it("la purge expire tout de suite, et ne fait pas échouer l'écriture", () => {
    /* « updateTag » lit ce qu'on vient d'écrire ; « revalidateTag » seul
       servirait l'ancienne valeur une fois de plus, et une fois suffit. */
    expect(MEMO).toMatch(/updateTag\(ETIQUETTE_REFERENTIEL\)/);
    expect(MEMO, "hors action serveur, la purge doit se rabattre sans jeter").toMatch(/revalidateTag\(ETIQUETTE_REFERENTIEL,\s*\{\s*expire:\s*0\s*\}\)/);
    /* Une écriture passe avant son cache : les deux voies sont gardées. */
    const bloc = MEMO.slice(MEMO.indexOf("function purgerLeReferentiel"));
    expect((bloc.slice(0, bloc.indexOf("\n}")).match(/catch/g) ?? []).length, "les deux appels doivent être gardés").toBe(2);
  });
});
