// Ministères et comptes (écran 13, lot L1) : lectures de l'administration de l'église et d'EJP
// Tech, puis appels des sept Edge Functions de comptes, par EJP Tech seul (T60 et T74 ; BRIEF,
// section 8, « Les Edge Functions »). Une fonction par requête. Les lectures passent par la RLS :
// `v_etat_comptes` ne rend des lignes qu'à l'administration et à EJP Tech, en aal2 ;
// `v_ministeres_supprimables` et `v_comptes_jamais_actives` (T74), qu'à EJP Tech. Les
// écritures ne passent jamais par une table : chaque action appelle
// sa fonction par `functions.invoke`, avec le jeton de la session (la clé secrète reste dans la
// fonction). Chaque demande est validée par les schémas partagés avec les fonctions
// (`supabase/functions/_shared/schemas.ts`) avant tout appel, et chaque code d'erreur de la
// réponse (`{ erreur: '<code>' }`) devient une phrase en français.

import { FunctionsHttpError } from '@supabase/supabase-js'
import type { CodeErreur } from '../../supabase/functions/_shared/http.ts'
import {
  schemaCibleCompte,
  schemaCibleMinistere,
  schemaCorrigerAdresse,
  schemaCreerCompte,
  type DemandeCreerCompte,
} from '../../supabase/functions/_shared/schemas.ts'
import type { LigneVue } from '@/lib/base'
import { supabase } from '@/lib/supabase'

export type LigneEtatCompte = LigneVue<'v_etat_comptes'>

/** Les sept Edge Functions de comptes. */
export type FonctionCompte =
  | 'creer-compte'
  | 'relancer-invitation'
  | 'desactiver-compte'
  | 'reactiver-compte'
  | 'reinitialiser-2fa'
  | 'corriger-adresse'
  | 'supprimer-ministere'

/** Code de refus d'une fonction, ou `connexion` quand la réponse n'est pas arrivée. */
export type CodeErreurCompte = CodeErreur | 'connexion'

/**
 * Chaque code de réponse des fonctions, en français simple (contrat commun : « traduit en
 * français par le front »). Le type impose une phrase pour chaque code de `_shared/http.ts`.
 * `connexion` : la réponse n'est pas arrivée (réseau, délai de 10 s), mais la fonction a pu
 * aboutir (compte créé, invitation partie). L'écran relit la liste ; la phrase demande de la
 * vérifier avant de réessayer. Revu par T66 (m183 à m193) : seul EJP Tech appelle ces fonctions
 * (T60), aucune phrase ne lui dit donc de « prévenir EJP Tech ».
 */
