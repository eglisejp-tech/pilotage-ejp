# Diagnostic : « La connexion a échoué » à l'ajout d'un événement (26 octobre 2026)

Phase 1 seulement : lecture du code (branche `etape-8-production-claude` = `main` + règles), du
bundle Netlify `index-BS2Nw5Bx.js`, et rejeu de la base sur le banc PGlite. Aucune lecture de la
production, aucun code produit dans le dépôt, aucun commit.

Fichiers de travail (hors dépôt) :

- `scratchpad/audit-evenement/banc/supabase/tests/audit-evenement.test.sql` : rejeu (22 sur 22).
- `scratchpad/audit-evenement/netlify/appels.txt` : 113 appels extraits du bundle Netlify.
- `scratchpad/audit-evenement/main-appels.txt` : 117 appels extraits de `src/` (main).
- `scratchpad/audit-evenement/outils/appels.mjs`, `appels-src.mjs` : les deux extracteurs.

---

## 0. Conclusion

**Cause la plus probable : la requête `POST /rest/v1/rpc/ajouter_evenement` n'a pas reçu de
réponse lisible sur Safari iOS (rejet de `fetch`, « Load failed »).** Ce n'est ni un refus de la
base, ni un écart de signature entre l'ancien site et la base.

- Certitude **élevée** que ce n'est pas la base : le texte de la capture n'a qu'une origine dans le
  code (genre `reseau`, c'est-à-dire une erreur postgrest-js de `code: ''`) ; tout refus de la base
  (P0001, 42501, 23xxx, PGRST*) donne une autre phrase ; le rejeu de la capture (huit mentions dont
  FIJ, cinq arguments, heure vide, date du jour) est accepté par la base (PGlite, 22 sur 22).
- Certitude **élevée** que l'ancien site parle correctement à la base actuelle : ses 113 appels sont
  tous présents, à l'identique, dans `main`, qui tourne sur la même base (T74).
- Certitude **moyenne** sur la cause exacte du transport (réseau mobile, connexion réutilisée
  périmée après un long remplissage, application passée en arrière-plan, erreur de passerelle sans
  en-têtes CORS) : seuls les journaux de la personne peuvent trancher (section 4).
- **FIJ n'est pas désactivé par l'application** : aucune case n'a d'attribut `disabled` (main et
  bundle), et le ministère du compte est retiré de la liste. Le gris vient de l'effet de bord de
  Safari iOS 26 sous la barre d'adresse flottante (la ligne EJP-MDS, plus haut, est encore plus
  pâle).

**Défaut produit, réel et indépendant de la cause exacte** : `lireErreurBase` prend « code vide »
pour « pas de réponse ». Or postgrest-js met `code: ''` sur **toute** exception de la chaîne
d'envoi : coupure avant l'envoi, réponse perdue **après** l'enregistrement, AbortError, bogue
JavaScript. Pour une création en ajout seulement (événement, point, signalement), l'écran dit
« Votre saisie est encore dans le formulaire : réessayez », alors que la base a peut-être
enregistré : le nouvel essai crée un doublon qui ne s'efface plus.

---

## 1. Front : du bouton « Ajouter au calendrier » au message

### 1.1 Chemin (main)

1. `src/features/evenements/FormulaireAjoutEvenement.tsx:74-92` : `handleSubmit` (zodResolver). Une
   erreur Zod du formulaire s'affiche **sous son champ** et n'appelle pas la base.
2. `src/features/evenements/SaisieAjoutEvenement.tsx:30-31` : `creerPuisRelire(() => ajouterEvenement(...))`.
3. `src/features/evenements/useApresEcriture.ts:25-36` : relit les lectures après une réussite, et
   après un échec **seulement si** `estDelaiDepasse` (ligne 32).
4. `src/data/evenementsEcriture.ts:36-47` : `schemaBaseAjoutEvenement.parse`, puis
   `rpc('ajouter_evenement', { p_titre, p_date, p_statut, p_mentions, p_heure_prevue })`, `throw error`.
5. `src/lib/supabase.ts:72-80` : `fetchAvecDelai`, `AbortSignal.timeout(10_000)` (pas 25 s ; les 25 s
   de `lectureImpossible.ts:25` concernent la fenêtre d'un nouvel essai de lecture).
6. postgrest-js 2.117.2 (`node_modules/@supabase/postgrest-js/dist/index.mjs:416-457`) : toute
   exception levée pendant `fetch` **ou** pendant la lecture de la réponse est rattrapée et rendue
   `{ message: '<nom>: <message>', code: '' }`. Un POST n'est jamais relancé (`RETRYABLE_METHODS`
   = GET, HEAD, OPTIONS, lignes 81-85 ; et `db: { retry: false }` dans `src/lib/supabase.ts:113`).
7. `src/features/evenements/FormulaireAjoutEvenement.tsx:84` : `lireRefus(erreur, 'ajout')`
   (`src/features/evenements/refus.ts:36-56`), qui appelle `lireErreurBase`
   (`src/data/messagesBase.ts:697-753`).
