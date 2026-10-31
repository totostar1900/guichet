import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { enGo, enMo, JOURS_POUR_AGIR, JOURS_POUR_DECIDER, lireLeStockage, niveauDuStockage, PLAFOND_STOCKAGE } from "@/lib/domain/stockage";

/**
 * LE PLAFOND DU STOCKAGE, ANNONCÉ AVANT QU'IL NE TOMBE.
 *
 * La maison reste au plan gratuit de Supabase, décidé le 11 octobre 2026 en
 * connaissance de cause. Une décision prise pour plus tard n'est dangereuse
 * que si « plus tard » arrive sans prévenir.
 */
const Mo = 1024 * 1024;
const lire = (p: string) => readFileSync(p, "utf8");

describe("ce que le point mesure", () => {
  it("des JOURS, et non un pourcentage", () => {
    /* « 81 % occupé » ne dit pas s'il faut agir cette semaine ou dans six
       mois ; « il reste vingt-trois jours » le dit, et c'est la seule forme
       sur laquelle on peut décider. */
    const l = lireLeStockage({ octets: 653 * Mo, fichiers: 857, octetsParJour: 1.7 * Mo });
    expect(l.jours).toBe(218);
    expect(Math.round(l.part * 100)).toBe(64);
  });

  it("et il se tait quand rien ne grossit", () => {
    const l = lireLeStockage({ octets: 653 * Mo, fichiers: 857, octetsParJour: 0 });
    expect(l.jours).toBeUndefined();
    expect(niveauDuStockage(l)).toBe("ok");
  });

  it("soixante jours pour décider, vingt et un pour agir", () => {
    expect(JOURS_POUR_DECIDER).toBe(60);
    expect(JOURS_POUR_AGIR).toBe(21);
    const a = (jours: number) => niveauDuStockage({ part: 0.9, parJour: Mo, jours });
    expect(a(200)).toBe("ok");
    expect(a(61)).toBe("ok");
    expect(a(60)).toBe("warn");
    expect(a(22)).toBe("warn");
    expect(a(21)).toBe("crit");
    expect(a(0)).toBe("crit");
  });
});

describe("une reprise historique n'est pas une pente", () => {
  it("c'est l'erreur que la mesure a faite en naissant", () => {
    /* 576 Mo versés le 14 septembre tombaient DANS la fenêtre de trente
       jours : la moyenne donnait 21,8 Mo par jour et dix-sept jours de
       marge, quand le rythme réel est de 1,7 Mo et sept mois. Le point
       serait né rouge, et un point qui naît rouge pour une mauvaise raison
       n'est jamais cru la fois d'après. */
    const parLaMoyenne = lireLeStockage({ octets: 653 * Mo, fichiers: 857, octetsParJour: 21.8 * Mo });
    const parLaMediane = lireLeStockage({ octets: 653 * Mo, fichiers: 857, octetsParJour: 1.7 * Mo });
    expect(niveauDuStockage(parLaMoyenne)).toBe("crit");
    expect(niveauDuStockage(parLaMediane)).toBe("ok");
  });

  it("et c'est la médiane que la base rend, pas la somme", () => {
    const sql = lire("supabase/migrations/0090_stockage_mediane.sql");
    expect(sql).toContain("percentile_cont(0.5)");
    expect(sql).toContain("octets_par_jour");
    // La fonction ne rend que des agrégats : storage.objects n'en sort pas.
    expect(sql).toContain("security definer");
    expect(sql).toContain("revoke all on function taille_du_stockage() from public");
  });
});

describe("le plafond suit le plan, et à la main", () => {
  it("un gigaoctet au plan gratuit", () => {
    expect(PLAFOND_STOCKAGE).toBe(1024 * 1024 * 1024);
    expect(enGo(PLAFOND_STOCKAGE)).toBe("1.00 Go");
    expect(enMo(653 * Mo)).toBe("653 Mo");
  });

  it("et la conduite à tenir dit de le changer au passage à Pro", () => {
    /* Sinon le point continuerait d'alerter sur l'ancien plafond, ce qui
       est la façon la plus sûre de le faire ignorer. */
    const how = lire("src/lib/health-how.ts");
    expect(how).toContain("changer PLAFOND_STOCKAGE dans le code");
    expect(lire("src/lib/domain/stockage.ts")).toContain("IL SE CHANGE À LA MAIN AVEC LE PLAN");
  });

  it("le jeu d'essai ne rend rien plutôt qu'un zéro", () => {
    // Rendre zéro ferait croire à un plafond lointain ; rendre rien fait taire le point.
    /* LA MÉTHODE AVEC SON CORPS. « return undefined; » est écrit cinq fois
       dans ce dépôt mémoire : exiger le mot seul laissait la clause verte le
       jour où CETTE méthode-ci rendrait zéro, et le point d'alerte aurait
       annoncé un plafond lointain sur un jeu d'essai. */
    expect(lire("src/lib/data/memory.ts"), "le jeu d'essai rend un chiffre de stockage : il fera croire à un plafond lointain").toMatch(
      /async tailleDuStockage\(\) \{[\s\S]{0,260}?return undefined;/,
    );
  });
});