export const MESSAGES_ERREURS_COMPTES: Readonly<Record<CodeErreurCompte, string>> = {
  connexion: 'La connexion a échoué. Vérifiez la liste avant de réessayer.',
  /** Refus d'un panneau ; une action de ligne ou de fenêtre dit `REFUS_ACTION_COMPTE` (m186). */
  requete_invalide: 'Vérifiez les champs, puis réessayez.',
  methode_non_autorisee: "La demande n'a pas pu être envoyée. Réessayez.",
  // Une seule phrase pour une connexion qui a pris fin (T66, m017).
  non_authentifie: 'Votre connexion a expiré. Reconnectez-vous.',
  session_revoquee: 'Votre connexion a expiré. Reconnectez-vous.',
  double_authentification_requise: 'Votre connexion a expiré. Reconnectez-vous.',
  acces_refuse: 'Votre compte ne permet pas de gérer les comptes.',
  type_interdit: 'Ce compte ne peut pas être créé ici. Rechargez la page.',
  // Formule commune « introuvable » (guide 10.10 ; T66), comme la fiche et l'écran Indicateurs.
  ministere_inconnu: 'Ce ministère est introuvable. Rechargez la page.',
  compte_inconnu: 'Ce compte est introuvable. Rechargez la page.',
  propre_compte:
    'Cette action ne se fait pas sur votre propre compte. Demandez-la à un autre compte EJP Tech.',
  adresse_deja_utilisee: 'Cette adresse a déjà un compte. Choisissez une autre adresse.',
  ministere_a_deja_un_compte: 'Ce ministère a déjà un compte actif. Rechargez la page.',
  nom_ministere_deja_pris: 'Un ministère porte déjà ce nom. Choisissez un autre nom.',
  berger_deja_actif: "Le berger a déjà un compte actif. Désactivez-le d'abord.",
  compte_desactive: "Ce compte est désactivé. Réactivez-le d'abord.",
  compte_actif: 'Ce compte est déjà actif. Rechargez la page.',
  invitation_deja_acceptee:
    'Cette invitation est déjà acceptée. Dites à la personne de choisir « Mot de passe oublié ».',
  invitation_trop_recente:
    'Une invitation vient de partir vers cette adresse. Attendez une minute, puis réessayez.',
  /** Proposé (m191) : la liste se relit seule ; recharger ferait perdre la saisie du panneau. */
  conflit: "Une autre modification vient d'avoir lieu. Vérifiez la liste, puis réessayez.",
  invitation_non_envoyee: "L'invitation n'est pas partie. Réessayez dans quelques minutes.",
  /** Proposé (m194) : « Refaire l'activation » interrompue, le compte reste bloqué. */
  activation_incomplete:
    "« Refaire l'activation » n'a pas abouti. Relancez-la avant de prévenir la personne.",
  // T74 (Proposé) : l'écran ne propose ces actions que quand elles sont possibles ; ces refus
  // disent que la liste a changé entre-temps.
  compte_deja_active: 'Ce compte est déjà activé. Rechargez la page.',
  ministere_non_vide: 'Ce ministère a maintenant des données : il ne peut plus être supprimé.',
  ministere_de_reference:
    'Ce ministère fait partie de la liste de référence : il ne se supprime pas.',
  suppression_incomplete:
    "Le ministère est supprimé, mais son adresse reste dans Supabase. Effacez-la en suivant le guide d'exploitation.",
  erreur_interne: "L'action n'a pas abouti. Réessayez dans quelques minutes.",
}

/**
 * Réponse absente pendant une fenêtre de confirmation : la liste est cachée derrière la fenêtre
 * (T66, m183).
 */
export const CONNEXION_FENETRE_COMPTE =
  'La connexion a échoué. Fermez cette fenêtre et vérifiez la liste avant de réessayer.'

/** Demande refusée pour une action sans champ, sur une ligne ou dans une fenêtre (T66, m186). */
export const REFUS_ACTION_COMPTE = "L'action n'a pas abouti. Rechargez la page, puis réessayez."

/** Refus d'une fonction de comptes : son code et sa phrase en français. */
export class ErreurCompte extends Error {
  readonly code: CodeErreurCompte

  constructor(code: CodeErreurCompte) {
    super(MESSAGES_ERREURS_COMPTES[code])
    this.name = 'ErreurCompte'
    this.code = code
  }
}

function estCodeConnu(code: unknown): code is CodeErreur {
  // Object.hasOwn : « toString » ou « constructor » (hérités) ne sont pas des codes.
  return (
    typeof code === 'string' &&
    code !== 'connexion' &&
    Object.hasOwn(MESSAGES_ERREURS_COMPTES, code)
  )
}

/** Code de la réponse `{ erreur: '<code>' }` d'une fonction ; `erreur_interne` s'il est illisible. */
async function codeDeLaReponse(reponse: unknown): Promise<CodeErreur> {
  if (!(reponse instanceof Response)) return 'erreur_interne'
  try {
    const corps: unknown = await reponse.json()
    const code =
      typeof corps === 'object' && corps !== null ? (corps as { erreur?: unknown }).erreur : null
    return estCodeConnu(code) ? code : 'erreur_interne'
  } catch {
    return 'erreur_interne'
  }
}

/**
 * Appelle une fonction de comptes avec le jeton de la session. `{ ok: true }` : rien à rendre.
 * Une réponse d'erreur devient une `ErreurCompte` avec son code ; une réponse qui n'arrive pas
 * (réseau, délai), une `ErreurCompte` « connexion ».
 */
async function appelerFonction(fonction: FonctionCompte, corps: object): Promise<void> {
  let resultat: Awaited<ReturnType<ReturnType<typeof supabase>['functions']['invoke']>>
  try {
    resultat = await supabase().functions.invoke(fonction, { body: corps })
  } catch {
    throw new ErreurCompte('connexion')
  }
  const { error } = resultat
  if (!error) return
  if (error instanceof FunctionsHttpError) {
    throw new ErreurCompte(await codeDeLaReponse(error.context))
  }
  throw new ErreurCompte('connexion')
}