8. `src/features/evenements/ResultatEnvoi.tsx:22` : `ou: 'connexion'` affiche
   `<ErreurFormulaire objet="saisie" />`, soit « La connexion a échoué. Votre saisie est encore dans
   le formulaire : réessayez. » (`src/features/saisie/textes.ts:23`).

### 1.2 Ce qui mène à chaque phrase (formulaire d'ajout d'un événement)

| Situation                                                                                             | Erreur reçue                                                     | `lireErreurBase`      | Phrase affichée                                                                                                        |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Réseau coupé, connexion perdue, **réponse perdue après enregistrement** (Safari : « Load failed »)    | `{ code: '', message: 'TypeError: Load failed' }`                | `reseau` (l. 718-730) | **« La connexion a échoué. Votre saisie est encore dans le formulaire : réessayez. » (la capture)**                    |
| Réponse 5xx **sans en-têtes CORS** (page d'erreur d'une passerelle) : le navigateur la bloque         | même chose (`fetch` rejeté)                                      | `reseau`              | **la capture**                                                                                                         |
| Annulation qui n'est pas notre délai (page quittée), ou délai rendu en `AbortError` par le navigateur | `{ code: '', message: 'AbortError: ...' }`                       | `reseau`              | **la capture**                                                                                                         |
| Exception JavaScript dans la chaîne d'envoi (bogue, en-têtes, couche Auth)                            | `{ code: '', message: 'TypeError: <autre>' }`                    | `reseau` (défaut)     | **la capture**                                                                                                         |
| Délai de 10 s, rejet nommé `TimeoutError`                                                             | `{ code: '', message: 'TimeoutError: ...' }`                     | `delai` (l. 719)      | « La connexion a échoué. Vérifiez la liste avant de réessayer. » + relecture                                           |
| Jeton expiré (401, PGRST301 à 303, « JWT » dans le message)                                           | code PGRST30x                                                    | `message` / `expiree` | phrase « connexion expirée », relecture de la session                                                                  |
| Session aal1                                                                                          | 42501 « Double authentification requise. »                       | `expiree`             | phrase « connexion expirée »                                                                                           |
| Compte ou ministère du compte désactivé                                                               | 42501 « Compte inactif ou inconnu. »                             | `desactive`           | phrase « compte désactivé »                                                                                            |
| Compte qui n'est pas un ministère                                                                     | 42501 « Seul un compte de ministère peut ajouter un événement. » | `message`             | « Votre compte ne permet pas d'ajouter un événement. »                                                                 |
| Renouvellement du jeton raté : la requête part avec la clé publique (rôle `anon`)                     | 42501 « permission denied for function ajouter_evenement »       | `acces`               | « Cet élément est introuvable. Rechargez la page. »                                                                    |
| Refus métier connu (date, nom, heure, mentions)                                                       | P0001 + texte de la table                                        | `message`             | sa phrase, sous le champ date ou heure, sinon sous le bouton                                                           |
| Refus inconnu : P0001 hors table, 23505, 23514, 23503, 22P02, 57014, PGRST202, PGRST203, 5xx JSON     | code présent                                                     | `repli` (l. 746-752)  | « L'enregistrement n'a pas abouti, votre saisie est gardée. Réessayez, et si le problème revient, prévenez EJP Tech. » |
| 5xx de passerelle **avec** CORS, corps non JSON                                                       | `{ message: '<html>' }`, pas de code                             | `repli` (l. 732)      | repli                                                                                                                  |
| Contrôle Zod du formulaire                                                                            | pas d'envoi                                                      | ,                     | sous le champ                                                                                                          |
| Contrôle Zod de la couche data                                                                        | `ZodError`                                                       | `message` ou `repli`  | sa consigne, ou le repli                                                                                               |

**Bundle Netlify** (`index-BS2Nw5Bx.js`, supabase-js 2.117.2, avant T72 et T73) : même logique,
octet pour octet aux noms près.

- `PE` = `lireErreurBase` (octet 776320, branche `r===''||TE.test(t)||EE.test(i)` → `reseau` à 776715).
- `EU` = `lireRefus` (octet 1041759), `$8` = `ajouterEvenement` à cinq arguments (1395264).
- `UE` = `fetchAvecDelai`, `zE=1e4` (778204), `FF` = `creerPuisRelire`, `eE` = `estDelaiDepasse`.
- `r5` = `ministeresAMentionner`, qui retire le ministère du compte (1396066).
- `NU` = `ChoixMentions` (1045392) : cases sans `disabled`.

### 1.3 Une erreur métier inconnue s'affiche-t-elle comme une panne de connexion ?

Pour une réponse de PostgREST qui porte un code : **non**, elle prend le repli (`messagesBase.ts:746-752`).
Le défaut existe ailleurs, à quatre endroits :

1. **`code: ''` pris pour « aucune réponse »** (`messagesBase.ts:718-730`) : une exception locale
   (bogue, lecture du corps interrompue, AbortError étrangère) devient « La connexion a échoué ».
   Tous les formulaires passent par là.
