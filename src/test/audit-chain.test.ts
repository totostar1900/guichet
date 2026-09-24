import { describe, expect, it } from "vitest";
import { chainState } from "@/lib/audit-chain";
import type { AuditEntry } from "@/lib/domain/types";

/**
 * L'intégrité de la chaîne d'audit.
 *
 * Elle était vérifiée sur la liste affichée, filtre compris. Dès qu'on
 * cliquait « Intentions », les lignes voisines à l'écran n'étaient plus
 * voisines dans la chaîne, leurs empreintes ne se répondaient pas, et le
 * journal annonçait « Chaîne rompue » alors que rien n'avait bougé.
 *
 * Une fausse alerte sur un signal de ce genre est pire qu'un signal absent :
 * elle apprend au desk à ignorer la seule chose qui compterait vraiment le
 * jour où la chaîne se casserait pour de bon. D'où ces cas.
 */
const line = (id: number, hash: string, prevHash?: string, entity = "offer"): AuditEntry =>
  ({ id: String(id), at: `2026-09-${String(id).padStart(2, "0")}T10:00:00Z`, actor: "desk", action: "x", entity, entityId: "e", hash, prevHash }) as AuditEntry;

/** Du plus récent au plus ancien, comme les rend `listAudit`. */
const SUITE = [line(4, "d", "c"), line(3, "c", "b", "intent"), line(2, "b", "a"), line(1, "a", undefined, "intent")];

describe("la chaîne d'audit", () => {
  it("se lit intègre sur une suite continue", () => {
    expect(chainState(SUITE)).toEqual({ state: "ok", checked: 4 });
  });

  it("ne crie pas à la rupture sur une liste filtrée", () => {
    // C'était le défaut : ces deux lignes sont voisines à l'écran et ne le sont
    // pas dans la chaîne. La vérification porte désormais sur la suite entière,
    // et la liste filtrée n'a plus rien à voir avec elle.
    const filtree = SUITE.filter((x) => x.entity === "intent");
    expect(chainState(filtree).state).toBe("broken");
    expect(chainState(SUITE).state).toBe("ok");
  });

  it("nomme la ligne en cause quand elle est vraiment rompue", () => {
    // Une alerte qu'on ne peut pas suivre ne sert à personne.
    const cassee = [line(4, "d", "ZZZ"), line(3, "c", "b"), line(2, "b", "a"), line(1, "a")];
    const r = chainState(cassee);
    expect(r.state).toBe("broken");
    if (r.state === "broken") {
      expect(r.id).toBe("4");
      expect(r.at).toBe("2026-09-04T10:00:00Z");
    }
  });

  it("voit une ligne retirée au milieu", () => {
    // Le cas pour lequel tout ceci existe : quelqu'un efface une ligne en base.
    expect(chainState([line(4, "d", "c"), line(2, "b", "a"), line(1, "a")]).state).toBe("broken");
  });

  it("ne promet rien quand il n'y a rien à vérifier", () => {
    // Zéro ligne ne prouve pas l'intégrité : l'ancienne page disait « intègre »
    // même quand la lecture avait échoué et rendu une liste vide.
    expect(chainState([])).toEqual({ state: "short", checked: 0 });
    expect(chainState([line(1, "a")])).toEqual({ state: "short", checked: 1 });
  });
});
