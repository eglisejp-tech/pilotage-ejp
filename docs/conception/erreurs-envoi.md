# Conception : erreurs d'envoi, numéro anti-doublon, incidents (T76)

**Décision de la personne responsable, 26 octobre 2026** : conception validée, lots A, B et C, avec
les réponses « Proposé » aux questions Q1 à Q12. B et C partent ensemble, après A. La correction de
l'alignement des champs (branche `etape-8-alignement-champs`) part avec le lot A.

Conception écrite seulement : aucun code, aucun commit, aucun fichier du dépôt modifié. Méthode :
mémoire « démarche ingénieur ». Point de départ : `diagnostic.md` (même dossier), dont la section 5
est reprise et complétée ici. Décisions de la personne du 26 octobre 2026 : classement unique,
numéro anti-doublon, table d'incidents, version du site dans chaque appel.

Fait nouveau (coordinateur, 26 oct.) : le signalement « Problème au niveau de la saisie des
événement dans le calendrier » vient du ministère **Coordination**, écran « Ajouter un événement ».
C'est donc Coordination qui créait l'événement. Le cas réel des tests devient : compte Coordination
(présent dans le jeu d'exemple, `coordination@exemple.test`), huit mentions dont FIJ.

**Base de travail** : la branche `etape-8-production-claude` (b4dc398) n'a **pas** T75 : il lui
manque 39 fichiers de `origin/main` (0b5284a), dont `20261026084227_supprimer_partout.sql` et
`supabase/tests/comptes-suppression.test.sql`. Chaque lot part de `origin/main`. Les migrations de
cette conception sont datées après `20261026084227` (règle 6 de la section 7.1).

---

## 0. Les choix structurants, en bref

1. **Un seul classement** des échecs d'envoi (`src/data/echecEnvoi.ts`, pur) nourri par des **faits
   recueillis par le transport** (`fetchAvecDelai`) : statut HTTP reçu ou non, corps lu ou perdu,
   notre délai expiré ou non, réseau coupé au départ. Il rend un **genre** (sept genres techniques,
   plus les refus) et une **issue** (enregistré, rien d'enregistré, inconnue). La phrase dépend de
   l'issue et de la **nature de l'opération** (création, reprise sans risque, action sans
   formulaire). Un bogue ne dit jamais « La connexion a échoué ».
2. **Numéro anti-doublon** sur les trois seules créations qui en ont besoin (événement, point,
   signalement), tiré **au premier envoi** et gardé jusqu'à la réussite. Une table privée unique
   `private.envoi` (compte, numéro, opération, identifiant créé, empreinte), clé `(compte, numéro)`.
   Nouvelles surcharges à un argument de plus, **obligatoire** (un argument facultatif rendrait les
   appels de l'ancien site ambigus, PGRST203). Même numéro et même contenu : la base rend le même
   identifiant, n'écrit rien, ne journalise rien. Même numéro, autre contenu : refus lisible.
3. **Incidents** : table privée `private.incident`, écrite par `noter_incidents` (aal2, par lots de
   20, débit limité), alimentée par une **file locale** par espace (20 au plus, 7 jours), lue par
   EJP Tech seul dans **Modération**, sous « Signalements ». Ni texte saisi, ni compte, ni prénom,
   ni IP, ni user agent complet : le **profil**, le **ministère**, l'écran, l'opération, le genre,
   l'issue, le statut HTTP, le code, la durée, la famille du navigateur, la version du site, la
   référence. **90 jours**, purge à chaque écriture et à chaque lecture.
4. **Version et référence** : `X-Client-Info` reçoit `pilotage=<sha court>` sur chaque appel et
   `ref=<RÉFÉRENCE>` sur chaque écriture ; la même référence de 6 caractères s'affiche sous le
   message d'échec (« Référence pour EJP Tech : K7Q4MX ») et nomme l'incident.
5. **Trois lots** : A (front seul, aucun changement de base), B (base puis front : numéro), C (base
   puis front : incidents, Confidentialité, registre). Un lot D, plus tard, retire les anciennes
   signatures après la redirection de Netlify.

---

## 1. Besoin

- Une personne qui envoie un formulaire doit savoir **ce qui est vrai** : enregistré, pas
  enregistré, ou on ne sait pas. Aujourd'hui, toute erreur sans code (`code: ''` de postgrest-js)
  devient « La connexion a échoué. Votre saisie est encore dans le formulaire : réessayez. », y
  compris quand la base a enregistré et que seule la réponse s'est perdue. Pour une création en
  ajout seulement, réessayer fabrique un **doublon qui ne s'efface pas** (seul un état « Annulé »
  le retire du calendrier) et qui **fausse les comptages de l'église** (T68, que Coordination lit).
- Réessayer doit être **sans risque** pour les créations : le second envoi ne doit rien créer de
  plus.
- EJP Tech doit pouvoir **expliquer un échec** sans lire la production à l'aveugle : quoi, quand,
  quel écran, quelle version du site, quel navigateur, quelle issue. Les journaux de la passerelle
  Supabase ne le permettent qu'en partie : `Referrer-Policy: no-referrer` (public/_headers) vide le
  `referer`, l'ancien site et le nouveau ont le même `x_client_info`, et l'offre gratuite garde ces
  journaux environ un jour (à vérifier au tableau de bord).
- Tout cela sans casser l'ancien site Netlify, qui sert encore un bundle figé (règle 7).

---

## 2. Faits établis (lecture du code)

| Fait                                                                                                                                                                                                                                                                                                                                                      | Source                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| postgrest-js rattrape toute exception de `fetch` **et** de la lecture du corps, et rend `{ code: '', message: '<nom>: <message>' }` avec `status: 0` : le statut HTTP déjà reçu est **perdu**.                                                                                                                                                            | `node_modules/@supabase/postgrest-js/dist/index.mjs` 404-466                                                                                                                                                                                                                                                                                                      |
| Une réponse non JSON (page 502 d'une passerelle) donne `{ message: '<html>' }`, sans code, statut gardé.                                                                                                                                                                                                                                                  | même fichier, 512-524                                                                                                                                                                                                                                                                                                                                             |
| `lireErreurBase` classe tout `code === ''` en `reseau`, avant de regarder le message.                                                                                                                                                                                                                                                                     | `src/data/messagesBase.ts` 714-730                                                                                                                                                                                                                                                                                                                                |
| `estDelaiDepasse` reconnaît le délai par le nom rendu par le navigateur (`TimeoutError`), pas par notre signal.                                                                                                                                                                                                                                           | `src/lib/requetes.ts` 14-20                                                                                                                                                                                                                                                                                                                                       |
| `fetchAvecDelai` sert à PostgREST, Auth **et** Edge Functions (option `global.fetch`).                                                                                                                                                                                                                                                                    | `src/lib/supabase.ts` 72-81, 103                                                                                                                                                                                                                                                                                                                                  |
| supabase-js pose déjà `X-Client-Info: supabase-js/2.117.2; runtime=web` ; les Edge Functions l'autorisent (`Access-Control-Allow-Headers`).                                                                                                                                                                                                               | `node_modules/@supabase/supabase-js/dist/index.mjs` 33 ; `supabase/functions/_shared/http.ts` 7                                                                                                                                                                                                                                                                   |
| postgrest-js accepte `.abortSignal(signal)`, functions-js accepte `signal` : un appel peut porter un signal qui lui est propre.                                                                                                                                                                                                                           | postgrest-js ; `functions-js/dist/module/FunctionsClient.js` 185                                                                                                                                                                                                                                                                                                  |
| Neuf traductions locales répètent le même `switch` sur `reseau` et `delai`.                                                                                                                                                                                                                                                                               | `evenements/refus.ts`, `signalement/refus.ts`, `nouveau-point/refus.ts` et `pointsEcriture.ts`, `indicateurs/validation/refus.ts`, `mes-indicateurs/refus.ts`, `saisie-session/erreurs.ts`, `indicateurs/configuration/useCreationPrevus.ts` et `panneaux/refus.ts`, `sessions/refus.ts` et `moderation/refus.ts` (par `phraseErreur`), `data/comptes.ts` 138-151 |
| Textes en double : « Cet élément est introuvable. Rechargez la page. » écrit 6 fois ; « ... Votre saisie est encore dans le formulaire : réessayez. » écrit 7 fois ; « La connexion a échoué. Vérifiez la liste avant de réessayer. » 2 fois.                                                                                                             | `textes.ts` de evenements, validation, mes-indicateurs, moderation, signalement ; panneaux, nouveau-point, points-actions (3), sessions ; `comptes.ts` 48                                                                                                                                                                                                         |
| Créations en ajout seulement sans protection naturelle contre le doublon : `ajouter_evenement`, `creer_point`, `signaler_difficulte`. Les autres créations sont protégées par une unicité (libellé, session type et date, adresse, une seule décision, un seul traitement, une seule clôture) ou sont des déclarations dont « la plus récente fait foi ». | migrations, section 5.1                                                                                                                                                                                                                                                                                                                                           |
| `structure.test.sql` liste exhaustivement les tables et les fonctions (avec leur nombre d'arguments) : toute surcharge et toute table nouvelle s'y ajoutent.                                                                                                                                                                                              | `origin/main:supabase/tests/structure.test.sql` 37-50, 333-350                                                                                                                                                                                                                                                                                                    |
| `messagesBase.test.ts` lit chaque `raise exception` des migrations : tout message nouveau entre dans la table.                                                                                                                                                                                                                                            | `src/data/messagesBase.ts` en-tête                                                                                                                                                                                                                                                                                                                                |

---

## 3. Scénarios réels (critères d'acceptation)

Chaque scénario devient un test (section 14). « Réf. » désigne la ligne « Référence pour EJP Tech :
XXXXXX » sous le message.

**S1. Le cas du 26 octobre (réponse perdue).** Étant donné le compte Coordination sur iPhone,
le formulaire « Ajouter un événement » rempli (nom, date du jour, statut, aucune heure, huit
mentions dont FIJ), quand elle touche « Ajouter au calendrier », que la base enregistre et que la
réponse se perd (« Load failed »), alors :

- lot A : l'écran dit « La connexion a échoué. Vérifiez la liste avant de réessayer. » et la Réf.,
  garde la saisie et relit le calendrier (qui montre l'événement) ;
- lot B : si elle touche de nouveau le bouton, la base reconnaît le numéro et rend le même
  événement ; l'écran dit « Événement ajouté au calendrier. » et vide le formulaire. Le calendrier
  montre **un seul** événement, le journal **une seule** ligne « Événement ajouté » avec ses huit
  mentions ;
- lot B avec le nouvel essai automatique (Proposé, Q1) : l'outil renvoie seul, une fois, le même
  envoi ; l'écran dit directement « Événement ajouté au calendrier. » ;
- lot C : un incident « Pas de réponse, issue inconnue » (ou « rattrapé » après le nouvel essai)
  part vers la base, et EJP Tech le lit dans Modération, sous le signalement de Coordination.

**S2. Nouvel essai à la main après une issue inconnue, contenu inchangé.** Étant donné S1 et une
première requête enregistrée, quand la personne touche de nouveau le bouton sans rien changer,
alors la base rend l'identifiant du premier envoi, n'écrit aucune ligne et aucun journal ; l'écran
dit la réussite.

**S3. Même numéro, contenu changé.** Étant donné S1, quand la personne corrige le nom puis renvoie,
alors la base refuse (« Cet envoi est déjà enregistré avec d'autres valeurs. »), l'écran dit
« Votre premier envoi est déjà enregistré. Vérifiez la liste avant de réessayer. », relit la liste
et oublie le numéro : un nouvel envoi volontaire créera un autre événement.

**S4. Panne sans réseau (mode avion).** Étant donné un téléphone hors ligne au moment d'envoyer
(`navigator.onLine` faux au départ), quand elle touche le bouton, alors rien ne part ; l'écran dit
« La connexion a échoué. Votre saisie est encore dans le formulaire : réessayez. » et la Réf.
(Proposé, Q9 : « hors ligne au départ » vaut « rien n'est parti ») ; l'incident attend dans la
file du téléphone, part au retour du réseau, une seule fois.

**S5. Passerelle en panne (502 avec une page HTML).** Étant donné une réponse 502 non JSON, quand
l'envoi est une création, alors « La connexion a échoué. Vérifiez la liste avant de réessayer. »,
Réf., relecture ; quand c'est une saisie de chiffres, alors « La connexion a échoué. Vos chiffres
sont encore dans le formulaire : réessayez. » et la Réf. Jamais le texte HTML.

**S6. Délai de 10 s.** Étant donné une requête sans réponse pendant 10 s, quand c'est une
création, alors « Vérifiez la liste avant de réessayer », Réf., relecture, **même si Safari rejette
avec `AbortError`** au lieu de `TimeoutError` ; quand c'est une lecture, alors « La réponse met
trop de temps. Réessayez. » (inchangé).

**S7. Bogue du code.** Étant donné une exception de l'application pendant l'envoi (TypeError d'un
autre message que ceux de fetch, contrôle Zod imprévu), alors « L'enregistrement n'a pas abouti,
votre saisie est gardée. Réessayez, et si le problème revient, prévenez EJP Tech. » et la Réf. ;
jamais « La connexion a échoué ». Si le bogue survient **après** une réponse 2xx, alors la
réussite (la base a enregistré).

**S8. Session expirée.** Étant donné un jeton expiré, aal1, ou une requête partie sans jeton
(« permission denied for function », rôle `anon` après un renouvellement raté), alors « Votre
connexion a expiré. Reconnectez-vous. », puis l'écran de connexion avec la page en retour ;
l'incident « Connexion expirée » attend dans la file et part après la reconnexion (aal2).

**S9. Ancien site.** Étant donné le site Netlify (bundle figé) après les migrations B et C, quand
Coordination y ajoute un événement, alors la version à cinq arguments répond exactement comme
avant (sans numéro) ; dans les journaux de la passerelle, son `x_client_info` sans `pilotage=` le
distingue ; il n'écrit aucun incident.

**S10. Refus connu.** Étant donné une date devenue passée, alors « Cette date est passée... » sous
le champ date avec le lien « Signaler une difficulté » (inchangé), sans Réf., sans incident.

**S11. Refus inattendu.** Étant donné un P0001 absent de la table, un 23505 ou un 22P02, alors le
repli et la Réf. ; l'incident « Refus inattendu » garde le code (jamais le message).

**S12. Réponse perdue après un 200 sur des chiffres.** Étant donné une saisie de chiffres dont le
statut 200 est arrivé mais dont le corps s'est perdu, alors « Chiffres du dimanche ... enregistrés. »
(la base a enregistré) ; un incident « Réponse perdue, enregistré » est noté pour la statistique.

**S13. EJP Tech lit.** Étant donné l'incident de S1, quand EJP Tech ouvre Modération, alors sous
« Signalements » (qui montre le signalement de Coordination du 26 oct.), la liste repliée
« Incidents d'envoi des 90 derniers jours (1) » montre « Lun. 26 oct., 12 h 37 : Coordination,
Ajouter un événement. Pas de réponse, issue inconnue. » puis « Safari 26, iOS. Version 3f2a1c9.
Référence K7Q4MX. » ; aucun autre profil n'a cette liste ni la fonction de lecture.

**S14. Comptes (Edge Functions).** Étant donné « Créer le compte » dont la requête est rejetée par
fetch, alors « La connexion a échoué. Vérifiez la liste avant de réessayer. », Réf., relecture de
la liste ; étant donné une `FunctionsRelayError` (la fonction n'a pas tourné), alors « L'action n'a
pas abouti. Réessayez dans quelques minutes. » (`erreur_interne`), plus « La connexion a échoué ».

**S15. Abus ou boucle.** Étant donné un lot de 25 incidents, alors 20 sont gardés ; étant donné un
101e incident en 24 h pour le même ministère (ou le même profil hors ministère), alors il est
ignoré sans erreur ; un incident déjà reçu (même référence) n'est pas recopié.

**S16. Deux espaces sur un appareil (T73).** Étant donné un incident survenu dans l'espace A,
quand la personne passe à l'espace B, alors l'incident reste dans la file de A et ne part que
quand A est de nouveau actif et en aal2 : il n'est jamais attribué au ministère de B.

---

## 4. Classement unique des échecs d'envoi

### 4.1 Faits recueillis par le transport

`fetchAvecDelai` (déplacé dans `src/lib/transport.ts`, `src/lib/supabase.ts` l'importe) garde son
rôle et note, pour chaque écriture qui porte un **suivi**, ce qui s'est passé. Le suivi est attaché
au signal propre de l'appel (`WeakMap<AbortSignal, Suivi>`) : `envoyer()` (4.4) crée un
`AbortController`, passe son signal par `.abortSignal()` ou l'option `signal` des Edge Functions,
et relit le suivi après l'appel. Aucun en-tête maison, aucune course entre deux envois.

```ts
interface Suivi {
  reference: string // 6 caractères, tirée par envoyer()
  enLigneAuDepart: boolean // navigator.onLine juste avant fetch
  debut?: number
  fin?: number // performance.now()
  statut?: number // statut HTTP, s'il est arrivé
  phase?: 'reponse' | 'sans_reponse' | 'corps_perdu' | 'delai'
  nomErreur?: string // TypeError, AbortError, TimeoutError...
}
```

Ce que fait `fetchAvecDelai`, dans l'ordre :

1. **En-tête** : ajoute `; pilotage=<sha court>` à `X-Client-Info` sur **tout** appel (lectures,
   Auth comprises), et `; ref=<référence>` sur une écriture suivie. Exemple :
   `supabase-js/2.117.2; runtime=web; pilotage=3f2a1c9; ref=K7Q4MX`. Il complète l'en-tête, ne le
   remplace pas.
2. **Notre délai** : si `fetch` (ou la lecture du corps) rejette alors que **notre** signal de 10 s
   a expiré, il rejette une `DOMException` nommée `TimeoutError`, quel que soit le nom choisi par
   le navigateur, et note `phase: 'delai'`. `estDelaiDepasse` et `relancer` (lectures) continuent
   de marcher sans changement.
3. **Corps lu ici pour une écriture** : il lit le corps (`await reponse.text()`) dans un `try`,
   puis rend `new Response(corps, { status, statusText, headers })`. Une lecture qui échoue note
   `phase: 'corps_perdu'` avec le statut déjà reçu, et rejette une erreur nommée `ReponsePerdue`.
   Le corps d'une écriture fait quelques octets : aucun coût.
4. **Rejet de fetch** : note `phase: 'sans_reponse'` et le nom de l'erreur.

### 4.2 Genres et issues

Le classement lit d'abord le suivi (s'il existe), puis l'erreur.

| Genre               | Reconnu par                                                                                                                                                                                                                               | Issue                                                                                                             | Incident |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------- |
| `refus`             | code connu de la table (P0001, 42501 connu), consigne Zod du schéma, code connu d'une Edge Function                                                                                                                                       | rien d'enregistré                                                                                                 | non      |
| `acces`             | 42501 sans phrase (RLS)                                                                                                                                                                                                                   | rien d'enregistré                                                                                                 | non      |
| `desactive`         | 42501 « Compte inactif ou inconnu. »                                                                                                                                                                                                      | rien d'enregistré                                                                                                 | non      |
| `session`           | PGRST301 à 303, « JWT », 42501 « Double authentification requise. », **« permission denied for function/table »** (requête partie sans jeton, Proposé Q8), codes `non_authentifie`, `session_revoquee`, `double_authentification_requise` | rien d'enregistré                                                                                                 | oui      |
| `sans_reponse`      | `phase: 'sans_reponse'` ; sans suivi : `code: ''` et message de fetch connu (Failed to fetch, Load failed, NetworkError, fetch failed), `...FetchError`, `AbortError`                                                                     | **inconnue** ; **rien d'enregistré** si `enLigneAuDepart` est faux (Q9)                                           | oui      |
| `reponse_perdue`    | `phase: 'corps_perdu'`                                                                                                                                                                                                                    | **enregistré** si statut 2xx ; rien d'enregistré si 4xx ; inconnue si 5xx                                         | oui      |
| `reponse_illisible` | statut reçu, corps non JSON ou JSON sans code (502, 503, 504, 520 à 524)                                                                                                                                                                  | inconnue si 5xx ; rien d'enregistré si 4xx                                                                        | oui      |
| `delai`             | `phase: 'delai'` ; sans suivi : `TimeoutError`                                                                                                                                                                                            | **enregistré** si un 2xx était arrivé avant ; sinon inconnue                                                      | oui      |
| `refus_inconnu`     | code présent hors table (P0001 inconnu, 23xxx, 22P02, 22003, 57014, PGRST202, PGRST203, 5xx JSON de PostgREST), `erreur_interne`, `FunctionsRelayError`                                                                                   | rien d'enregistré (PostgREST annule la transaction sur toute réponse d'erreur)                                    | oui      |
| `bogue`             | toute autre exception : TypeError d'un autre message, message Zod par défaut, `Error` du code                                                                                                                                             | **enregistré** si un 2xx était arrivé ; sinon rien d'enregistré si `fetch` n'a jamais été appelé ; sinon inconnue | oui      |

Règle d'or : **un statut 2xx reçu vaut enregistré**, quoi qu'il arrive ensuite (PostgREST valide la
transaction avant de répondre). Les genres techniques ne prennent jamais une phrase de refus, et
`bogue` ne prend jamais la phrase de connexion.

### 4.3 La phrase selon l'issue et la nature de l'opération

Trois natures, fixées une fois par opération (4.5) :

- **création** : refaire peut créer une deuxième ligne, ou donnerait un refus trompeur
  (« existe déjà ») ;
- **reprise** : refaire ne crée rien de plus (la plus récente fait foi, ou la base refuse le
  second envoi avec une phrase « déjà ») ;
- **action** : sans formulaire (« Rien à signaler », « Supprimer », boutons d'une ligne).

| Issue, genre                                                                                           | Création                                                                                                                                                                                       | Reprise                                                                                                       | Action                                                                                       |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| enregistré (tout genre)                                                                                | la réussite de l'écran, relecture                                                                                                                                                              | la réussite, relecture                                                                                        | la réussite, relecture                                                                       |
| `refus`, `acces`, `desactive`, `session`                                                               | phrase de la table (sous son champ) ; phrase d'accès de l'écran ; « Ce compte est désactivé. Contactez EJP Tech. » ; « Votre connexion a expiré. Reconnectez-vous. » (relecture de la session) | idem                                                                                                          | idem                                                                                         |
| inconnue (`sans_reponse`, `reponse_perdue` 5xx, `reponse_illisible` 5xx, `delai`, `bogue` après envoi) | « La connexion a échoué. Vérifiez la liste avant de réessayer. » + Réf. + relecture                                                                                                            | phrase de connexion de l'écran (« Vos chiffres ... » ou « Votre saisie ... : réessayez. ») + Réf. + relecture | phrase de connexion de l'écran + Réf.                                                        |
| rien d'enregistré, `sans_reponse` hors ligne au départ                                                 | « La connexion a échoué. Votre saisie est encore dans le formulaire : réessayez. » + Réf.                                                                                                      | phrase de connexion de l'écran + Réf.                                                                         | idem                                                                                         |
| rien d'enregistré, `refus_inconnu`, `reponse_*` 4xx, `bogue` avant envoi                               | repli « L'enregistrement n'a pas abouti, votre saisie est gardée. Réessayez, et si le problème revient, prévenez EJP Tech. » + Réf.                                                            | repli + Réf.                                                                                                  | « L'action n'a pas abouti. Réessayez, et si le problème revient, prévenez EJP Tech. » + Réf. |

Sur les écrans d'EJP Tech, le recours s'adapte (guide 10, règle 2) : « Référence : K7Q4MX » au lieu
de « Référence pour EJP Tech : ».

### 4.4 Où vit le code

- `src/lib/transport.ts` (nouveau) : `fetchAvecDelai`, `suivre(signal, suivi)`, `VERSION_SITE`
  (constante de build `__VERSION_SITE__`, définie par `vite.config.ts` à partir de `GITHUB_SHA`,
  7 caractères, `local` sinon : aucune modification de la CI), `tirerReference()` (6 caractères
  dans `23456789ABCDEFGHJKMNPQRSTUVWXYZ`, sans 0, 1, I, L, O).
- `src/data/envoi.ts` (nouveau) : `envoyer(operation, appel)` enveloppe **toute** écriture de
  `src/data/` (contrôle Zod compris) ; il tire la référence, crée le signal et le suivi, appelle,
  classe l'échec, note l'incident (lot C) et lève une `EchecEnvoi` (`genre`, `issue`,
  `reference`, `operation`, `cause`, `suivi`). Il fait aussi le nouvel essai automatique (Q1).
- `src/data/echecEnvoi.ts` (nouveau, pur) : `classer(erreur, suivi?)` et
  `lireEchec(erreur, phrasesEcran)` → `{ message, champ, nature, reference, relire }`. Il appelle
  la table de `messagesBase.ts` pour les réponses qui portent un code.
- `src/data/messagesBase.ts` : garde la table de traduction (refus) ; perd les genres `reseau` et
  `delai` et le test sur `code === ''`. `phraseErreur` et `phraseLecture` restent pour les
  lectures, réécrites sur `classer`.
- `src/features/evenements/useApresEcriture.ts` : `creerPuisRelire` devient `relireApres(echec)` :
  relit après une réussite et après toute issue « enregistré » ou « inconnue ».
- `ErreurFormulaire` reçoit `reference` et l'affiche dans un paragraphe à part, sous l'alerte, en
  `--encre-2`, non annoncé (l'alerte reste courte pour le lecteur d'écran).

### 4.5 Catalogue des opérations (une seule liste, `src/data/envoi.ts`)

| Nature   | Opérations                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| création | `ajouter_evenement`, `creer_point`, `signaler_difficulte` (avec numéro, lot B) ; `ajouter_suggestion`, `valider_indicateur`, `creer_indicateur`, `creer_calcul`, `creer_indicateurs_prevus`, `choisir_modele_prevus`, `declarer_session`, et les sept Edge Functions des comptes (relecture de la liste, texte actuel `connexion`)                                                                                                                                     |
| reprise  | saisies de chiffres (`mesure`, `saisir_chiffres_mois`, `fij_departement`, `saisir_fij_statistiques`, `participation`), `reunion`, `evenement_etat` (une ligne identique est refusée, T37), `changer_statut_point`, `modifier_mentions_point`, `marquer_traite` (un seul traitement), `clore_signalement` (une seule clôture), `corriger_indicateur`, `retirer_indicateur`, `retirer_mon_indicateur`, `modifier_session`, `accepter_conditions`, `declarer_intervenant` |
| action   | `supprimer_session`, `marquer_relu`, `masquer_texte`, `effacer_prenom`, `effacer_prenoms_anciens`                                                                                                                                                                                                                                                                                                                                                                      |

Un test Vitest vérifie que chaque écriture de `src/data/` passe par `envoyer` (lecture du code :
aucun `.rpc(`, `.insert(`, `.upsert(` ni `functions.invoke(` d'écriture hors de `envoyer`).

### 4.6 Ce que chaque écran garde

Chaque écran ne garde que le **placement** : quel champ il a (date, heure, texte, mentions...) et
sa phrase d'accès. La variante `{ ou: 'connexion' }` disparaît de tous les types de refus
(`Refus`, `RefusPoint`, `RefusSignalement`, `RefusSuggestion`, `RefusValidation`, `EchecEnvoi` des
saisies) : `lireEchec` rend toujours une phrase, que l'écran place sous son champ ou sous son
bouton.

### 4.7 Edge Functions des comptes

`appelerFonction` passe par `envoyer('creer-compte', ...)` : `FunctionsHttpError` avec un code
connu donne `refus` (sa phrase actuelle) ; `erreur_interne` et `FunctionsRelayError` donnent
`refus_inconnu` (« L'action n'a pas abouti. Réessayez dans quelques minutes. ») ; un corps non JSON
en 5xx donne `reponse_illisible` (inconnue) ; un rejet de fetch donne `sans_reponse` (inconnue).
`ErreurCompte('connexion')` reste le code de l'issue inconnue ; son texte devient
`MESSAGES_COMMUNS.peutEtreFait` (plus de copie).

---

## 5. Numéro anti-doublon (idempotence)

### 5.1 Quelles créations

| Création                                                        | Doublon possible ?                                                                               | Numéro  |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------- |
| `ajouter_evenement` (événement, mentions, premier état)         | oui : deux événements, ineffaçables, comptés deux fois dans les comptages de l'église            | **oui** |
| `creer_point` (point, mentions, premier suivi)                  | oui : deux points ouverts, chacun à traiter                                                      | **oui** |
| `signaler_difficulte`                                           | oui : deux signalements à clore                                                                  | **oui** |
| `reunion` (ajout direct)                                        | sans effet visible : « la déclaration la plus récente fait foi » ; seul le journal a deux lignes | non     |
| `participation`, `mesure`, `fij_departement`, `fij_statistique` | sans effet : la plus récente fait foi                                                            | non     |
| `evenement_etat` (mise à jour)                                  | non : une ligne identique au dernier état est refusée (T37)                                      | non     |
| `ajouter_suggestion`, `creer_indicateur`, `creer_calcul`        | non : libellé unique par ministère                                                               | non     |
| `declarer_session`                                              | non : unicité (type, date)                                                                       | non     |
| `valider_indicateur`, `marquer_traite`, `clore_signalement`     | non : une seule décision, un seul traitement, une seule clôture                                  | non     |
| `creer-compte`                                                  | non : une adresse, un compte (Auth)                                                              | non     |
| `declarer_intervenant`, `accepter_conditions`                   | sans effet : la plus récente fait foi, ou idempotente                                            | non     |

Trois créations seulement reçoivent un numéro. Les autres gardent la phrase « Vérifiez la liste
avant de réessayer » quand l'issue est inconnue (section 4.3), car leur second envoi serait refusé
par une phrase trompeuse (« existe déjà »), sans créer de doublon.

### 5.2 Côté téléphone : quand le tirer, combien de temps le garder

**Choix : au premier envoi, gardé jusqu'à la réussite** (Proposé, Q3).

- Le formulaire garde `cle = useRef<string | null>(null)`. Au premier envoi : `cle.current ??=
crypto.randomUUID()` (repli `crypto.getRandomValues` pour un iOS ancien). Chaque nouvel essai,
  automatique ou à la main, renvoie le même numéro.
- Réussite (ou « enregistré » d'après le suivi) : le numéro est oublié ; le formulaire vidé en
  tirera un autre.
- Refus « Cet envoi est déjà enregistré avec d'autres valeurs. » (S3) : le numéro est oublié.
- Autre refus (rien d'enregistré) : le numéro reste ; c'est sans effet, car la base n'a rien gardé
  (la transaction est annulée avec le refus).
- Fermeture du formulaire : le numéro disparaît avec lui.

Pourquoi pas à l'ouverture : un numéro représente **un envoi**, pas un affichage ; le formulaire
reste ouvert après une réussite pour « un autre événement » et devrait de toute façon en tirer un
nouveau ; un tirage paresseux au moment de l'envoi résiste aux remontages de React. Les deux
choix se valent pour les refus (rien n'est gardé sous le numéro).

Limite assumée : le numéro n'est pas gardé si la page se recharge (Safari qui décharge l'onglet,
fermeture du panneau) ; la relecture et « Vérifiez la liste » restent le filet.

### 5.3 Modèle : `private.envoi`

Une seule table privée, pour les trois créations (et toute création future), au lieu d'une colonne
sur trois tables en ajout seulement :

```sql
create table private.envoi (
  compte uuid not null references public.compte (user_id),
  cle uuid not null,
  operation text not null check (operation in ('ajouter_evenement', 'creer_point', 'signaler_difficulte')),
  cible_id uuid not null,                         -- l'événement, le point ou le signalement créé
  empreinte text not null check (empreinte ~ '^[0-9a-f]{32}$'),
  le timestamptz not null default statement_timestamp(),
  primary key (compte, cle)
);
create index envoi_le_idx on private.envoi (le);
alter table private.envoi enable row level security;
create policy double_authentification on private.envoi as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');
revoke all on private.envoi from public, anon, authenticated, service_role;
-- Inaltérable (update refusé, truncate refusé) ; seule la purge des lignes de plus de 7 jours
-- supprime, sous le réglage local pilotage.purge_envoi (modèle de pilotage.masquage).
```

- **Portée : par compte** (`auth.uid()` imposé par la base, jamais envoyé par le téléphone). Un
  compte ne peut ni lire ni deviner le numéro d'un autre. Par ministère n'apporterait rien (un
  compte actif par ministère) et ouvrirait une sonde entre l'ancien et le nouveau compte d'un
  ministère.
- **Empreinte** : `md5` des valeurs **normalisées** (nom sans espaces autour, mentions sans doublon
  et triées, date, statut, heure ; pour un point, titre, description, action, priorité par défaut,
  échéance, mentions ; pour un signalement, écran et texte). Deux envois qui ne diffèrent que par
  des espaces ou l'ordre des cases sont le même envoi.
- **Durée : 7 jours** (Proposé, Q5) : un numéro ne sert que le temps d'un nouvel essai. La purge
  efface aussi l'empreinte, qui dérive d'un texte libre (même un texte masqué ensuite).
- **Clé étrangère vers `compte`** : sans effet sur la suppression d'un ministère (T75), car une
  ligne d'envoi n'existe qu'à côté d'un événement, d'un point ou d'un signalement, qui bloquent
  déjà, et suppose un compte passé en aal2 (`compte_deja_active`).

### 5.4 Comportement exact de la fonction (événement ; point et signalement à l'identique)

```text
private.ajouter_evenement(p_titre, p_date, p_statut, p_mentions, p_heure_prevue, p_cle) :
 1. private.exige_aal2()                        -- aal1 : 42501 ; compte inactif : 42501
 2. v_ministere := private.mon_ministere()       -- null : 42501 « Seul un compte de ministère... »
 3. normaliser : v_titre (btrim), v_mentions (distinct, trié, sans null)
 4. v_empreinte := md5(jsonb_build_array(v_titre, p_date, p_statut, p_heure_prevue, v_mentions)::text)
 5. si p_cle n'est pas null : private.envoi_existant(p_cle, 'ajouter_evenement', v_empreinte)
      ligne trouvée, même opération, même empreinte  -> rendre son cible_id (aucune écriture, aucun journal)
      ligne trouvée, autre opération ou autre empreinte -> P0001 'Cet envoi est déjà enregistré avec d''autres valeurs.'
      aucune ligne                                    -> continuer
 6. contrôles d'aujourd'hui, inchangés : nom, date, date passée (private.aujourdhui()), statut,
    heure, mentions (soi-même, désactivé, inconnu)
 7. v_evenement := gen_random_uuid()
 8. si p_cle n'est pas null : insert into private.envoi (...) values (auth.uid(), p_cle, ..., v_evenement, v_empreinte)
      on conflict (compte, cle) do nothing
      aucune ligne posée (un envoi concurrent du même numéro vient de valider) -> refaire l'étape 5
 9. purge : delete from private.envoi where le < statement_timestamp() - interval '7 days' (sous le réglage local)
10. insert evenement (id = v_evenement), evenement_mention, evenement_etat (journal par le trigger, inchangé)
11. rendre v_evenement
```

Points importants :

- **Le numéro est lu avant les contrôles métier** (étape 5) : un nouvel essai après minuit (date
  devenue passée) ou après la désactivation d'un ministère mentionné rend l'événement déjà créé, au
  lieu d'un refus faux.
- **Concurrence** : deux requêtes du même numéro (notre délai a expiré pendant que la première
  tournait encore) : la seconde attend sur la clé primaire que la première valide, puis l'étape 8
  la renvoie à l'étape 5, qui voit la ligne (lecture validée, nouvelle instruction en READ
  COMMITTED). Si la première est annulée, la seconde crée. Jamais deux événements.
- **Même contenu, second envoi** : la base rend **le même identifiant**, n'écrit rien (ni ligne, ni
  mention, ni état, ni journal).
- **Contenu différent** : refus, rien d'écrit. On ne rend jamais l'existant en silence : la
  personne croirait sa correction enregistrée.
- **Sans numéro** (`p_cle` null, appel des anciennes signatures) : comportement d'aujourd'hui, octet
  pour octet.
- `private.envoi_existant` et `private.retenir_envoi` : deux aides `security definer`
  `set search_path = ''`, sans droit d'exécution pour aucun rôle de l'API (appelées par les
  fonctions privées, en propriétaire).

### 5.5 Signatures et compatibilité avec l'ancien site

| Fonction              | Aujourd'hui         | Ajoutée (lot B)                                            | Ancienne                                                                                                               |
| --------------------- | ------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `ajouter_evenement`   | 3, 4 et 5 arguments | 6 arguments : `(..., p_heure_prevue smallint, p_cle uuid)` | 5 arguments : `create or replace` qui délègue avec `null::uuid` (même signature, mêmes droits) ; 3 et 4 délèguent déjà |
| `creer_point`         | 6 arguments         | 7 : `(..., p_mentions uuid[], p_cle uuid)`                 | 6 délègue avec `null`                                                                                                  |
| `signaler_difficulte` | 2 arguments         | 3 : `(p_ecran text, p_texte text, p_cle uuid)`             | 2 délègue avec `null`                                                                                                  |

**`p_cle` est obligatoire dans la nouvelle signature, sans `default`.** PostgREST choisit la
fonction d'après les noms des arguments reçus : avec `p_cle uuid default null`, un appel de
l'ancien site à cinq arguments correspondrait à deux fonctions (5 et 6 avec défaut) et serait
refusé (PGRST203, « Could not choose the best candidate function »). Sans défaut, chaque appel ne
correspond qu'à une fonction : l'ancien site garde la sienne, le nouveau site appelle la nouvelle.

Chaque fonction publique nouvelle : `security invoker`, une ligne, `grant execute` à
`authenticated` seulement ; chaque privée : `security definer`, `set search_path = ''`,
`exige_aal2()` d'abord. Les types écrits à la main (`src/lib/base/evenements.ts`, `points.ts`,
`signalements.ts`) ne déclarent que la signature que le front appelle.

### 5.6 Journal, RLS, droits, matrice

- **Journal** : une seule ligne par création réelle (inchangé) ; aucune pour un second envoi
  reconnu, ni pour la purge.
- **Tables en ajout seulement** : `evenement`, `point_attention`, `signalement` et leurs lignes
  liées ne changent ni de colonnes ni de règles. `private.envoi` n'est pas dans la liste de
  CLAUDE.md : elle est inaltérable, sauf la purge des numéros de plus de 7 jours.
- **RLS et GRANT** : `private.envoi` : RLS activée, politique restrictive aal2, aucun droit pour
  aucun rôle (comme `private.ministere_modele`, T72). Aucune politique ni GRANT ne change sur les
  tables existantes.
- **Matrice (BRIEF, section 7)**, ligne à ajouter : « `private.envoi` (T76) : aucun accès direct,
  pour aucun profil ; écrite par `ajouter_evenement` (6), `creer_point` (7), `signaler_difficulte`
  (3), au nom du compte ».

### 5.7 Nouvel essai automatique (Proposé, Q1)

Pour les trois créations à numéro seulement : un seul nouvel essai, **immédiat**, avec le même
numéro et une nouvelle référence, seulement après `sans_reponse` en ligne ou `reponse_perdue` sans
2xx, **jamais** après `delai` (10 s de plus d'attente). Le bouton reste « Enregistrement en cours ».
Sur Safari, un « Load failed » vient souvent d'une connexion réutilisée périmée : le second essai
ouvre une connexion neuve. L'incident du premier essai est noté avec `rattrape = vrai` si le
second réussit. Sans cet essai, S1 demande un second toucher, sans risque grâce au numéro.

---

## 6. Incidents

### 6.1 Ce qu'on garde, et ce qu'on ne garde jamais

| Champ                                         | Pourquoi il sert                                                               | Valeurs                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `reference`                                   | relier une capture d'écran, un appel et la ligne des journaux de la passerelle | 6 caractères de l'alphabet de 4.4, unique                                                                                      |
| `survenu_le`                                  | heure sur le téléphone (indicative)                                            | horodatage ; ignoré s'il est à plus de 7 jours ou à plus d'un jour dans le futur                                               |
| `recu_le`                                     | heure de la base (qui fait foi)                                                | imposé                                                                                                                         |
| `profil`                                      | savoir si le problème touche un profil (berger, conseil...)                    | imposé : `private.mon_type()`                                                                                                  |
| `ministere_id`                                | relier à un signalement, au journal, à un appel du ministère                   | imposé : `private.mon_ministere()`, null hors ministère ; sans clé étrangère (comme le journal depuis T74)                     |
| `ecran`                                       | quel écran                                                                     | liste fermée des adresses de l'application (`/saisir/evenement`, `/ministeres/:id`...), sinon `autre` ; jamais un identifiant  |
| `operation`                                   | quel envoi                                                                     | liste fermée (catalogue 4.5), sinon `autre`                                                                                    |
| `genre`, `issue`, `rattrape`                  | le classement de la section 4                                                  | listes fermées                                                                                                                 |
| `statut_http`, `code`, `nom_erreur`           | distinguer H1a, H1b, H2, H3, H4 du diagnostic                                  | 100 à 599 ; SQLSTATE, code PostgREST ou code d'Edge Function (liste fermée), **jamais le message** ; liste fermée de noms      |
| `duree_ms`                                    | délai, connexion lente                                                         | 0 à 120 000                                                                                                                    |
| `en_ligne`, `visible`                         | réseau coupé, application en arrière-plan (iOS)                                | booléens                                                                                                                       |
| `version`                                     | quelle version du site                                                         | sha court (7 caractères) ou `local`                                                                                            |
| `navigateur`, `version_navigateur`, `systeme` | un défaut propre à Safari iOS, par exemple                                     | familles fermées (safari, chrome, firefox, edge, samsung, autre ; ios, android, macos, windows, linux, autre), version majeure |

**Jamais** : un texte saisi, un message d'erreur, une adresse email, une IP, un nom, un prénom
déclaré (T56), le compte, l'identifiant de session, l'user agent complet, l'adresse complète de la
page (seulement le modèle d'adresse). Toute clé inconnue du lot est ignorée.

**Ce qui est vraiment nécessaire, et pourquoi pas le compte** (Proposé, Q4) : le ministère et le
profil suffisent au diagnostic. Un ministère n'a qu'un compte actif ; le berger n'en a qu'un ; le
conseil et l'administration peuvent en avoir plusieurs, mais le profil suffit à savoir où chercher,
et la référence relie l'incident à la ligne exacte des journaux. Ne pas garder le compte évite un
identifiant de personne de plus (le berger reste identifiable par son profil : c'est dit sur la
page Confidentialité).

### 6.2 Qui écrit, double authentification, ce qu'on perd

- `public.noter_incidents(p_incidents jsonb)` (security invoker, une ligne) appelle
  `private.noter_incidents` (security definer, `set search_path = ''`, **`exige_aal2()` d'abord**).
  Ouverte à tous les profils actifs en aal2. Rend le nombre d'incidents gardés. Aucun journal.
- Pas d'écriture avant aal2 : la règle de CLAUDE.md et du BRIEF (section 8) vaut pour cette table
  comme pour les autres, et une écriture anonyme serait ouverte à n'importe qui. Un incident
  survenu avant aal2 (session expirée, code en cours) attend dans la file (6.3) et part après la
  connexion du même espace.
- **Ce qu'on perd** : les incidents d'un appareil qui ne repasse jamais en aal2 (personne qui
  abandonne, compte désactivé, file effacée par la navigation privée ou Safari après 7 jours sans
  visite) ; les échecs des écrans de connexion eux-mêmes (Auth), qui ne sont pas des envois de
  l'API : ils restent dans les journaux Auth de Supabase.

### 6.3 File locale

- `src/lib/fileIncidents.ts` : une file par espace (T73), clé `pilotage-incidents:<id de
l'espace>` dans `localStorage`, chaque accès dans un `try` (navigation privée : file en mémoire
  seulement).
- **Plafond** : 20 incidents ; au-delà, le plus ancien tombe. Un incident de plus de 7 jours tombe à
  l'envoi.
- **Envoi** : juste après l'incident si la session est aal2 ; à l'événement `online` ; quand la
  session de l'espace passe en aal2 ; après toute écriture réussie. Un seul envoi à la fois. Après
  une réponse 2xx, les références envoyées sortent de la file, même celles que la base a ignorées
  (sinon une boucle). Un échec de cet envoi ne crée **jamais** d'incident et ne dit rien à l'écran.
- **Dédoublonnage** : la référence est unique en base (`on conflict do nothing`) : un lot renvoyé
  après une réponse perdue ne se recopie pas.
- `noter_incidents` ne passe pas par `envoyer` (pas de référence, pas d'incident sur lui-même).

### 6.4 Limites d'abus

- 20 incidents par appel ; au-delà, ignorés.
- 100 incidents par 24 h par ministère (comptes de ministère) ou par profil (autres comptes) ;
  au-delà, ignorés sans erreur (index `(profil, ministere_id, recu_le)`).
- Chaque champ est fermé ou borné (6.1) ; une valeur hors liste devient `autre` ou null, une ligne
  sans genre ou sans référence valable est ignorée. Le corps de la requête reste petit (moins de
  10 Ko).
- Seul un compte actif en aal2 peut écrire : un abus est le fait d'un compte connu.

### 6.5 Qui lit, et où

- **EJP Tech seul**, par `public.incidents_recents(p_avant timestamptz default null)` (security
  invoker) sur `private.incidents_recents` (security definer, `exige_aal2()`, refus 42501 « Cet
  élément n'existe pas ou vous n'y avez pas accès. » pour tout autre profil). 50 lignes à la fois,
  du plus récent au plus ancien, avec le nom du ministère (« Ministère supprimé » s'il n'existe
  plus). Une seule surcharge : aucun risque PGRST203.
- **Où** : dans **Modération** (`/moderation`, l'accueil d'EJP Tech, maquette 15), une liste repliée
  sous le bloc « Signalements », sur le modèle de « Retirés par les ministères ces 30 derniers
  jours » (écran Indicateurs) et de « Dernières connexions » (Personnes, 50 puis « Afficher 50 de
  plus »). Les signalements des personnes et les incidents des appareils se lisent ensemble.
- **Pourquoi pas ailleurs** : le Journal technique est le même écran que le Journal du berger (T29),
  lu aussi par le berger et le conseil : y mêler les incidents casserait cette règle. Un dixième
  onglet ajouterait une adresse, une garde et un écran pour une liste courte. À écrire dans
  `LISEZMOI.md`, écran 15 (écart : un bloc non dessiné).
- Textes proposés (section 8.3).

### 6.6 Conservation et purge

- **90 jours** (Proposé, Q5) : assez pour la revue trimestrielle (exploitation, section 10) et pour
  voir un défaut qui revient d'un dimanche à l'autre ; au-dessous de la durée maximale recommandée
  par la CNIL pour les journaux (1 an, déjà citée sur la page Confidentialité).
- **Purge** : `private.purger_incidents()` supprime les incidents reçus il y a plus de 90 jours ;
  appelée par `noter_incidents` et par `incidents_recents`. Pas de `pg_cron` (aucune extension ni
  tâche nouvelle). Si personne n'écrit ni ne lit pendant des semaines, la purge attend le prochain
  appel : la page dit « 90 jours, puis effacés à la première occasion » (formulation à valider)
  ou on accepte la marge (Proposé : la marge, car EJP Tech ouvre Modération chaque semaine,
  section 11).
- **Pourquoi la suppression est permise** : `private.incident` n'est pas dans la liste « ajout
  seulement » de CLAUDE.md. Ce n'est ni une saisie ni une trace métier, c'est un journal technique,
  comme ceux de Supabase. Elle reste inaltérable (update refusé par trigger), et la seule
  suppression possible est la purge, sous le réglage local `pilotage.purge_incidents`, en
  propriétaire. Aucun rôle de l'API n'a le droit delete.

### 6.7 Page Confidentialité et registre des traitements

- `src/pages/PageConfidentialite.tsx`, « Données traitées », un point de plus : « Les incidents
  d'envoi : quand un enregistrement échoue, l'heure, l'écran, le type d'erreur, le nom et la
  version du navigateur et la version du site, avec le ministère ou le profil du compte. Jamais ce
  qui a été saisi. EJP Tech seul les lit, pour corriger l'outil. »
- « Durées de conservation », un point de plus : « **Incidents d'envoi** : 90 jours, puis
  effacés. »
- `docs/conformite/registre-traitements.md`, Fiche 4 « Journal et sécurité » : catégories (6.1),
  destinataire (EJP Tech), durée (90 jours), base légale (intérêt légitime : sécurité et
  fonctionnement du service, comme les journaux techniques), aucun prestataire nouveau, aucun
  transfert nouveau ; durée des numéros anti-doublon (7 jours) dans la même fiche.
- `VERSION_CONDITIONS` **inchangée** (Proposé, Q7) : aucun prestataire, aucun destinataire, aucune
  donnée personnelle de nature nouvelle (le même genre de journal technique que ceux déjà annoncés,
  sans IP) ; la page dit sa nouvelle date de mise à jour, personne n'accepte de nouveau (même
  raisonnement que T70). La mise à jour se fait **avec l'accord de la coordination**
  (exploitation, section 15) et part **avec** le front qui commence à noter (lot C), jamais après.
- BRIEF, section 2 (ligne « Les connexions, les erreurs et les journaux du serveur restent dans le
  tableau de bord Supabase ») : ajouter l'exception T76.

### 6.8 Modèle (esquisse de la migration du lot C)

```sql
create table private.incident (
  id bigint generated always as identity primary key,
  reference text not null unique check (reference ~ '^[2-9A-HJKMNP-Z]{6}$'),
  survenu_le timestamptz not null,
  recu_le timestamptz not null default statement_timestamp(),
  profil public.type_compte not null,
  ministere_id uuid,
  ecran text not null,
  operation text not null,
  genre text not null check (genre in ('session', 'sans_reponse', 'reponse_perdue',
                                        'reponse_illisible', 'delai', 'refus_inconnu', 'bogue')),
  issue text not null check (issue in ('enregistre', 'inconnue', 'rien_enregistre')),
  rattrape boolean not null default false,
  statut_http smallint check (statut_http between 100 and 599),
  code text check (code ~ '^([0-9A-Z]{5}|PGRST[0-9]{3}|[a-z_]{3,40})$'),
  nom_erreur text check (nom_erreur in ('TypeError', 'AbortError', 'TimeoutError', 'SyntaxError',
    'ZodError', 'ReponsePerdue', 'FunctionsFetchError', 'FunctionsRelayError', 'FunctionsHttpError',
    'Error', 'autre')),
  duree_ms integer check (duree_ms between 0 and 120000),
  en_ligne boolean,
  visible boolean,
  version text not null check (version ~ '^([0-9a-f]{7}|local)$'),
  navigateur text check (navigateur in ('safari', 'chrome', 'firefox', 'edge', 'samsung', 'autre')),
  version_navigateur smallint check (version_navigateur between 1 and 999),
  systeme text check (systeme in ('ios', 'android', 'macos', 'windows', 'linux', 'autre'))
);
create index incident_recu_idx on private.incident (recu_le desc);
create index incident_debit_idx on private.incident (profil, ministere_id, recu_le);
alter table private.incident enable row level security;
-- politique restrictive aal2 ; revoke all (public, anon, authenticated, service_role) ;
-- trigger : update et truncate refusés, delete seulement sous pilotage.purge_incidents.

-- private.ecrans_incident() et private.operations_incident() : listes fermées, immutable
--   (modèle de private.ecrans_signalement()) ; une adresse ou une opération nouvelle s'y ajoute
--   par migration, sinon elle arrive en « autre » (rien n'est refusé).
-- private.noter_incidents(p_incidents jsonb) returns integer  (exige_aal2, 20 au plus, débit,
--   champs fermés, profil et ministère imposés, on conflict (reference) do nothing, purge)
-- private.incidents_recents(p_avant timestamptz) returns table (...)  (exige_aal2, EJP Tech seul,
--   purge, 50 lignes, nom du ministère)
-- public.noter_incidents, public.incidents_recents : security invoker, grant execute à authenticated
```

Matrice (BRIEF, section 7), ligne à ajouter : « `private.incident` (T76) | Ministère : A par
`noter_incidents` (son ministère imposé) | Berger, conseil : A par `noter_incidents` |
Administration : A par `noter_incidents` | EJP Tech : L par `incidents_recents`, A par
`noter_incidents` | aal1 : Rien | Anonyme : Rien ».

---

## 7. Version du site et référence courte

- **Version** : `pilotage=<sha court>` dans `X-Client-Info` de chaque appel (l'en-tête est déjà
  autorisé par la passerelle Supabase et par les Edge Functions ; un en-tête maison serait refusé
  par le CORS de la passerelle). La passerelle le journalise (`x_client_info`) : on filtre
  par version, et l'**absence** de `pilotage=` désigne l'ancien site (Netlify, bundle figé) ou un
  build d'avant le lot A.
- **Référence** : tirée par `envoyer` pour chaque requête d'écriture, posée dans `X-Client-Info`
  (`ref=K7Q4MX`), affichée sous le message d'échec, et clé de l'incident. Une capture d'écran
  suffit pour retrouver l'incident (90 jours) et, dans les 24 h environ, la ligne exacte de la
  passerelle (présente : la requête est arrivée ; statut 200 : la base a enregistré ; absente :
  H1a). Un échec sans requête (contrôle, bogue avant l'envoi) tire sa référence au classement.
- Requête de l'annexe 19 de l'exploitation, à ajouter : `edge_logs` filtrés sur
  `h.x_client_info like '%ref=K7Q4MX%'`.
- Section 12 de l'exploitation, ligne à ajouter : « Un ministère dit qu'un envoi a échoué
  (capture avec une référence) » : d'abord Modération, Incidents (référence, issue), puis le
  Journal (l'action à cette heure), puis la passerelle si moins de 24 h ; agir : si c'est
  enregistré, dire de ne pas refaire ; si un doublon existe (envoi par l'ancien site), le passer
  « Annulé ».

---

## 8. États de l'écran et textes

### 8.1 « Ajouter un événement » (même modèle pour « Nouveau point » et « Signaler une difficulté »)

| État                                            | Bouton                               | Sous le bouton                                                                                                                      | Saisie | Relecture | Numéro                |
| ----------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------ | --------- | --------------------- |
| Repos                                           | « Ajouter au calendrier »            | rien                                                                                                                                |        |           | aucun                 |
| Envoi (et nouvel essai automatique, Q1)         | « Enregistrement en cours », inactif | rien                                                                                                                                | gardée |           | tiré au premier envoi |
| Réussite, y compris réponse perdue après un 200 | actif                                | « Événement ajouté au calendrier. » (6 s)                                                                                           | vidée  | oui       | oublié                |
| Refus sous un champ (date, heure)               | actif                                | rien ; la phrase sous le champ                                                                                                      | gardée | non       | gardé                 |
| Refus sous le bouton (mentions, nom, droit)     | actif                                | sa phrase                                                                                                                           | gardée | non       | gardé                 |
| Déjà enregistré autrement (S3)                  | actif                                | « Votre premier envoi est déjà enregistré. Vérifiez la liste avant de réessayer. »                                                  | gardée | oui       | oublié                |
| Issue inconnue                                  | actif                                | « La connexion a échoué. Vérifiez la liste avant de réessayer. » puis « Référence pour EJP Tech : K7Q4MX »                          | gardée | oui       | gardé                 |
| Rien n'est parti (hors ligne au départ, Q9)     | actif                                | « La connexion a échoué. Votre saisie est encore dans le formulaire : réessayez. » puis la Réf.                                     | gardée | non       | gardé                 |
| Repli (refus inattendu, bogue)                  | actif                                | « L'enregistrement n'a pas abouti, votre saisie est gardée. Réessayez, et si le problème revient, prévenez EJP Tech. » puis la Réf. | gardée | non       | gardé                 |
| Connexion expirée                               |                                      | « Votre connexion a expiré. Reconnectez-vous. », puis l'écran de connexion avec retour                                              | perdue | session   | perdu                 |
| Compte désactivé                                |                                      | écran « Compte désactivé »                                                                                                          | perdue | session   | perdu                 |

### 8.2 Formulaires de reprise (chiffres, présence, carte et chiffres des FIJ, réunion, mise à jour d'un événement, statut, traitement, clôture)

Inchangés, sauf : la Réf. sous la phrase de connexion ; le repli (jamais la connexion) pour un
bogue ; la réussite quand un 200 est arrivé sans corps lisible ; la relecture après une issue
inconnue.

### 8.3 Textes nouveaux (à montrer à la personne)

Sous un message d'échec technique :

- « Référence pour EJP Tech : K7Q4MX » (écrans d'EJP Tech : « Référence : K7Q4MX »). C'est une
  exception voulue au guide (10.1, « jamais de code ») : la référence n'est pas un code d'erreur,
  elle sert à retrouver l'incident ; une ligne à part, plus petite, après la phrase.

Même numéro, contenu changé (P0001 nouveau dans la table de `messagesBase.ts`) :

- « Votre premier envoi est déjà enregistré. Vérifiez la liste avant de réessayer. »

Modération, sous « Signalements » :

- Titre de la liste repliée : « Incidents d'envoi des 90 derniers jours (3) ».
- Phrase de présentation : « Les envois qui ont échoué sur les appareils, sans rien de ce qui a été
  saisi. »
- Ligne : « Lun. 26 oct., 12 h 37 : Coordination, Ajouter un événement. Pas de réponse, issue
  inconnue. » puis, en `--encre-2` : « Safari 26, iOS. Version 3f2a1c9. Référence K7Q4MX. »
- Genres : « Pas de réponse », « Réponse perdue », « Réponse illisible (502) », « Délai de 10 s
  dépassé », « Refus inattendu (23505) », « Erreur de l'application », « Connexion expirée ».
- Issues : « enregistré », « issue inconnue », « rien d'enregistré » ; « rattrapé par un nouvel
  essai » quand `rattrape`.
- Vide : « Aucun incident ces 90 derniers jours. » ; plus de 50 : « Afficher 50 de plus » ;
  lecture impossible : la formule commune « La connexion a échoué. Réessayez. » et « Réessayer ».

Confidentialité : section 6.7.

Aucun tiret cadratin ni demi-cadratin ; voix active ; les boutons ne changent pas.

---

## 9. Effets sur les règles existantes

| Règle                            | Effet                                                                                                                                                                                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ajout seulement (CLAUDE.md)      | Aucune table de la liste ne change ; aucune mise à jour. Les deux tables nouvelles sont privées, inaltérables, purgées seulement (7 et 90 jours).                                                                                                          |
| `saisi_le`, `saisi_par` imposés  | Inchangés ; `envoi.compte` imposé par `auth.uid()` ; `incident.profil` et `incident.ministere_id` imposés par la base.                                                                                                                                     |
| Journal                          | Une ligne par création réelle ; aucune pour un second envoi, un incident, une purge. Aucun texte libre ni email.                                                                                                                                           |
| Dates de Paris                   | `private.aujourdhui()` inchangée ; le numéro est lu avant le contrôle de la date (S1 après minuit). Les heures des incidents s'affichent à l'heure de Paris.                                                                                               |
| Double authentification          | `exige_aal2()` au début des six fonctions nouvelles ; politique restrictive aal2 sur les deux tables.                                                                                                                                                      |
| Totaux et complétude             | Moins de doublons : comptages des événements de l'église plus justes.                                                                                                                                                                                      |
| Données personnelles             | Aucun texte libre en incident ; l'empreinte d'un texte vit 7 jours au plus.                                                                                                                                                                                |
| Matrice et pgTAP                 | Deux lignes nouvelles (5.6, 6.8) ; `structure.test.sql` : 2 tables privées, 6 fonctions nouvelles (`ajouter_evenement` 6, `creer_point` 7, `signaler_difficulte` 3, `noter_incidents` 1, `incidents_recents` 1, et leurs parties privées, plus les aides). |
| Suppression d'un ministère (T75) | Aucune clé étrangère nouvelle vers `ministere` ; celle d'`envoi` vers `compte` ne vise que des comptes déjà « activés un jour ». À vérifier par un test (`comptes-suppression.test.sql`).                                                                  |
| Changer d'espace (T73)           | La file d'incidents est par espace ; `ecrituresEnVol` compte aussi `noter_incidents` (attente de quelques secondes au plus).                                                                                                                               |
| Ancien site (règle 7)            | Ses appels restent valides et inchangés (S9).                                                                                                                                                                                                              |
| Navigation et profils            | Aucune adresse, aucun onglet nouveau.                                                                                                                                                                                                                      |
| Guide de rédaction               | 10.10 (formule « Action peut-être faite » : création seulement, plus la Réf.) et 10.11, règle 3 (le classement de la section 4) à réécrire.                                                                                                                |

---

## 10. Ordre de mise en ligne

Règle 7 : la base d'abord, compatible avec le site en ligne (Cloudflare Pages) **et** avec le
bundle Netlify.

1. **Lot A, front seul.** CI verte, accord, envoi sur `main`, « Mise en ligne ». Aucune migration.
   Effet immédiat : S1 dit « Vérifiez la liste », la référence et la version partent dans
   `X-Client-Info`, un bogue prend le repli.
2. **Lot B.** Migration `2026102xxxxxxx_envoi_idempotent.sql` en production d'abord (`preparer`,
   essai à blanc qui ne contient qu'elle, `migrer`) : les deux sites en ligne appellent les
   anciennes signatures, qui délèguent sans numéro. Puis le front qui appelle les nouvelles
   signatures, par `main`. Si le front partait avant la migration, ses appels à six arguments
   échoueraient (PGRST202) : l'ordre est obligatoire. Retour arrière : le front seul (7.5) ; la
   migration, additive, reste.
3. **Lot C.** Accord de la coordination sur la page Confidentialité ; migration
   `2026102xxxxxxx_incidents_envoi.sql` en production ; puis le front (file, Modération, page
   Confidentialité, registre) par `main`. Un front parti trop tôt ne casse rien d'autre que le bloc
   de Modération (la file garde ses incidents jusqu'à la migration).
4. **Lot D, plus tard.** Après la redirection de Netlify (geste 11) et une semaine du lot B en
   ligne : retirer `ajouter_evenement` à 3, 4 et 5 arguments, `creer_point` à 6, `signaler_difficulte`
   à 2 (nouvelle migration, « on retire plus tard »).

Après chaque mise en production : script de contrôle (7.6), conseillers Supabase, registre
(section 17). Puis, règle 5 de la démarche : vérification sur le cas réel (Coordination ajoute un
événement ; EJP Tech regarde Modération et le Journal).

---

## 11. Ce qui est retiré

- Les genres `reseau` et `delai` de `ErreurLue`, et le test `code === ''` de `lireErreurBase`.
- Les neuf `switch` locaux (liste de la section 2) : chaque fichier ne garde que le placement ; la
  variante `{ ou: 'connexion' }` de chaque type de refus.
- `creerPuisRelire` (remplacé par `relireApres`) et l'usage de `estDelaiDepasse` dans les envois
  (gardé pour les lectures).
- Le `catch` qui transforme tout en `ErreurCompte('connexion')` dans `appelerFonction`.
- Les copies de textes : `MESSAGE_ACCES_EVENEMENT`, `acces` des textes de validation,
  mes-indicateurs, moderation et signalement (→ `MESSAGES_COMMUNS.acces`) ; les sept copies de
  « Votre saisie est encore dans le formulaire » (→ `erreurDeConnexion('saisie')`) ;
  `MESSAGES_ERREURS_COMPTES.connexion` (→ `MESSAGES_COMMUNS.peutEtreFait`) ;
  `MESSAGE_ACCES_REFUSE` (alias).
- L'attente du parcours `e2e/evenements.spec.ts` « connexion perdue : erreur de formulaire » (texte
  de l'ancienne phrase sur un ajout) : elle devient l'issue inconnue.
- Plus tard (lot D) : les anciennes signatures.

Hors périmètre, à décider à part (diagnostic 5.6) : la phrase de « Ce ministère ne peut pas être
mentionné. » (« Un ministère coché a été désactivé » est faux pour un ministère supprimé ou pour
soi-même ; proposition : « Un ministère coché n'est plus disponible. Rechargez la page, puis
réessayez. »).

---

## 12. Options écartées

| Option                                                              | Pourquoi                                                                                                                      |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `p_cle uuid default null` sur la signature existante                | ambiguïté PostgREST (PGRST203) pour l'ancien site ; casse la règle 7                                                          |
| Une colonne `cle` sur `evenement`, `point_attention`, `signalement` | trois tables en ajout seulement, leurs vues et leurs tests touchés ; une table privée unique sert aussi aux créations futures |
| Numéro calculé depuis le contenu (pas de tirage)                    | empêcherait deux événements volontairement identiques (deux « Répétition » le même jour)                                      |
| Reconnaître un doublon après coup (même nom, même date)             | faux positifs ; le numéro rend la chose exacte                                                                                |
| Rendre l'existant même si le contenu diffère                        | la correction de la personne serait perdue en silence                                                                         |
| Numéro par ministère, ou global                                     | sonde possible entre comptes ; par compte suffit                                                                              |
| Numéro tiré à l'ouverture du formulaire                             | équivalent pour les refus, moins juste après une réussite (5.2)                                                               |
| Nouvel essai automatique sans numéro                                | doublons définitifs                                                                                                           |
| Nouvel essai automatique après un délai                             | 10 s d'attente de plus ; le numéro rend l'essai manuel sans risque                                                            |
| Incidents écrits avant aal2 (Edge Function ou fonction anonyme)     | contraire au BRIEF, section 8 ; ouvert à n'importe qui                                                                        |
| Garder le compte, l'IP, l'user agent complet, le message d'erreur   | pas nécessaires ; données personnelles ou texte libre possibles                                                               |
| Outil externe (Sentry ou autre)                                     | dépendance nouvelle, prestataire et transfert nouveaux, CSP à ouvrir, bandeau de consentement possible                        |
| En-tête maison (`x-pilotage-version`)                               | refusé par le CORS de la passerelle Supabase ; `X-Client-Info` est déjà autorisé                                              |
| Incidents dans le Journal technique                                 | même écran que le Journal du berger (T29) ; le berger les lirait                                                              |
| Nouvel onglet « Incidents »                                         | une adresse, une garde et un écran pour une liste courte                                                                      |
| Table d'incidents dans `public` avec RLS de lecture                 | la purge à la lecture demande de toute façon une fonction ; `private` suit le modèle de T72                                   |
| Purge par `pg_cron`                                                 | extension et tâche nouvelles, pour une table minuscule                                                                        |
| Allonger le délai de 10 s                                           | ne change pas le classement, rallonge l'attente                                                                               |
| `navigator.onLine` comme seule preuve d'une coupure                 | « vrai » n'est pas fiable ; seul « faux au départ » sert (Q9)                                                                 |

---

## 13. Risques

| Risque                                                                           | Parade                                                                                             |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Le corps lu dans `fetchAvecDelai` change une réponse (en-têtes, `content-range`) | `new Response(corps, { status, statusText, headers })` ; tests unitaires et parcours des écritures |
| supabase-js change le nom ou la forme de `X-Client-Info`                         | on complète l'en-tête existant ; un test vérifie l'en-tête envoyé                                  |
| Journaux de la passerelle gardés environ un jour (offre gratuite, à vérifier)    | l'incident garde 90 jours ; la référence suffit sans eux                                           |
| Le numéro se perd au rechargement de la page                                     | relecture et « Vérifiez la liste » restent                                                         |
| Empreinte dérivée d'un texte libre                                               | purge à 7 jours ; jamais lue par personne                                                          |
| Une boucle de bogue remplit la table                                             | 20 par appel, 100 par 24 h et par ministère ou profil, file de 20                                  |
| Horloge du téléphone fausse                                                      | `recu_le` fait foi ; `survenu_le` borné                                                            |
| Listes fermées (écrans, opérations) en retard d'une adresse                      | valeur `autre`, et un test Vitest compare `pagesDesAdresses` à la liste SQL                        |
| `structure.test.sql`, `messagesBase.test.ts` exhaustifs                          | mis à jour dans le même lot                                                                        |
| Base de travail sans T75                                                         | partir de `origin/main`                                                                            |
| Nouvel essai automatique (si accepté) double l'attente sur un réseau très lent   | seulement sur un échec rapide, jamais après un délai                                               |
| L'ancien site continue de faire des doublons                                     | aucun correctif ne l'atteint : geste 11 (redirection) et message aux ministères                    |
| `crypto.randomUUID` absent (iOS avant 15.4)                                      | repli `crypto.getRandomValues`                                                                     |

---

## 14. Tests à écrire en premier (échouent avant, passent après), dans l'ordre

**Lot A**

1. Vitest `src/data/echecEnvoi.test.ts` : `{ code: '', message: 'TypeError: Load failed' }` sur
   `ajouter_evenement` donne « Vérifiez la liste avant de réessayer » et une référence
   (aujourd'hui : « Votre saisie est encore dans le formulaire ») ; `TypeError: undefined is not an
object (evaluating 'x.y')` donne le repli (aujourd'hui : connexion) ; suivi
   `{ statut: 200, phase: 'corps_perdu' }` donne `enregistre` ; `{ statut: 502 }` corps HTML donne
   `reponse_illisible` et `inconnue` ; P0001 inconnu, 23505, 57014 donnent `refus_inconnu` ;
   « permission denied for function ajouter_evenement » donne `session` (Q8) ; hors ligne au
   départ donne « rien d'enregistré ».
2. Vitest tableau croisé : pour chaque opération du catalogue et chaque genre, aucune phrase n'est
   « La connexion a échoué » pour `bogue` ou `refus_inconnu` ; toute création à l'issue inconnue
   dit « Vérifiez la liste » ; toute reprise dit sa phrase de connexion.
3. Vitest `src/lib/transport.test.ts` : un `fetch` simulé qui rejette `AbortError` après
   l'expiration de notre signal rejette `TimeoutError` et note `phase: 'delai'` ; une lecture du
   corps qui échoue après un 200 note `corps_perdu` et le statut ; `X-Client-Info` contient
   `pilotage=` sur une lecture et `ref=` sur une écriture, et garde `supabase-js/`.
4. Vitest `src/data/comptes.test.ts` : `FunctionsRelayError` donne `erreur_interne`, pas
   `connexion` ; `FunctionsFetchError` sur `creer-compte` donne l'issue inconnue.
5. Vitest composants : `FormulaireAjoutEvenement.test.tsx`, `FormulaireNouveauPoint.test.tsx`,
   `FormulaireSignalement` : un échec `sans_reponse` affiche « Vérifiez la liste avant de
   réessayer », la ligne « Référence pour EJP Tech : ... », garde la saisie et relit.
6. Vitest garde-fou : toute écriture de `src/data/` passe par `envoyer`.
7. Playwright aperçu `e2e/evenements.spec.ts` (« connexion perdue » mis à jour), plus
   `route.fulfill({ status: 502, body: '<html>' })` (issue inconnue sur un ajout, phrase de
   connexion sur une saisie de chiffres), `route.fulfill({ status: 400, json: { code: 'P0001',
message: 'Texte inconnu.' } })` (repli et référence), et une route sans réponse (après 10 s,
   « Vérifiez la liste »).
8. Playwright : l'en-tête `x-client-info` du POST contient `pilotage=` et `ref=` (lecture de la
   requête par `page.route`).

**Lot B**

9. pgTAP `supabase/tests/envoi-idempotent.test.sql`, **le cas réel en premier** : Coordination en
   aal2, huit mentions dont FIJ, heure nulle, date du jour, numéro K ; deux appels à six arguments ;
   même identifiant ; un `evenement`, huit `evenement_mention`, un `evenement_etat`, **une** ligne
   `evenement_ajoute` portant les huit identifiants.
10. pgTAP : même numéro, nom changé : P0001 « Cet envoi est déjà enregistré avec d'autres
    valeurs. », rien d'écrit ; mentions dans un autre ordre ou nom avec espaces : même envoi ;
    même numéro pour `creer_point` : refus ; même numéro sur un autre compte : deux événements
    distincts ; mention désactivée entre les deux appels : le second rend le même identifiant ;
    sans numéro (cinq arguments) : deux appels font deux événements (comportement d'avant) ;
    3 et 4 arguments toujours valides ; aal1 et anonyme : 42501.
11. pgTAP, mêmes cas essentiels pour `creer_point` (une ligne `point_cree`) et
    `signaler_difficulte` (une ligne `difficulte_signalee`).
12. pgTAP : `private.envoi` sans aucun droit (anon, authenticated, service_role), update et
    truncate refusés, delete refusé hors purge ; purge des lignes de plus de 7 jours (en
    propriétaire) ; `structure.test.sql` (fonctions à 6, 7 et 3 arguments, aides privées sans
    droit d'exécution) ; `comptes-suppression.test.sql` : un ministère avec une ligne d'envoi n'est
    pas supprimable (déjà vrai par ses événements).
13. Vitest : le formulaire renvoie le même numéro au second essai, en tire un autre après une
    réussite, oublie le numéro après le refus « déjà enregistré ».
14. Playwright `e2e/base/evenements.ecriture.spec.ts`, **le cas réel** : compte Coordination,
    huit mentions dont FIJ ; `page.route('**/rest/v1/rpc/ajouter_evenement', async (r) => { await
r.fetch(); await r.abort('failed') })` une fois ; l'écran dit « Vérifiez la liste » ; second
    toucher : « Événement ajouté au calendrier. » ; le calendrier montre **un seul** événement de
    ce nom ; le Journal une seule ligne. Avec Q1 : la réussite dès le premier toucher.

**Lot C**

15. pgTAP `supabase/tests/incidents.test.sql` : chaque profil en aal2 écrit (ministère, berger,
    conseil, administration, EJP Tech) ; aal1 et anonyme refusés ; profil et ministère imposés
    (valeurs envoyées ignorées) ; clés inconnues ignorées ; valeurs hors liste en `autre` ; 25
    envoyés, 20 gardés ; 101e en 24 h ignoré ; même référence ignorée ; `survenu_le` hors fenêtre
    ignoré ; `incidents_recents` : EJP Tech seul, aal2, 50 lignes, purge des plus de 90 jours ;
    aucun droit direct sur `private.incident` ; `structure.test.sql` mis à jour.
16. Vitest `src/lib/fileIncidents.test.ts` : file par espace, plafond de 20, plus de 7 jours tombés,
    envoi au retour du réseau, références retirées après un 2xx, gardées après un échec, aucun
    incident sur l'envoi d'incidents, schéma strict (aucun champ hors liste, aucun texte du
    formulaire, vérifié en remplissant le formulaire d'un texte témoin).
17. Vitest : la liste SQL des écrans couvre `pagesDesAdresses`.
18. Vitest `PageConfidentialite.test.tsx` : les deux points nouveaux.
19. Playwright `e2e/base/moderation.ecriture.spec.ts` (ou `ejp-tech.spec.ts`) : un échec forcé chez
    Coordination, puis EJP Tech voit la ligne dans Modération avec la même référence ; un compte de
    ministère n'a ni la liste ni l'accès à `incidents_recents`. Captures en 1440, 834 et 390 px,
    revue `ui-reviewer` contre la maquette 15, `rls-auditor` sur les deux migrations.

---

## 15. Découpage en lots et taille estimée

| Lot           | Migrations             | Fichiers (environ)          | Contenu                                                                                                                                                                                                                                                                                                                                                          |
| ------------- | ---------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A             | 0                      | 40 touchés, dont 6 nouveaux | `transport.ts`, `envoi.ts`, `echecEnvoi.ts` et leurs tests ; 15 fichiers de `src/data/` passés par `envoyer` ; 10 fichiers de refus simplifiés ; `ErreurFormulaire`, `ResultatEnvoi`, `useApresEcriture` ; textes dédoublonnés ; `vite.config.ts`, `vite-env.d.ts` ; 4 parcours Playwright ; guide de rédaction, LISEZMOI, décision T76, exploitation (12 et 19) |
| B             | 1 (`envoi_idempotent`) | 14, dont 2 nouveaux         | migration, `envoi-idempotent.test.sql`, `structure.test.sql`, `comptes-suppression.test.sql`, table de `messagesBase.ts`, 3 types de `src/lib/base/`, 3 fonctions de données, 3 formulaires, parcours avec la base, BRIEF (matrice)                                                                                                                              |
| C             | 1 (`incidents_envoi`)  | 25, dont 12 nouveaux        | migration, `incidents.test.sql`, `structure.test.sql`, `src/data/incidents.ts`, `src/lib/fileIncidents.ts`, branchement sur la session et `online`, bloc de Modération (composant, construction, textes, aperçu, tests), page Confidentialité et son test, registre, exploitation (10, 12, 15, 19), BRIEF (2, 6, 7), LISEZMOI (15), T76                          |
| D (plus tard) | 1                      | 3                           | retrait des anciennes signatures                                                                                                                                                                                                                                                                                                                                 |

Total : 2 migrations maintenant (plus une au lot D), environ 80 fichiers touchés, dont une
vingtaine de nouveaux. Le lot A, sans base, corrige à lui seul le message trompeur du 26 octobre.

---

## 16. Questions ouvertes, avec la recommandation « Proposé »

- **Q1. Nouvel essai automatique** pour les trois créations à numéro, une fois, seulement sur un
  échec rapide. **Proposé : oui.**
- **Q2. Même numéro, contenu changé** : refus et phrase « Votre premier envoi est déjà enregistré.
  Vérifiez la liste avant de réessayer. ». **Proposé : oui.**
- **Q3. Numéro tiré au premier envoi**, gardé jusqu'à la réussite. **Proposé : oui.**
- **Q4. L'incident garde le ministère et le profil, pas le compte.** **Proposé : oui.**
- **Q5. Durées** : incidents 90 jours ; numéros 7 jours. **Proposé : oui.**
- **Q6. Lecture dans Modération**, liste repliée sous « Signalements », sans onglet nouveau.
  **Proposé : oui.**
- **Q7. Page Confidentialité mise à jour sans nouvelle acceptation** (`VERSION_CONDITIONS`
  inchangée), avec l'accord de la coordination. **Proposé : oui.**
- **Q8. « permission denied for function »** (requête partie sans jeton) lu comme « connexion
  expirée » au lieu de « élément introuvable ». **Proposé : oui.**
- **Q9. Hors ligne au départ** vaut « rien n'est parti » : « Votre saisie est encore dans le
  formulaire : réessayez. » même pour une création. **Proposé : oui.**
- **Q10. Navigateur** : famille, version majeure et système seulement. **Proposé : oui.**
- **Q11. Purge** : à chaque écriture et à chaque lecture, sans tâche planifiée ; la marge assumée
  quand personne n'ouvre Modération. **Proposé : oui.**
- **Q12. Texte de la référence** : « Référence pour EJP Tech : K7Q4MX », sur une ligne à part.
  **Proposé : oui.**

---

## 17. Documents à mettre à jour (avec les lots)

- `docs/decisions.md` : T76 (ce document résumé, les Proposés et leurs réponses).
- `BRIEF.md` : section 2 (exception à « les erreurs restent dans Supabase »), section 6 (deux
  tables privées, `X-Client-Info`), section 7 (matrice, fonctions de l'API, tests obligatoires),
  section 9 (Modération : liste « Incidents d'envoi »).
- `docs/conception/guide-de-redaction.md` : 10.10 et 10.11.
- `docs/reference/maquettes/LISEZMOI.md` : écran 15 (bloc non dessiné), ligne « Référence » des
  erreurs de formulaire.
- `docs/exploitation.md` : 10 (lecture hebdomadaire des incidents), 12 (ligne nouvelle), 15 (page
  et registre), 19 (requête par référence), 17 (registre des mises en production).
- `docs/conformite/registre-traitements.md` : Fiche 4.
- `src/pages/PageConfidentialite.tsx`.