2. **Création en ajout seulement, issue inconnue dite « pas parti »** : sur un rejet de `fetch`, le
   formulaire invite à réessayer alors que la base a peut-être enregistré. Trois créations sont
   concernées (`creerPuisRelire`) : événement (`evenements/refus.ts:40`), point
   (`pointsEcriture.ts:118`, `nouveau-point/refus.ts:41`) et signalement (`signalement/refus.ts:28`).
3. **`delai` rendu comme `connexion` sur des écritures non idempotentes** : suggestion d'indicateur
   (`mes-indicateurs/refus.ts:34-36`), validation (`indicateurs/validation/refus.ts:34-36`),
   indicateurs prévus (`indicateurs/configuration/useCreationPrevus.ts:24-26`), saisies de
   chiffres, FIJ et session (`saisie-session/erreurs.ts:31-33`). Pour les chiffres (la dernière
   saisie fait foi), c'est sans gravité ; pour une demande ou une validation, c'est un doublon
   possible ou un refus « déjà décidé » au deuxième essai.
4. **Edge Functions des comptes** (`src/data/comptes.ts:138-151`) : toute exception et toute
   erreur qui n'est pas `FunctionsHttpError` (dont `FunctionsRelayError`, une panne côté
   serveur) deviennent `ErreurCompte('connexion')`. Écran d'EJP Tech seulement.

---

## 2. Base : `ajouter_evenement` à cinq arguments

Source : `supabase/migrations/20261023120000_evenements_heures.sql:106-155` (privée, security
definer), `:157-160` (publique, security invoker). Appels et déclencheurs :

- `private.exige_aal2()` et `private.mon_ministere()` : `20260930163154_fonctions_aide_et_triggers.sql:19-42`.
- `forcer_auteur` (avant ajout, `evenement` et `evenement_etat`) : même fichier, `:88-96`.
- `controler_evenement_etat` (avant ajout) : `20261023120000_evenements_heures.sql:53-101`.
- `journaliser_evenements` (après ajout, par instruction) : `20261023120000_evenements_heures.sql:212-251`.
- `controler_journal_ministere` (avant ajout dans `journal`, T74) : `20261025192715_comptes_corrections.sql:105-118`.
- Contraintes : `evenement.titre` de 1 à 80 caractères, clés étrangères vers `ministere` et
  `compte`, clé primaire `(evenement_id, ministere_id)`, heures de 0 à 1439, contrôle des actions
  du journal (`20261025192715_comptes_corrections.sql:53-75`).
- RLS : restrictive `aal2` et politique « ajout » (`20260930163157_rls_politiques_et_droits.sql:86-91`, `:116-119`) ; la partie privée tourne en propriétaire.

### 2.1 Refus possibles

| Ordre | Contrôle                                                           | Code                                               | Message                                                | Phrase à l'écran                                                     |
| ----- | ------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------- |
| 0     | Pas de droit d'exécution (`anon`)                                  | 42501                                              | permission denied for function ajouter_evenement       | « Cet élément est introuvable. Rechargez la page. »                  |
| 1     | `exige_aal2` : jeton aal1                                          | 42501                                              | Double authentification requise.                       | connexion expirée                                                    |
| 2     | `exige_aal2` : compte, ou ministère du compte, désactivé           | 42501                                              | Compte inactif ou inconnu.                             | compte désactivé                                                     |
| 3     | Compte sans ministère                                              | 42501                                              | Seul un compte de ministère peut ajouter un événement. | « Votre compte ne permet pas d'ajouter un événement. »               |
| 4     | Nom vide ou plus de 80 caractères                                  | P0001                                              | Donnez un nom à l'événement (80 caractères au plus).   | sa phrase                                                            |
| 5     | Date vide                                                          | P0001                                              | Choisissez une date.                                   | sous la date                                                         |
| 6     | Date avant `private.aujourdhui()` (heure de Paris)                 | P0001                                              | La date ne peut pas être passée.                       | sous la date, avec le lien                                           |
| 7     | Statut vide                                                        | P0001                                              | Choisissez un statut.                                  | sa phrase                                                            |
| 8     | Heure hors de 0 à 1439                                             | P0001                                              | L'heure prévue est invalide.                           | sous l'heure                                                         |
| 9     | Mention : soi-même, ministère désactivé, inconnu ou supprimé (T74) | P0001                                              | Ce ministère ne peut pas être mentionné.               | « Un ministère coché a été désactivé. Décochez-le, puis réessayez. » |
| 10    | Garde-fous (CHECK, clés étrangères, journal)                       | 23514, 23503, P0001 « Ce ministère n'existe pas. » | ,                                                      | repli                                                                |
| 11    | Type invalide (uuid, enum, date)                                   | 22P02                                              | ,                                                      | repli                                                                |
| 12    | Temps d'instruction dépassé (8 s pour `authenticated`)             | 57014                                              | canceling statement due to statement timeout           | repli                                                                |

