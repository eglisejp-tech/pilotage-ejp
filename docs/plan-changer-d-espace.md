# Plan : « Changer d'espace » pour EJP Tech

Conception du 7 octobre 2026, à construire après l'ouverture. Suite de la décision T48 (EJP Tech a
deux comptes : `admin_plateforme` et le compte du ministère Tech). Lecture seule du code d'`etape-4`
au 7 octobre : rien n'a été modifié.

## 1. Recommandation

Option (b) dans sa forme la plus simple : **deux emplacements de session dans le navigateur, un seul
client Supabase par onglet, et un rechargement complet de la page à chaque changement**. Réservée à
la paire EJP Tech (compte `admin_plateforme` et un compte `ministere`). « Se déconnecter » ferme les
deux espaces. À construire après l'ouverture, une fois la CSP de l'étape 8 en place. D'ici là, un
**second profil du navigateur** plutôt qu'une fenêtre privée : la session y reste, rien n'est à coder.

Pourquoi :

- **Le besoin.** Changer de compte sans se déconnecter. L'option (a) garde le mot de passe et le code
  à chaque changement : elle soulage peu.
- **Aucun changement de base, aucune Edge Function, aucun secret.** Chaque requête part avec le jeton
  du seul compte actif. La RLS, la politique `aal2` et `saisi_par` font le reste. Le journal attribue
  chaque action à son auteur par construction.
- **Le rechargement est volontaire.** Il vide le cache React Query, l'abonnement unique (`abonne`
  dans `useEtatSession.ts`), les variables de module (`motif`) et les requêtes en cours. Sans lui,
  une réponse du compte A pourrait arriver dans le cache après le changement et s'afficher dans
  l'espace B.
- **Les 82 appels `supabase()` (17 fichiers) ne changent pas.** Seul le choix de `storageKey`
  change, à la création du client.
- **Le risque ajouté reste faible.** Appareil personnel d'EJP Tech ; le compte du ministère Tech
  n'écrit que pour son ministère ; une écriture partie avec le mauvais jeton est refusée par la
  base, car les écritures des deux comptes sont disjointes dans la matrice (T29).

## 2. Constats sur le code actuel

- **Le client.** `src/lib/supabase.ts` crée un seul client à la demande : PKCE, `persistSession`,
  `autoRefreshToken`, `detectSessionInUrl`, aucun `storageKey`. supabase-js 2.117.2 prend donc
  `sb-${hostname.split('.')[0]}-auth-token` (en local `sb-127-auth-token`).
- **auth-js 2.117.2** : option `storageKey` ; vérificateur PKCE sous `${storageKey}-code-verifier` ;
  un BroadcastChannel par `storageKey` ; l'avertissement « Multiple GoTrueClient instances » ne vise
  que deux clients sur la même clé ; à l'ouverture, `_recoverAndRefresh` ne renouvelle le jeton que
  si `autoRefreshToken` vaut vrai ; `signOut({ scope: 'local' })` appelle `/logout` avec le jeton de
  l'utilisateur, ce qui révoque la session côté serveur sans clé secrète.
- **`supabase/config.toml`** : `jwt_expiry = 3600`, rotation des jetons de renouvellement active,
  `refresh_token_reuse_interval = 10`.
- **`seDeconnecter`** (`src/features/session/actions.ts`) : `signOut` en portée locale ; sans réseau,
  `effacerSessionLocale` retire toute clé qui commence par `sb-` et contient `-auth-token`. La clé du
  second emplacement doit suivre ce motif.
- **Toute la logique de session passe par `chargerEtatSession`** (session, niveau, ligne `compte`
  lisible dès aal1, facteur), puis `deduireEtat` et `destination` routent les quatre zones de la
  garde.
- **Révocation côté serveur** : `private.revoquer_sessions`, appelée par « Refaire l'activation » et
  par la désactivation. Une session gardée sur l'appareil est coupée par ces deux actions.
- **Libellés** : `creer-compte` impose « Ministère Tech » et « EJP Tech, compte N » ; les deux
  espaces se distinguent dans l'en-tête.
- **Aucune CSP aujourd'hui** sur `etape-4` avant D1 ; elle arrive avec `netlify.toml` (étape 8).
- **Fenêtres** : `PanneauSaisie` donne déjà la fenêtre du projet (page entière sous 600 px,
  panneau de 460 px au-delà, focus gardé, Échap).

## 3. Options comparées et sécurité

### (a) Se déconnecter, puis se reconnecter avec l'autre adresse préremplie

