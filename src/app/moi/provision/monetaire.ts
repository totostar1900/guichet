/**
 * UN FONDS MONÉTAIRE, RECONNU AU NOM ET À LA CATÉGORIE.
 *
 * Le catalogue ne porte pas d'étiquette « monétaire » : la règle est donc
 * écrite ici, une fois. Elle servait à deux endroits de la même page — la
 * liste où placer, et ce qui est déjà placé — et depuis que le placement a sa
 * page elle en sert trois. Trois copies d'une même règle de reconnaissance
 * divergent au premier fonds dont le nom sort du moule.
 */
export const estMonetaire = (titre: string, categorie?: string) => /mon(é|e)taire|trésorerie/i.test(`${titre} ${categorie ?? ""}`);