Le premier état n'a pas de dernier état : `controler_evenement_etat` n'y lève que les deux refus
sur l'heure de début, que l'ajout n'envoie jamais.

**Aucun de ces refus ne donne la phrase de la capture.** Avec une session valide, la capture n'en
déclenche aucun (rejeu ci-dessous).

### 2.2 Cas de la capture et cas suspects (PGlite, 22 sur 22)

`node run.mjs ../audit-evenement/banc/supabase audit-evenement.test.sql`, sur une copie des
migrations de `main` (= production jusqu'à T74) :

- Huit mentions dont FIJ, cinq arguments, heure vide, date du jour : **accepté** ; huit lignes
  `evenement_mention` ; une ligne `evenement_ajoute` avec les huit identifiants.
- Trois mentions dont FIJ et une heure : accepté. FIJ seul : accepté.
- Ministère sans compte : accepté (aucun contrôle des comptes du mentionné).
- Tous les ministères actifs mentionnés : accepté (pas de plafond de mentions).
- `p_mentions` null : accepté, sans mention.
- Le créateur dans ses mentions, un ministère désactivé, un identifiant inconnu : P0001
  « Ce ministère ne peut pas être mentionné. ».
- Date d'hier : P0001. Heure 1440 : P0001. Nom vide ou de 81 caractères : P0001.
- aal1 : 42501 « Double authentification requise. ».
- Ministère du créateur désactivé : 42501 « Compte inactif ou inconnu. ».
- Anonyme : 42501.

### 2.3 FIJ coché et grisé

- **Pas le ministère du créateur** : `ministeresAMentionner` le retire de la liste
  (`src/features/evenements/mentions.ts:14` ; bundle `r5`). Le formulaire refuse aussi sa propre
  mention (`schemas.ts:198-200`).
- **Aucune règle FIJ** dans `ajouter_evenement` ni dans le formulaire.
- **Aucune case désactivée** : `ChoixMentions.tsx` (main) et `NU` (bundle) n'ont pas d'attribut `disabled`.
- **Lecture visuelle** : FIJ est à 170 px du haut, sous la pastille d'adresse flottante de Safari
  iOS 26, qui estompe le contenu du bord haut. EJP-MDS, au-dessus, est encore plus pâle : le
  dégradé va du haut vers le bas. Certitude moyenne à élevée ; une capture prise après un petit
  défilement le confirmerait.
- Si FIJ figurait dans `p_mentions` : accepté. Si le créateur y figurait : P0001, que l'écran dit
  « Un ministère coché a été désactivé », phrase fausse pour ce cas (défaut mineur, section 5.6).

### 2.4 Autres points vérifiés

- **Date** : `private.aujourdhui()` (Paris). Le 26 octobre à 12 h 37, Paris est en heure d'hiver
  (UTC+1 depuis le 25) : aucun bord de journée.
- **Nombre de mentions** : aucun plafond, ni en base ni dans le formulaire.
- **Ministère désactivé ou supprimé entre l'ouverture et l'envoi** : P0001, phrase « désactivé ».
- **Statut** : enum à six valeurs, le formulaire n'en envoie pas d'autre.

---

## 3. Ancien site (Netlify) contre base actuelle

**Méthode** : extraction de tous les appels du bundle (`rpc`, `from().select/insert/upsert`,
Edge Functions) et de `src/` (main), puis comparaison (`netlify/appels.txt`, `main-appels.txt`).

**Résultat** : les 113 appels du bundle sont **tous** dans main, avec les mêmes noms, les mêmes
arguments et les mêmes colonnes. Or main tourne sur la même base (production à T74) et ses tests
passent en CI. **Aucun appel cassé.**

Ce que l'ancien site n'a pas (fonctions absentes, pas des pannes) :

- `choisir_modele_prevus` et `v_ministere_modele` (T72).
- `v_ministeres_supprimables`, `v_comptes_jamais_actives`, `corriger-adresse` et
  `supprimer-ministere` (T74).
- Le changement d'espace (T73), qui est seulement côté navigateur.

Edge Functions appelées par le bundle : `creer-compte`, `relancer-invitation`,
`desactiver-compte`, `reactiver-compte`, `reinitialiser-2fa`, avec les mêmes corps que main. Les
versions déployées en production n'ont pas été lues (T52).

**Point d'exploitation** : le site Netlify sert toujours ce bundle, car la redirection du geste 11
(`docs/exploitation.md`, section 3.1) n'a pas pu être publiée sans crédits. Un correctif de `main`
n'atteindra donc pas les personnes qui gardent l'ancienne adresse. La règle 7 (section 7.1) vaut
aussi pour T75 contre ce bundle.

---

## 4. Hypothèses classées, et quoi chercher

Fenêtre : 26 octobre 2026, **11 h 25 à 11 h 50 UTC** (12 h 25 à 12 h 50 à Paris).

### H1. Échec de transport du POST, « Load failed » (probabilité élevée)

**Pour** :

- C'est le seul chemin vers cette phrase.
- Les lectures du formulaire (ministères, semaine) avaient réussi au chargement : la chaîne
  d'envoi fonctionne.
- Un POST n'a aucune seconde chance : ni Safari (qui ne relance pas seul un POST sur une connexion
  réutilisée devenue périmée), ni postgrest-js, ni TanStack (mutations sans nouvel essai). Les
  lectures, elles, sont relancées une fois.
