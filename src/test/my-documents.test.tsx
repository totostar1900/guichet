import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MyDocuments } from "@/app/moi/MyDocuments";

/** The client's documents: grouped by operation with the reminder of what it was about, or flat by date. */
describe("MyDocuments", () => {
  const ops = [
    { id: "i-1", title: "OTA 6,50 % · 14 févr. 2028", about: "Prise ferme · 25 000 000 FCFA · réf. PF-0914-011", state: "Confirmée", stateKey: "confirmee", href: "/offres/o-1" },
    { id: "i-2", title: "FCP Monétaire", about: "Souscription · 2 000 000 FCFA · réf. SF-0914-020", state: "Reçue", stateKey: "recue" },
  ];
  const docs = [
    { id: "d-1", number: "PC-BUL-2026-0018", label: "Bulletin d'ordre de souscription", createdAt: "2026-09-14T10:00:00Z", status: "envoye", href: "/pdf/d-1", intentId: "i-1" },
    { id: "d-2", number: "PC-AF-2026-0019", label: "Appel de fonds", createdAt: "2026-09-15T10:00:00Z", status: "genere", href: "/pdf/d-2", intentId: "i-1" },
    { id: "d-3", number: "PC-REL-2026-0003", label: "Relevé", createdAt: "2026-09-16T10:00:00Z", status: "genere", href: "/pdf/d-3" },
  ];
  it("groups by operation, with the file's pieces last", () => {
    const html = renderToStaticMarkup(<MyDocuments docs={docs} ops={ops} />);
    expect(html).toContain("Par opération");
    expect(html.indexOf("OTA 6,50 %")).toBeLessThan(html.indexOf("PC-BUL-2026-0018"));
    expect(html.indexOf("PC-BUL-2026-0018")).toBeLessThan(html.indexOf("PC-AF-2026-0019")); // in the order they came
    expect(html).toContain("Prise ferme · 25 000 000 FCFA");
    expect(html).toContain("Mon dossier");
    expect(html.indexOf("Mon dossier")).toBeGreaterThan(html.indexOf("PC-AF-2026-0019"));
    expect(html).not.toContain("FCP Monétaire"); // an operation without documents has no group
    // each group folds from its head (a chevron, open at first) and « Tout replier » folds them all
    expect(html).toContain("Tout replier");
    expect((html.match(/aria-expanded="true"/g) ?? []).length).toBe(2);
    expect(html).toContain("2 documents");
    expect(html).toContain("1 document<");
  });
  it("shows the empty line when there is nothing yet", () => {
    const html = renderToStaticMarkup(<MyDocuments docs={[]} ops={ops} />);
    expect(html).toContain("apparaîtront ici");
    expect(html).not.toContain("Par date");
  });
});