- Gardé : seulement l'adresse et le libellé de l'autre compte. Aucun jeton.
- Appareil volé ou partagé : une seule session exposée, comme aujourd'hui.
- Chaque passage refait le premier facteur et le code.
- Risques : mot de passe du ministère tapé souvent ; lassitude, donc retour aux deux fenêtres ;
  « Continuer avec Google » ouvrirait le compte de la plateforme (à masquer pour l'adresse du
  ministère).
- Effort : 6 à 9 h. Sécurité la meilleure, gain d'usage faible.

### (b) Deux sessions gardées, un emplacement actif (recommandée)

**Gardé dans localStorage** : deux entrées auth-js (jeton d'accès d'une heure, jeton de
renouvellement, objet `user`) et un carnet `pilotage-ejp.espaces` (pour chaque emplacement :
`userId`, type, libellé, email ; aucun jeton).

**Emplacements et onglets.** L'emplacement « a » garde la clé actuelle (les sessions existantes
survivent à la mise en ligne). L'emplacement « b » prend `sb-<ref>-auth-token-espace-b`. Le pointeur
actif vit dans `sessionStorage`, par onglet, avec repli sur le dernier choix gardé : un onglet ne
bascule jamais en plein formulaire parce qu'un autre onglet a changé d'espace.

**aal2 par session.** Seul le client actif envoie des requêtes ; le jeton de l'emplacement inactif
n'est jamais envoyé. Un emplacement resté en aal1 (abandonné sur l'écran 18) ramène à l'écran 18 au
prochain passage ; « Revenir à l'espace ... » ferme cette session aal1.

**Rotation.** L'emplacement inactif n'est jamais renouvelé en arrière-plan (aucun client pour lui).
À l'activation, auth-js renouvelle une fois ; l'intervalle de 10 s couvre deux onglets ouverts
ensemble. Une copie volée rejouée après rotation déclenche la détection de réutilisation : la
session est révoquée (échec sûr, signal de vol).

**Expiration.** Chaque session suit le BRIEF : 14 jours d'inactivité, 30 jours au plus. L'espace
inactif expire s'il n'est pas utilisé pendant 14 jours ; on l'apprend en y passant.

**Fermeture.** « Se déconnecter » ferme les deux espaces, chacun en portée locale. « Fermer l'espace
X » révoque seulement l'autre emplacement, par un client temporaire sur sa clé
(`autoRefreshToken: false`, `detectSessionInUrl: false`). Sans réseau, `effacerSessionLocale` retire
les deux clés et le carnet.

**Appareil volé ou déverrouillé.** Deux comptes exposés au lieu d'un. Parades : verrouillage de
l'appareil ; « Se déconnecter » ferme tout ; à distance, « Refaire l'activation » ou la
désactivation (écran 13) révoquent toutes les sessions du compte ; texte du panneau : « N'ajoutez pas
de second espace sur un appareil partagé. ».

**Appareil partagé d'un ministère** : il ne voit jamais le bouton (seul `admin_plateforme` ajoute un
espace).

**XSS** : deux jetons lisibles par un script injecté au lieu d'un. Parades : React échappe tout,
`dangerouslySetInnerHTML` interdit, CSP stricte de l'étape 8 en prérequis.

**Ni droits croisés ni usurpation** : deux sessions GoTrue distinctes, aucun code serveur, aucune
clé secrète.