- Cocher huit cases dans un long formulaire laisse la connexion au repos plusieurs minutes.

**Contre** : rien de décisif sans les journaux.

**Deux sous-cas** :

- **H1a, la requête n'est jamais arrivée** : aucune ligne `ajouter_evenement` dans l'API Gateway à
  ce moment, aucun événement créé.
- **H1b, la base a enregistré mais la réponse s'est perdue** : une ligne `POST
/rest/v1/rpc/ajouter_evenement` en **200**, et une ligne « Événement ajouté » au Journal vers
  12 h 37. Si la personne a réessayé, il y a **plusieurs événements identiques** (doublons, ajout
  seulement : seul un nouvel état « Annulé » peut les retirer du calendrier).

### H2. Erreur de la passerelle sans en-têtes CORS (faible à moyenne)

Une page d'erreur 5xx (502, 503, 504, 520 à 524) bloquée par Safari devient un rejet de `fetch`.

- **Confirme** : une ligne 5xx dans l'API Gateway pour ce chemin, ou un incident sur
  `status.supabase.com` (historique du 26 octobre).
- **Écarte** : une ligne 200 ou 4xx, ou aucune ligne.

### H3. Délai de 10 s rendu en `AbortError` au lieu de `TimeoutError` (faible)

Notre délai serait alors classé `reseau` au lieu de `delai`. Un Safari récent rejette avec la
raison du signal (`TimeoutError`), et la phrase serait alors « Vérifiez la liste avant de
réessayer », pas celle de la capture.

- **Confirme** : une requête de 10 s ou plus pour ce chemin, ou un iOS ancien dans le `user_agent`
  des lectures du même appareil.
- **Écarte** : une durée courte, ou iOS 17 et plus.

### H4. Exception JavaScript dans la chaîne d'envoi (faible)

Côté serveur, impossible à distinguer de H1a : aucune ligne dans les journaux.

- **Confirme** : l'échec se reproduit à chaque essai, sur ce téléphone seulement, alors que le
  réseau est bon et que les lectures marchent.
- La preuve ne viendra que d'une trace côté navigateur, qui manque (section 5.4).

### H5. Refus de la base affiché comme panne de connexion (écartée)

Le code et le rejeu l'excluent.

- **Contredirait** : un 400 ou 403 dans l'API Gateway avec une ligne ERROR dans Postgres. Il
  faudrait alors chercher pourquoi le navigateur n'a pas lu le corps de la réponse.

### H6. Ancien front incompatible avec la base (écartée)

Voir la section 3. Une signature cassée donnerait un 404 PGRST202 et le repli, pas cette phrase.

### H7. FIJ ministère du créateur, ou règle FIJ (écartée)

Voir la section 2.3. Le cas donnerait un P0001 et « Un ministère coché a été désactivé ».

### H8. Session (renouvellement raté, aal1) (écartée pour cette phrase)

Ces cas donnent « Cet élément est introuvable » ou « connexion expirée ». Des échecs de
renouvellement dans Auth vers 11 h 37 renforceraient seulement H1 (réseau mauvais).

### 4.1 Tableau de bord Supabase, Logs

Les noms de champs sont ceux de l'explorateur ; ajuster si l'un d'eux diffère.

**API Gateway (`edge_logs`)** : tous les appels de cet appareil, pas seulement le POST, pour voir
les lectures réussies avant et après.

```sql
select timestamp, r.method, r.path, resp.status_code, h.user_agent, h.referer, h.x_client_info
from edge_logs
cross join unnest(metadata) as m
cross join unnest(m.request) as r
cross join unnest(m.response) as resp
cross join unnest(r.headers) as h
where timestamp between '2026-10-26T11:25:00' and '2026-10-26T11:50:00'
  and (r.path like '%ajouter_evenement%' or h.referer like '%netlify%')
