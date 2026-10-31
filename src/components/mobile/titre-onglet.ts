import { COMPANY, PRODUCT } from "@/lib/config";

/**
 * LE NOM DE LA PAGE, TEL QUE L'ONGLET LE PORTE, SANS LE SUFFIXE DE LA MAISON.
 *
 * « layout.tsx » compose le titre avec « %s · {PRODUCT.name} », et la racine
 * avec « {PRODUCT.name} · {COMPANY.name} ». Ce nom ne sert plus qu'à ranger
 * une page en favori : la barre, elle, dit le lieu. Il se lit AU MOMENT du
 * geste, jamais gardé en état — un titre mémorisé serait celui de la page
 * d'avant dès la première navigation.
 *
 * Les noms viennent de « config.ts », le seul endroit où les changer : renommer
 * la société ne doit pas laisser « Tableau de bord · Nouvelle Raison Sociale »
 * dans un favori.
 */
const échappe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SUFFIXE = new RegExp(`\\s*[·—-]\\s*(${[PRODUCT.name, COMPANY.name].map(échappe).join("|")}).*$`, "i");

export const titreDeLOnglet = (): string => document.title.replace(SUFFIXE, "").trim();
