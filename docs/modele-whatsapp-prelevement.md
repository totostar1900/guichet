# guichet_prelevement : le modèle WhatsApp du préavis de prélèvement

Ce fichier est ce qu'on recopie dans **WhatsApp Manager › Modèles de message ›
Créer un modèle**. Il existe parce que le texte soumis à Meta et le texte
envoyé par le code doivent être le MÊME, au nombre de variables près : un
modèle approuvé avec cinq variables et un envoi qui en passe quatre est refusé
à chaque message, et le refus ne se lit que dans la réponse de l'API.

Préparé le 9 octobre 2026. Rien n'est soumis tant que Georges ne l'a pas fait :
la vérification de l'entreprise chez Meta, le numéro dédié et les jetons
restent des préalables (voir `/desk/docs/plateformes`).

---

## Pourquoi un modèle, et pas le texte libre

Meta n'accepte un message libre que dans la **fenêtre de vingt-quatre heures**
ouverte par le client quand il nous écrit. Un préavis part **cinq jours** avant
l'échéance, donc presque toujours en dehors de cette fenêtre : sans modèle
approuvé, il serait refusé, le préavis serait marqué en échec, et le tirage
resterait en arrière. C'est la règle « rien ne part sans préavis parti » qui
jouerait, pour une raison qui n'a rien à voir avec le client.

---

## Ce qu'on saisit dans WhatsApp Manager

| Champ | Valeur |
|---|---|
| **Nom** | `guichet_prelevement` |
| **Catégorie** | **Utilitaire** (`UTILITY`). Ce n'est pas du marketing : le client a signé un mandat, et ce message l'informe d'un débit à venir. La catégorie décide du tarif et du taux de refus. |
| **Langues** | `fr` d'abord. `en` ensuite, sous le même nom : un modèle porte une version par langue. |

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

### Pied de page (60 caractères au plus)

```
Purpose Capital, société de bourse agréée COSUMAF.
```

### Bouton (facultatif, mais utile)

Un bouton **URL statique**, libellé `Voir mes prélèvements`, vers :

```
https://guichet.purposecapital.africa/moi/prelevements
```

---

## Les cinq variables, dans l'ordre

L'ordre est celui du tableau. Le code les passe dans ce même ordre, et c'est
le seul endroit où les deux se rencontrent.

| | Ce que c'est | Exemple à donner à Meta |
|---|---|---|
| `{{1}}` | La date de l'échéance, en toutes lettres | `9 octobre 2026` |
| `{{2}}` | Le montant, sans le sigle | `50 000` |
| `{{3}}` | La banque du compte débité | `Afriland First Bank` |
| `{{4}}` | Ce que le prélèvement alimente | `votre provision` |
| `{{5}}` | La référence du mandat | `MP-2610-TNFW` |

`{{4}}` ne prend que deux valeurs : **votre provision** ou **votre épargne
programmée** en français, **your provision** ou **your savings plan** en
anglais. Un mandat par usage, donc jamais autre chose.

---

## Les règles de Meta que ce texte respecte, et pourquoi elles comptent

- **Aucune variable au tout début ni à la toute fin** du corps : le texte
  commence par « Bonjour, le » et finit par « sans motif. ». Un modèle qui
  commence ou finit par une variable est refusé.
- **Jamais deux variables côte à côte** : il y a des mots entre chacune.
- **Numérotation continue à partir de 1**, sans trou.
- **Le nom de la maison est dans le texte fixe**, pas dans une variable : Meta
  refuse un modèle dont l'identité de l'expéditeur est variable.
- **Corps sous 1 024 caractères**, pied sous 60.
- **Des exemples pour chaque variable** sont obligatoires à la soumission : ce
  sont ceux du tableau ci-dessus.

---

## Après l'approbation

1. Poser sur Vercel, environnement Production :

   ```
   WA_TEMPLATE_PRELEVEMENT = guichet_prelevement
   ```

   La variable est facultative : sans elle, le code emploie déjà
   `guichet_prelevement` comme nom par défaut. On la pose quand même, pour
   pouvoir changer de modèle sans déployer, comme pour `WA_TEMPLATE_OFFER`.

2. Poser `WHATSAPP_TOKEN` (jeton **système permanent**, pas le jeton de test de
   24 heures) et `WHATSAPP_PHONE_ID` : sans eux rien ne part, approuvé ou non.

3. Vérifier sur `/desk/prelevements` qu'une échéance préparée affiche
   « préavis parti » et non « préavis non parti ».

---

## Le rejet, et pourquoi il n'a pas son modèle

Le message qui annonce un prélèvement rejeté passe par **`guichet_maj`**, le
modèle générique de mise à jour : un nom, puis une ligne. Lui donner son propre
modèle obligerait à faire approuver par Meta les six causes de rejet, dont
« opposition du client » et « compte clos », qui sont des phrases que personne
n'a envie de voir figées dans un catalogue chez un tiers. La ligne reste de
notre côté, et elle se corrige sans soumission.