order by timestamp
```

À lire :

- Présence et code HTTP de `POST /rest/v1/rpc/ajouter_evenement` : 200 pour H1b, 5xx pour H2,
  absence pour H1a ou H4, 400 ou 403 pour H5.
- Durée, si le champ existe (`origin_time` ou équivalent) : 10 s ou plus pour H3.
- Version d'iOS dans `user_agent`.
- Nombre de POST : plusieurs essais, et leur issue.

**Postgres (`postgres_logs`)** : lignes `ERROR` entre 11 h 30 et 11 h 45. On n'attend rien : une
réussite n'est pas journalisée. Un `ERROR` qui cite `evenement` ou un SQLSTATE 57014 changerait
le diagnostic.

**Auth (`auth_logs`)** : `grant_type=refresh_token` en échec (« already used », 400) pour ce
compte vers 11 h 37.

**Page d'état** : `status.supabase.com`, historique du 26 octobre (région du projet).

### 4.2 Écran Journal de l'application (EJP Tech)

- Filtre sur le ministère de la personne, action « Événement ajouté », 26 octobre de 12 h 30 à 12 h 50.
- **Aucune ligne** : H1a, H2 ou H4 (rien n'est enregistré, réessayer est sans risque).
- **Une ligne** à 12 h 37 avec huit mentions : H1b, l'événement existe.
- **Plusieurs lignes** : doublons créés par les nouveaux essais.
- Vérifier aussi le calendrier du ministère, et un signalement éventuel (écran `saisie_evenement`)
  à la même heure.

### 4.3 À demander à la personne qui a signalé

- Wi-Fi ou réseau mobile ; était-elle en mouvement ?
- Combien de temps le formulaire était-il ouvert avant l'envoi ? A-t-elle quitté Safari entre-temps ?
- A-t-elle réessayé, et avec quel résultat ? L'événement est-il maintenant dans le calendrier, une
  ou plusieurs fois ?
- Version d'iOS.
- Ce qu'est la languette grise « › » au bord gauche de la capture : une extension de Safari
  (bloqueur, VPN) peut aussi faire échouer une requête.
- Désormais : utiliser `https://pilotage-ejp.pages.dev`.

---

## 5. Conception du correctif durable (sans code)

### 5.1 Cause racine

1. **Classement** : `messagesBase.ts:718-730` confond trois issues sous `code: ''` :
   « rien n'est parti », « parti, issue inconnue » et « exception locale ». Pour une création en
   ajout seulement, dire « réessayez » sur une issue inconnue fabrique des doublons définitifs.
2. **Délai** : `estDelaiDepasse` (`src/lib/requetes.ts:14-20`) reconnaît le délai par le nom de
   l'erreur rendu par le navigateur, au lieu de savoir que **notre** signal a expiré.
3. **Observabilité** : l'application jette le nom, le message et la durée de l'erreur. Sans lire la
   production, personne ne peut distinguer H1a, H1b, H2, H3 et H4.
4. **Exploitation** : l'ancien site reste en ligne sans pouvoir être corrigé.

### 5.2 Classement des issues d'un envoi (un seul endroit)

Dans `src/data/messagesBase.ts`, `lireErreurBase` rend désormais :

- **`transport`** : `fetch` rejeté avec un message de fetch connu (Failed to fetch, Load failed,
  NetworkError, fetch failed), `...FetchError`, `AbortError` ou notre délai.
- **`delai`** : marqué à la source par `fetchAvecDelai`. Si `delai.aborted` quand `fetch` rejette,
  il relève une erreur nommée `TimeoutError`, quel que soit le navigateur.
- **`exception`** : `code: ''` avec un autre message (bogue). Elle prend le **repli**, jamais
  « connexion ».
- Les genres `acces` et `message` ne changent pas.

Une seule fonction de lecture par envoi, par exemple `lireEchecEnvoi(erreur, { creation })`,
remplace les switchs de chaque écran :

- **Création en ajout seulement** (`ajouter_evenement`, `creer_point`, `signaler_difficulte`,
  `ajouter_suggestion`, `declarer_session`, `valider_indicateur`, `creer_indicateur`) : `transport`
  ou `delai` donnent l'**issue inconnue**. La phrase est « La connexion a échoué. Vérifiez la liste
  avant de réessayer. » (déjà écrite, m259), et la liste est relue.
- **Écriture idempotente ou protégée** (chiffres, FIJ, mise à jour d'état protégée par « Rien n'a
  changé », réunion) : `transport` garde « Votre saisie est encore dans le formulaire : réessayez ».
- `creerPuisRelire` relit après toute issue inconnue, pas seulement après le délai.
- Option sans changer le modèle : après la relecture, si un événement du ministère porte le même
  nom et la même date, créé depuis l'envoi, l'écran dit « Événement ajouté au calendrier. » et
  vide le formulaire. Faux positif possible (deux événements homonymes le même jour) : à valider
  avec la personne.

### 5.3 Clé d'idempotence (change le modèle : question à poser)

Le formulaire tire un `uuid` à l'ouverture et le garde jusqu'à la réussite. `ajouter_evenement`
(et `creer_point`, `signaler_difficulte`) reçoit `p_cle`, unique par compte. Un nouvel essai avec
la même clé rend l'événement déjà créé au lieu d'en créer un autre.

- Ce que ça permet : un nouvel essai automatique, unique, après un échec de transport ; une phrase
  « réessayez » qui devient sans risque.
- Coût : nouvelle colonne, nouvelle signature (règle 7 : on ajoute la version à six arguments,
  on garde les autres), tests pgTAP.
- **Question à la personne** (CLAUDE.md : pas de changement de modèle sans accord).

### 5.4 Voir ces erreurs la prochaine fois sans lire la production

**Sans changer le modèle (recommandé tout de suite)** :

