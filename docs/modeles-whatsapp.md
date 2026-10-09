# Les modèles WhatsApp de la maison

Ce fichier est ce qu'on recopie dans **WhatsApp Manager › Modèles de message ›
Créer un modèle**, et il est le domicile du sujet : le texte soumis à Meta et
le texte envoyé par le code doivent être le MÊME, au nombre de variables près.
Un modèle approuvé avec cinq variables et un envoi qui en passe quatre est
refusé à chaque message, et le refus ne se lit que dans la réponse de l'API.

Trois modèles, à soumettre ensemble. Rien n'est soumis au 9 octobre 2026 : la
vérification de l'entreprise chez Meta, le numéro dédié et les jetons restent
des préalables (voir `/desk/docs/plateformes`).

| Modèle | Catégorie | Variables | Ce qu'il porte |
|---|---|---|---|
| `guichet_prelevement` | Utilitaire | 5 | Le préavis d'un prélèvement, cinq jours avant |
| `guichet_maj` | Utilitaire | 2 | Toute mise à jour d'une opération du client |
| `guichet_offre` | **Marketing** | 4 | L'annonce d'une nouvelle ligne, et l'opportunité du moment |

---

## Pourquoi des modèles, et pas du texte libre

Meta n'accepte un message libre que dans la **fenêtre de vingt-quatre heures**
ouverte par le client quand il nous écrit. Tout ce que la maison envoie de sa
propre initiative tombe hors de cette fenêtre : un préavis part cinq jours
avant l'échéance, un résultat d'adjudication part quand la BEAC publie, une
opportunité part quand le desk le décide. Sans modèle approuvé, chacun serait
refusé, et le refus n'a rien à voir avec son contenu.

## Les règles de Meta que les trois respectent

Chacune fait refuser un modèle à la soumission, et chaque refus coûte un
aller-retour de plusieurs jours avec un examinateur.

- **Aucune variable au tout début ni à la toute fin** du corps.
- **Jamais deux variables côte à côte** : il faut des mots entre elles.
- **Numérotation continue à partir de 1**, sans trou.
- **Le nom de la maison dans le texte fixe**, jamais dans une variable : Meta
  refuse un modèle dont l'identité de l'expéditeur est variable.
- **Corps sous 1 024 caractères**, pied de page sous 60.
- **Des exemples pour chaque variable** sont obligatoires à la soumission.

Une règle de plus ne concerne pas la soumission mais l'envoi, et elle est
tenue par le code (`parametreDeModele` dans `lib/notify/providers.ts`) : un
paramètre ne peut porter ni retour à la ligne, ni tabulation, ni quatre
espaces de suite, et le corps rendu doit rester sous 1 024 caractères. Nos
textes sont écrits pour l'e-mail, en paragraphes ; ils sont mis à plat et
bornés avant de partir.

---

# 1. guichet_prelevement

**Catégorie : Utilitaire** (`UTILITY`). Ce n'est pas du marketing : le client a
signé un mandat, et ce message l'informe d'un débit à venir. La catégorie
décide du tarif et du taux de refus.

### En-tête (texte, sans variable)

```
Avis de prélèvement
```

### Corps, version française

```
Bonjour, le {{1}}, Purpose Capital présentera un prélèvement de {{2}} FCFA sur votre compte {{3}}, pour alimenter {{4}}, au titre de votre mandat {{5}}. Merci de vous assurer que le compte est approvisionné à cette date. Vous pouvez révoquer ce mandat à tout moment dans le Guichet, sans motif.
```

### Corps, version anglaise

```
Hello, on {{1}}, Purpose Capital will present a direct debit of {{2}} FCFA on your account at {{3}}, to fund {{4}}, under your mandate {{5}}. Please make sure the account is funded on that date. You may revoke this mandate at any time in the Guichet, without giving a reason.
```

### Pied de page

```
Purpose Capital, société de bourse agréée COSUMAF.
```

### Bouton

URL statique, libellé `Voir mes prélèvements`, vers
`https://guichet.purposecapital.africa/moi/prelevements`.

### Les cinq variables, dans l'ordre

| | Ce que c'est | Exemple à donner à Meta |
|---|---|---|
| `{{1}}` | La date de l'échéance, en toutes lettres | `9 octobre 2026` |
| `{{2}}` | Le montant, sans le sigle | `50 000` |
| `{{3}}` | La banque du compte débité | `Afriland First Bank` |
| `{{4}}` | Ce que le prélèvement alimente | `votre provision` |
| `{{5}}` | La référence du mandat | `MP-2610-TNFW` |

`{{4}}` ne prend que deux valeurs, **votre provision** ou **votre épargne
programmée** : un mandat par usage, donc jamais autre chose.

---

# 2. guichet_maj

**Catégorie : Utilitaire** (`UTILITY`). C'est le cheval de trait de la maison :
accusé de réception d'une intention, puis chaque changement d'état d'un ordre,
confirmée, transmise, servie, non servie, réglée, contre-proposée, annulée. Le
rejet d'un prélèvement passe aussi par lui, et la correction d'un envoi parti
par erreur.