/**
 * Tous les comptes et leur état (administration en aal2 seulement), dans l'ordre des libellés.
 * Aucune autre lecture ne donne l'adresse d'un compte.
 */
export async function lireEtatComptes(): Promise<LigneEtatCompte[]> {
  const { data, error } = await supabase()
    .from('v_etat_comptes')
    .select('user_id, type, libelle, ministere_id, email, desactive_le, etat')
    .order('libelle', { ascending: true })
  if (error) throw error
  return data
}

/**
 * Indicateurs propres actifs ou à valider de chaque ministère, calculs compris (colonne
 * « Indicateurs », aide `comptes.indicateurs`) : une ligne par indicateur, sans valeur. Les
 * communs (sans ministère) et les retirés n'y sont pas.
 */
export async function lireIndicateursDesMinisteres(): Promise<{ ministere_id: string | null }[]> {
  const { data, error } = await supabase()
    .from('indicateur')
    .select('ministere_id')
    .not('ministere_id', 'is', null)
    .in('etat', ['actif', 'en_attente'])
  if (error) throw error
  return data
}

/**
 * Ministères qu'EJP Tech peut supprimer (T74) : vides, sans compte activé, hors FIJ et
 * Coordination. La base le vérifie de nouveau à la suppression.
 */
export async function lireMinisteresSupprimables(): Promise<string[]> {
  const { data, error } = await supabase().from('v_ministeres_supprimables').select('ministere_id')
  if (error) throw error
  return data.map((ligne) => ligne.ministere_id)
}

/**
 * Comptes jamais activés (aucun code de double authentification vérifié), désactivés compris
 * (T74) : leur adresse se corrige, à la réactivation aussi.
 */
export async function lireComptesJamaisActives(): Promise<string[]> {
  const { data, error } = await supabase().from('v_comptes_jamais_actives').select('user_id')
  if (error) throw error
  return data.map((ligne) => ligne.user_id)
}

/**
 * Crée un compte (nouveau ministère, ministère existant sans compte, berger, conseil ou EJP
 * Tech) et envoie l'invitation. La demande est validée par le schéma de la fonction : une valeur
 * invalide lève une erreur Zod avant tout appel.
 */
export async function creerCompte(demande: DemandeCreerCompte): Promise<void> {
  await appelerFonction('creer-compte', schemaCreerCompte.parse(demande))
}

/** Renvoie l'invitation d'un compte dont l'adresse n'est pas encore confirmée. */
export async function relancerInvitation(userId: string): Promise<void> {
  await appelerFonction('relancer-invitation', schemaCibleCompte.parse({ user_id: userId }))
}

/** Désactive un compte (et son ministère) : plus de connexion, l'historique reste. */
export async function desactiverCompte(userId: string): Promise<void> {
  await appelerFonction('desactiver-compte', schemaCibleCompte.parse({ user_id: userId }))
}

/** Réactive un compte désactivé (et son ministère). */
export async function reactiverCompte(userId: string): Promise<void> {
  await appelerFonction('reactiver-compte', schemaCibleCompte.parse({ user_id: userId }))
}

/**
 * « Refaire l'activation » : facteurs supprimés, mot de passe remplacé, sessions fermées. La
 * personne repasse par « Mot de passe oublié », puis par l'activation.
 */
export async function reinitialiserDoubleAuthentification(userId: string): Promise<void> {
  await appelerFonction('reinitialiser-2fa', schemaCibleCompte.parse({ user_id: userId }))
}

/**
 * Corrige l'adresse d'un compte jamais activé (T74) : la nouvelle adresse remplace l'ancienne et
 * reçoit l'invitation. Le ministère, ses indicateurs et son historique ne bougent pas.
 */
export async function corrigerAdresse(userId: string, email: string): Promise<void> {
  await appelerFonction('corriger-adresse', schemaCorrigerAdresse.parse({ user_id: userId, email }))
}

/** Supprime un ministère vide, ses indicateurs, son compte et son accès de connexion (T74). */
export async function supprimerMinistere(ministereId: string): Promise<void> {
  await appelerFonction(
    'supprimer-ministere',
    schemaCibleMinistere.parse({ ministere_id: ministereId }),
  )
}