1. **Version du front dans `x-client-info`**, par exemple `pilotage-ejp/<sha court> pages` ou
   `netlify`, ajoutée à l'en-tête que supabase-js envoie déjà. L'API Gateway la journalise : la
   personne filtre par version et par site.
2. **Référence courte sous le message d'échec**, sans donnée personnelle : genre, code et heure,
   par exemple « Réf. T-LF 12:37:05 ». Une capture d'écran suffit alors pour retrouver la bonne
   ligne de journal et le cas.

**Avec un changement de modèle (question à poser)** : une table `incident_envoi`, en ajout
seulement, écrite par `private.noter_incident` (security definer, aal2) et lue par EJP Tech.

- Champs : `le`, `compte`, `ecran`, `operation`, `genre`, `sqlstate`, `nom_erreur`
  (TypeError, AbortError, TimeoutError), `message_fetch` (liste fermée : seulement les messages de
  fetch connus, jamais un texte de la base ni une saisie), `statut_http`, `duree_ms`, `en_ligne`,
  `visible`, `version_front`, `site`.
- Envoi : en file locale si l'envoi échoue, puis au prochain envoi réussi ou à l'événement
  `online`.
- Durée de conservation : 90 jours. Mise à jour du registre des traitements et de la page
  Confidentialité.
- Ni adresse IP, ni texte libre, ni email. Pas d'user agent complet : la famille de navigateur et
  sa version majeure seulement.

### 5.5 Exploitation

- Geste 11 dès que Netlify accepte une mise en ligne : la redirection vers `pages.dev`.
- D'ici là, un message aux ministères avec la nouvelle adresse.
- Règle 7 contre ce bundle pour toute migration, T75 comprise.

### 5.6 Code mort ou en double à retirer

- **Neuf traductions locales** du même switch `reseau` et `delai`, à remplacer par la fonction
  unique (5.2) :
  - `evenements/refus.ts:36-56` ;
  - `signalement/refus.ts:22-42` ;
  - `nouveau-point/refus.ts` et `pointsEcriture.ts:112-130` ;
  - `indicateurs/validation/refus.ts:28-45` ;
  - `mes-indicateurs/refus.ts:31-45` ;
  - `saisie-session/erreurs.ts:28-40` ;
  - `indicateurs/configuration/useCreationPrevus.ts:21-33` et `panneaux/refus.ts:39-42` ;
  - `sessions/refus.ts` et `moderation/refus.ts` (par `phraseErreur`) ;
  - `data/comptes.ts:138-151`, la classification propre aux Edge Functions.
- **`MESSAGE_ACCES_EVENEMENT`** (`evenements/textes.ts:46`) répète `MESSAGES_COMMUNS.acces`, même texte.
- **`$B.connexion`** des comptes répète `MESSAGES_COMMUNS.peutEtreFait`, même texte.
- **`ajouter_evenement` à trois et à quatre arguments** : plus aucun front ne les appelle (main et
  Netlify appellent la version à cinq). À retirer par une migration **après** la redirection de
  Netlify (règle 7).
- **Phrase de « Ce ministère ne peut pas être mentionné. »** (`messagesBase.ts:236`) : « Un
  ministère coché a été désactivé » est faux pour un ministère supprimé (T74) ou pour soi-même.
  Proposition à faire valider : « Un ministère coché n'est plus disponible. Rechargez la page,
  puis réessayez. »

### 5.7 Critères d'acceptation

1. **Étant donné** un ministère qui ajoute un événement avec huit mentions dont FIJ (le cas de la
   capture), **quand** la base répond, **alors** « Événement ajouté au calendrier. », le formulaire
   se vide et le calendrier est relu.
2. **Étant donné** un ajout envoyé, **quand** `fetch` est rejeté (« Load failed ») ou que 10 s
   passent, **alors** l'écran dit « La connexion a échoué. Vérifiez la liste avant de réessayer. »,
   garde la saisie et relit le calendrier. Jamais « Votre saisie est encore dans le formulaire :
   réessayez ».
3. **Étant donné** notre délai de 10 s, **quand** le navigateur rejette avec `AbortError`,
   **alors** l'issue est classée `delai`, comme avec `TimeoutError`.
4. **Étant donné** un refus connu de la base, **quand** il revient, **alors** sa phrase s'affiche
   sous son champ ou sous le bouton, jamais « La connexion a échoué ».
5. **Étant donné** un refus inconnu (P0001 hors table, 23xxx, 22P02, 57014, PGRST202, 5xx),
   **quand** il revient, **alors** le repli « L'enregistrement n'a pas abouti... prévenez EJP Tech »,
   jamais « La connexion a échoué ».
6. **Étant donné** une exception JavaScript pendant l'envoi (`code: ''`, message qui n'est pas un
   message de fetch), **alors** le repli, pas la connexion.
7. **Étant donné** une modification de chiffres (écriture idempotente), **quand** `fetch` est
   rejeté, **alors** « Vos chiffres sont encore dans le formulaire : réessayez » (inchangé).