**Règles du carnet** (contrôle d'interface ; la vraie protection reste la RLS) :

- même compte dans les deux emplacements : l'emplacement actif gagne, l'autre est fermé et oublié ;
- paire autorisée = {`admin_plateforme`, `ministere`} ; sinon la session active est fermée dès
  l'état « code », avant tout code et toute donnée : « Ce compte ne peut pas devenir votre second
  espace. Connectez-vous avec le compte du ministère. ».

**Limite connue** : un lien d'invitation ou de mot de passe oublié ouvert dans l'onglet actif
remplace la session de cet emplacement (déjà le cas aujourd'hui). Consigne : ouvrir ces liens dans
une fenêtre privée.

Effort : 20 à 26 h.

### (c) Autres pistes

| Piste                                                         | Avis                                                                                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| (b) avec deux clients vivants, sans rechargement              | Écartée : réponses en vol mêlées dans le cache, abonnement unique à refaire, espace inactif renouvelé en continu (contourne les 14 jours). |
| Une seule clé, jeton de l'autre compte rangé à part           | Écartée : un changement fait basculer tous les onglets ; l'application manipulerait des jetons de renouvellement bruts.                    |
| Deux origines (un sous-domaine par espace)                    | Écartée : domaine, Netlify et redirections Supabase en plus ; « Se déconnecter » ne ferme pas l'autre ; même exposition que (b).           |
| Passkeys (auth-js 2.117) pour accélérer (a)                   | Pas maintenant : change la section 8 (TOTP seul) ; à vérifier si une connexion par passkey donne aal2.                                     |
| Bascule côté serveur (Edge Function qui ouvre l'autre compte) | Interdite : usurpation et clé secrète.                                                                                                     |
| Un compte à deux rôles                                        | Écartée par T48.                                                                                                                           |
| Second profil du navigateur                                   | Recommandée en attendant : zéro code, sessions isolées et durables ; à écrire dans `docs/exploitation.md`.                                 |

## 4. Parcours et textes

Textes à rassembler dans `src/features/espaces/textes.ts`.

**Le bouton** « Changer d'espace », même style que « Se déconnecter » (lien souligné, cible de
44 px, `aria-haspopup="dialog"`).

- À partir de 1024 px, colonne de droite de l'en-tête (de 1024 à 1279 px : le libellé, puis une
  ligne « Changer d'espace » et « Se déconnecter » ; à partir de 1280 px, les trois sur une ligne).
  À vérifier : la largeur à 1024 px avec les 4 onglets d'EJP Tech de l'étape 6.
- Sous 1024 px, dans `MenuTelephone` : le libellé, « Changer d'espace », « Se déconnecter »,
  « Confidentialité », « Conditions d'utilisation ».
- Qui le voit : `admin_plateforme` toujours (la première fois, il mène à l'ajout) ; `ministere`
  seulement si le carnet contient un espace `admin_plateforme` sur cet appareil ; berger, conseil,
  administration jamais.

**Le panneau** (réutilise `PanneauSaisie`, sans route : `profils.ts` ne change pas).

- Cas 1, l'autre espace est ouvert : « Vous êtes dans l'espace EJP Tech, compte 1. » ; « L'espace
  Ministère Tech reste ouvert sur cet appareil : vous y passez sans mot de passe ni code. Un
  formulaire en cours sera perdu. » ; bouton « Passer à Ministère Tech » (« Changement en cours ») ;
  sous un filet, « Se déconnecter ferme les deux espaces. » et « Fermer l'espace Ministère Tech »
  (« Pour y revenir, il faudra son mot de passe et son code. ») ; message « Espace Ministère Tech
  fermé sur cet appareil. ».
- Cas 2, première fois : « Ajoutez l'espace de votre ministère pour passer d'un compte à l'autre
  sans vous déconnecter. Vous vous connectez une seule fois, avec l'adresse du ministère, son mot
  de passe et son code. » ; « N'ajoutez pas de second espace sur un appareil partagé. » ; bouton
  « Ajouter l'espace du ministère ».
- Cas 3, session disparue : « L'espace Ministère Tech est fermé sur cet appareil. » ; bouton
  « Se connecter à Ministère Tech ».

**Le changement** : le pointeur de l'onglet passe à l'autre emplacement ; rechargement complet vers
l'accueil de l'espace cible (`/moderation` pour EJP Tech, `/` pour le ministère) ; message
`role="status"` pendant 6 s : « Vous êtes dans l'espace Ministère Tech. ».

**Première fois, écran 16 en mode « second espace »** : « Connectez-vous au compte du ministère.
L'espace EJP Tech, compte 1 reste ouvert sur cet appareil. » ; Google masqué (alias, T48) ; email
prérempli si le carnet le connaît ; lien « Revenir à l'espace EJP Tech, compte 1 ».

**Écrans 17 et 18** : « Se déconnecter » devient « Revenir à l'espace EJP Tech, compte 1 » (ferme la
session aal1 de l'emplacement) ; sur l'écran 18 : « Votre application affiche deux codes « Pilotage
EJP » : prenez celui de l'adresse du ministère. ». Conseil : activer d'abord le compte du ministère
dans une fenêtre privée, puis l'ajouter comme espace.

**Expiration de l'espace inactif** : écran 16 de cet emplacement, email prérempli, « Votre session a
expiré. Reconnectez-vous. », lien de retour.

**Messages d'erreur** : « Ce compte est déjà ouvert dans l'autre espace. » ; « Ce compte ne peut pas
devenir votre second espace. Connectez-vous avec le compte du ministère. ».

## 5. Fichiers

À créer : `src/lib/espaces.ts` et son test (type `Espace`, `cleDeStockage`, pointeur par onglet,
carnet, règles pures `autreEspace`, `boutonVisible`, `controlerSecondEspace`, `modeConnexion`) ;
`src/features/espaces/` (`actions.ts`, `useEspaces.ts`, `BoutonChangerEspace.tsx`,
`PanneauChangerEspace.tsx`, `LienRevenirEspace.tsx`, `textes.ts`) ; `e2e/base/espaces.spec.ts` et
`e2e/base/espaces.ecriture.spec.ts`.

À modifier : `src/lib/supabase.ts` ; `src/features/session/` (`chargement.ts`, `actions.ts`,
`motif.ts`) ; `src/features/connexion/` (messages, mode second espace des écrans 16 à 18,
`BarreCompte.tsx`) ; `src/features/navigation/` (`EnTete.tsx`, `MenuTelephone.tsx`, aperçu
`?espaces=deux`) ; `src/app/MiseEnPageConnectee.tsx` ; `src/test/fauxSupabase.ts` et le mock de
`src/app/routes.test.tsx` ; documentation (`docs/decisions.md`, BRIEF sections 2, 8 et 9,
`LISEZMOI.md`, `docs/exploitation.md`).

Aucun fichier réservé (`profils.ts`, pages provisoires de C0 ; `requetes.ts`, `main.tsx` de F1).
`EnTete.tsx` et `MenuTelephone.tsx` sont à reprendre après la fusion de C0. **Aucune migration.**

## 6. Tests

- **Vitest** : clés « a » et « b », pointeur et replis, carnet abîmé, `boutonVisible` pour les 5
  types, règles « même compte » et « paire » ; options du client et du client temporaire ;
  `chargement` (paire refusée à l'état « code » sans lecture de données, carnet écrit seulement en
  aal2) ; actions (« Se déconnecter » sur les deux emplacements, repli hors ligne, changement,
  « Revenir ») ; écrans (bouton selon le profil, 3 cas du panneau, écran 16 sans Google, retours des
  écrans 17 et 18).
- **Playwright sans base** : aperçu `?profil=admin_plateforme&espaces=deux` aux 3 formats et à
  1024 px (cible de 44 px, aucun débordement, panneau, axe, autres profils sans bouton).
- **Playwright avec base (CI)** : connexions fraîches à `ejptech1@exemple.test` et
  `junior@exemple.test` ; ajout du second espace ; chaque requête porte le `sub` du compte actif et
  `aal2` ; aller-retour sans nouveau mot de passe ni code ; emplacement aal1 refermé ; session
  révoquée ; paire refusée et même compte ; « Se déconnecter » retire les deux clés et rend les
  jetons de renouvellement inutilisables ; berger, conseil, administration et ministère sans
  bouton ; un signalement écrit dans l'espace du ministère apparaît chez EJP Tech au nom du
  ministère.
- **pgTAP** : aucun test nouveau (la base ne change pas).

## 7. Effort

Option (b) : 20 à 26 h (`lib/espaces` et `supabase.ts` 4 à 5 h ; session 3 à 4 h ; bouton et panneau
3 h ; écrans 16 à 18 2,5 h ; Vitest 3 h ; Playwright 4 à 5 h ; documentation 1,5 h ; vérification et
revue 2 h). Option (a) : 6 à 9 h.

## 8. Questions pour la personne responsable (réponse recommandée)

1. Option (b), deux sessions gardées, ou (a), reconnexion à chaque fois ? Recommandé : (b).
2. « Se déconnecter » ferme-t-il les deux espaces ? Recommandé : oui.
3. Changer en un clic ou par le panneau (deux clics) ? Recommandé : le panneau (évite de perdre une
   saisie, accueille l'ajout et la fermeture).
4. Qui peut ajouter un second espace ? Recommandé : tout compte EJP Tech, et ce second espace est
   forcément un compte de ministère.
5. Où arrive-t-on après le changement ? Recommandé : l'accueil de l'espace (Modération pour EJP
   Tech, Cette semaine pour le ministère).
6. L'alias « +ministere » (T48) est-il confirmé ? Recommandé : oui ; Google est alors masqué pour cet
   espace.
7. L'espace inactif suit-il la règle des 14 jours, sans être gardé ouvert en arrière-plan ?
   Recommandé : oui.
8. En attendant, un second profil du navigateur, écrit dans `docs/exploitation.md` ? Recommandé :
   oui.
9. La CSP de l'étape 8 est-elle un prérequis à la mise en ligne ? Recommandé : oui.
