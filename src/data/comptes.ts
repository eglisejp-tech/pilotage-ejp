// Ministères et comptes (écran 13, lot L1) : lectures de l'administration de l'église et appels
// des cinq Edge Functions de comptes (BRIEF, section 8, « Les Edge Functions »). Une fonction par
// requête. Les lectures passent par la RLS : `v_etat_comptes` ne rend des lignes qu'à
// l'administration en aal2. Les écritures ne passent jamais par une table : chaque action appelle
// sa fonction par `functions.invoke`, avec le jeton de la session (la clé secrète reste dans la
// fonction). Chaque demande est validée par les schémas partagés avec les fonctions
// (`supabase/functions/_shared/schemas.ts`) avant tout appel, et chaque code d'erreur de la
// réponse (`{ erreur: '<code>' }`) devient une phrase en français.

import { FunctionsHttpError } from '@supabase/supabase-js'
import type { CodeErreur } from '../../supabase/functions/_shared/http.ts'
import {
  schemaCibleCompte,
  schemaCreerCompte,
  type DemandeCreerCompte,
} from '../../supabase/functions/_shared/schemas.ts'
import type { LigneVue } from '@/lib/base'
import { supabase } from '@/lib/supabase'

export type LigneEtatCompte = LigneVue<'v_etat_comptes'>

/** Les cinq Edge Functions de comptes. */
export type FonctionCompte =
  | 'creer-compte'
  | 'relancer-invitation'
  | 'desactiver-compte'
  | 'reactiver-compte'
  | 'reinitialiser-2fa'

/** Code de refus d'une fonction, ou `connexion` quand la réponse n'est pas arrivée. */
export type CodeErreurCompte = CodeErreur | 'connexion'

/**
 * Chaque code de réponse des fonctions, en français simple (contrat commun : « traduit en
 * français par le front »). Le type impose une phrase pour chaque code de `_shared/http.ts`.
 * `connexion` : la réponse n'est pas arrivée (réseau, délai de 10 s), mais la fonction a pu
 * aboutir (compte créé, invitation partie). L'écran relit la liste ; la phrase (Proposé) demande
 * de la vérifier avant de réessayer.
 */
export const MESSAGES_ERREURS_COMPTES: Readonly<Record<CodeErreurCompte, string>> = {
  connexion: "La réponse n'est pas arrivée. Vérifiez la liste avant de réessayer.",
  requete_invalide: 'La demande est incomplète. Vérifiez les champs, puis réessayez.',
  methode_non_autorisee: "La demande n'a pas pu être envoyée. Réessayez.",
  non_authentifie: 'Votre session a expiré. Reconnectez-vous.',
  session_revoquee: 'Votre session a expiré. Reconnectez-vous.',
  double_authentification_requise:
    'Reconnectez-vous avec votre code de double authentification, puis réessayez.',
  acces_refuse: "Seule l'administration de l'église gère les comptes.",
  type_interdit: 'Ce type de compte ne se crée pas sur cet écran.',
  ministere_inconnu: "Ce ministère n'existe plus ou il est désactivé. Rechargez la page.",
  compte_inconnu: 'Ce compte est introuvable. Rechargez la page.',
  propre_compte: 'Cette action ne se fait pas sur votre propre compte.',
  adresse_deja_utilisee: 'Cette adresse a déjà un compte. Choisissez une autre adresse.',
  ministere_a_deja_un_compte: 'Ce ministère a déjà un compte actif.',
  nom_ministere_deja_pris: 'Un ministère porte déjà ce nom. Choisissez un autre nom.',
  berger_deja_actif: "Le berger a déjà un compte actif. Désactivez-le d'abord.",
  compte_desactive: "Ce compte est désactivé. Réactivez-le d'abord.",
  compte_actif: 'Ce compte est déjà actif.',
  invitation_deja_acceptee:
    "Cette invitation a déjà été acceptée. La personne choisit « Mot de passe oublié » sur l'écran de connexion.",
  invitation_trop_recente:
    'Une invitation vient de partir vers cette adresse. Attendez une minute, puis réessayez.',
  conflit: "Une autre modification vient d'avoir lieu. Rechargez la page, puis réessayez.",
  invitation_non_envoyee: "L'invitation n'a pas pu partir. Réessayez dans quelques minutes.",
  erreur_interne: "L'action n'a pas pu se terminer. Réessayez dans quelques minutes.",
}

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