8. **Étant donné** un échec d'envoi, **quand** EJP Tech cherche la requête, **alors** l'API Gateway
   montre la version et le site du front (`x-client-info`), et l'écran a montré une référence
   courte.
9. **Étant donné** l'adresse Netlify, **quand** on l'ouvre, **alors** elle renvoie vers
   `pages.dev` (geste 11).

### 5.8 États de l'écran « Ajouter un événement »

| État                 | Bouton                               | Sous le bouton                                                               | Saisie | Relecture |
| -------------------- | ------------------------------------ | ---------------------------------------------------------------------------- | ------ | --------- |
| Repos                | « Ajouter au calendrier »            | rien                                                                         | ,      | ,         |
| Envoi                | « Enregistrement en cours », inactif | rien                                                                         | gardée | ,         |
| Réussite             | actif                                | « Événement ajouté au calendrier. » (6 s)                                    | vidée  | oui       |
| Refus sous un champ  | actif                                | rien ; phrase sous la date ou l'heure                                        | gardée | non       |
| Refus sous le bouton | actif                                | sa phrase (mentions, nom, droit)                                             | gardée | non       |
| Issue inconnue       | actif                                | « La connexion a échoué. Vérifiez la liste avant de réessayer. » + référence | gardée | oui       |
| Repli                | actif                                | « L'enregistrement n'a pas abouti... prévenez EJP Tech. » + référence        | gardée | non       |
| Connexion expirée    | ,                                    | phrase, puis l'écran de connexion avec retour                                | perdue | session   |
| Compte désactivé     | ,                                    | écran « Compte désactivé »                                                   | perdue | session   |

### 5.9 Options écartées

- **Nouvel essai automatique du POST sans clé d'idempotence** : doublons définitifs.
- **Outil de suivi externe** (Sentry ou équivalent) : nouvelle dépendance, données personnelles,
  changement de stack.
- **Afficher le texte brut de l'erreur** : contraire au contrat de `messagesBase` ; une référence
  courte suffit.
- **Allonger le délai** (25 s) : ne change pas le classement, et rallonge l'attente.
- **Détecter « hors ligne » par `navigator.onLine` seul** : peu fiable sur iOS ; à garder
  seulement comme indice dans la trace.

### 5.10 Risques

- La relecture après une issue inconnue coûte quelques lectures de plus : négligeable.
- La détection « déjà ajouté » par nom et date peut se tromper : option à valider, sinon on s'en
  tient à « Vérifiez la liste ».
- Changer `x-client-info` : supabase-js le pose déjà, il faut le compléter et non le remplacer.
  Cet en-tête est autorisé par le CORS de Supabase, à vérifier sur la préproduction locale.
- La table d'incidents (si acceptée) : registre des traitements, durée de conservation, droits
  (lecture par EJP Tech seulement), test de la matrice.
- Ancien site : aucun correctif ne l'atteint avant la redirection.

### 5.11 Tests à écrire en premier (échouent avant, passent après)

**Unitaires** (`src/data/messagesBase.test.ts`, `src/lib/supabase.test.ts`) :

1. `{ code: '', message: 'TypeError: Load failed' }` lu pour une **création** donne l'issue
   inconnue (aujourd'hui : `reseau`).
2. `{ code: '', message: "TypeError: undefined is not an object (evaluating 'x.y')" }` donne le
   repli (aujourd'hui : `reseau`).
3. `fetchAvecDelai` : un `fetch` simulé qui rejette `AbortError` après l'expiration du signal de
   10 s rejette une erreur nommée `TimeoutError` (aujourd'hui : `AbortError`, lue `reseau`).
4. Tableau croisé de toutes les créations : aucune ne rend `connexion` pour une issue inconnue,
   aucune ne rend `connexion` pour un P0001 inconnu.
5. `appelerFonction` (comptes) : une `FunctionsRelayError` donne `erreur_interne`, pas `connexion`.

**Composants** :

6. `FormulaireAjoutEvenement.test.tsx` : `envoyer` rejette `{ code: '', message: 'TypeError: Load
failed' }`. On attend la phrase « Vérifiez la liste avant de réessayer », la relecture appelée
   et la saisie gardée.
7. Mêmes cas pour `FormulaireNouveauPoint` et `FormulaireSignalement`.

**pgTAP** (garde, passe avant et après) :

8. Le cas réel : huit mentions dont FIJ, cinq arguments, heure nulle, date du jour. La fonction
   vit, écrit huit mentions et une ligne de journal portant les huit identifiants (repris de
   `audit-evenement.test.sql`).

**Playwright** :

9. `route('**/rest/v1/rpc/ajouter_evenement', r => r.abort('failed'))` : on attend la phrase de
   l'issue inconnue et la relecture du calendrier.
10. `route.fulfill({ status: 400, json: { code: 'P0001', message: 'Texte inconnu.' } })` : on
    attend le repli.
11. `route.fulfill({ status: 502, body: '<html>' })` : on attend le repli.