**LA DIFFICULTÉ DE CELUI-CI EST SA FORME.** Sa seconde variable porte la
quasi-totalité du message, et le corps naturel, « Bonjour {{1}}, {{2}} »,
finirait par une variable : Meta le refuserait d'office, et un modèle presque
entièrement variable passe mal l'examen de toute façon. Le corps ci-dessous
met donc du texte fixe des deux côtés, et ce texte fixe n'est pas un
remplissage : il dit où retrouver le détail et comment répondre, ce que la
ligne variable ne dit jamais.

### En-tête (texte, sans variable)

```
Votre opération
```

### Corps, version française

```
Bonjour {{1}}, voici une mise à jour de votre opération chez Purpose Capital. {{2}} Le détail et vos documents sont dans le Guichet, et votre conseiller répond sur ce même numéro.
```

### Corps, version anglaise

```
Hello {{1}}, here is an update on your operation at Purpose Capital. {{2}} The detail and your documents are in the Guichet, and your adviser answers on this same number.
```

### Pied de page

```
Purpose Capital, société de bourse agréée COSUMAF.
```

### Bouton

URL statique, libellé `Ouvrir le Guichet`, vers
`https://guichet.purposecapital.africa/moi`.

### Les deux variables, dans l'ordre

| | Ce que c'est | Exemple à donner à Meta |
|---|---|---|
| `{{1}}` | Le nom du client | `Jean-Paul Onana` |
| `{{2}}` | La ligne de l'état, une phrase | `Votre ordre PF-0914-K7Q4 a été transmis au SVT pour l'adjudication du 14 octobre 2026.` |

La ligne de `{{2}}` est écrite par le code, jamais par une personne : elle
dépend de l'état de l'opération. C'est elle que la mise à plat sert, parce que
certaines de ces lignes sont écrites sur plusieurs paragraphes pour l'e-mail.

---

# 3. guichet_offre

**Catégorie : Marketing** (`MARKETING`), et c'est la bonne malgré le prix. Ce
message part vers des clients qui n'ont rien demandé ce jour-là ; le ranger en
utilitaire serait faux, et Meta requalifie d'office les modèles mal rangés, ce
qui coûte plus cher qu'une catégorie assumée.

Il sert à deux endroits : la publication d'une offre, et l'alerte
« opportunité du moment » que le desk pousse à un segment.

### En-tête (texte, sans variable)

```
Nouvelle ligne au Guichet
```

### Corps, version française

```
Purpose Capital ouvre une nouvelle ligne, {{1}}, dont voici l'essentiel : {{2}}. Les offres se déposent jusqu'au {{3}}. La fiche complète et le formulaire de réponse sont ici : {{4}} Communication à caractère promotionnel : ni conseil, ni garantie d'allocation, et les rendements sont bruts, avant fiscalité.
```

### Corps, version anglaise

```
Purpose Capital is opening a new line, {{1}}, and here is the gist of it: {{2}}. Offers close on {{3}}. The full sheet and the reply form are here: {{4}} A promotional communication: neither advice nor a guarantee of allocation, and yields are gross, before tax.
```

### Pied de page

```
Purpose Capital, société de bourse agréée COSUMAF.
```

### Boutons

Un bouton de réponse rapide, libellé `Stop`. La maison honore déjà STOP sur ce
numéro, et un modèle marketing sans sortie se fait signaler par les
destinataires, ce qui abîme la qualité du numéro pour tous les autres envois,
y compris les utilitaires.

### Les quatre variables, dans l'ordre

| | Ce que c'est | Exemple à donner à Meta |
|---|---|---|
| `{{1}}` | Le titre de la ligne | `OTA Cameroun 6,25 % 2031` |
| `{{2}}` | L'accroche chiffrée | `6,40 % de rendement actuariel annuel brut si servi à 98,50 % · coupon 6,25 % · 5 ans` |
| `{{3}}` | La clôture | `14 octobre 2026 à 15:00` |
| `{{4}}` | Le lien vers la fiche | `https://guichet.purposecapital.africa/offres/ota-cmr-2031` |

---

## Après l'approbation

1. Poser sur Vercel, environnement Production :

   ```
   WA_TEMPLATE_PRELEVEMENT = guichet_prelevement
   WA_TEMPLATE_UPDATE      = guichet_maj
   WA_TEMPLATE_OFFER       = guichet_offre
   ```

   Les trois sont facultatives : le code emploie déjà ces noms par défaut. On
   les pose quand même, pour pouvoir changer de modèle sans déployer. Les
   poser **vides** revient à ne pas les poser : `tmpl()` retombe sur le
   défaut, et c'est exprès.

2. Poser `WHATSAPP_TOKEN` (jeton **système permanent**, pas le jeton de test de
   24 heures) et `WHATSAPP_PHONE_ID` : sans eux rien ne part, approuvé ou non.
   Puis `WHATSAPP_VERIFY_TOKEN` pour le webhook entrant.

3. Vérifier sur `/desk/prelevements` qu'une échéance préparée affiche
   « préavis parti » et non « préavis non parti ».
