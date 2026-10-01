import { isAuthApiError } from '@supabase/supabase-js'
import {
  schemaCode,
  schemaConnexion,
  schemaMotDePasseOublie,
  schemaNouveauMotDePasse,
} from '@/features/connexion/schemas'
import type {
  ValeursConnexion,
  ValeursMotDePasseOublie,
  ValeursNouveauMotDePasse,
} from '@/features/connexion/schemas'
import { traduireErreur } from '@/features/session/erreurs'
import type { Contexte } from '@/features/session/erreurs'
import {
  definirMotDePasseAChoisir,
  effacerMotDePasseAChoisir,
} from '@/features/session/motDePasseAChoisir'
import type { EtapeMotDePasse } from '@/features/session/motDePasseAChoisir'
import { noterDeconnexionVolontaire } from '@/features/session/motif'
import { rafraichirSession } from '@/features/session/useEtatSession'
import { messagesConnexion } from '@/features/connexion/messages'
import { viderDonnees } from '@/lib/requetes'
import { supabase } from '@/lib/supabase'

// Appels à Supabase Auth des écrans de connexion (BRIEF section 8). Chaque action valide ses
// valeurs avec le schéma Zod du formulaire, puis rend `{ erreur }` en français, ou rien.

export type Resultat = { erreur?: string }

/** Nom affiché par l'application d'authentification, fixé avant la mise en service (T09). */
export const NOM_APPLICATION_TOTP = 'Pilotage EJP'

async function executer(
  contexte: Contexte,
  appel: () => Promise<{ error: unknown }>,
): Promise<Resultat> {
  try {
    const { error } = await appel()
    return error ? { erreur: traduireErreur(error, contexte) } : {}
  } catch (erreur) {
    return { erreur: traduireErreur(erreur, contexte) }
  }
}

export async function seConnecterAvecMotDePasse(valeurs: ValeursConnexion): Promise<Resultat> {
  const { email, motDePasse } = schemaConnexion.parse(valeurs)
  const resultat = await executer('connexion', () =>
    supabase().auth.signInWithPassword({ email, password: motDePasse }),
  )
  if (!resultat.erreur) await rafraichirSession()
  return resultat
}

/**
 * « Continuer avec Google » : le navigateur part chez Google, puis revient sur /connexion (même
 * hôte que l'adresse du site, donc autorisé par Supabase), où le flux PKCE ouvre la session.
 */
export function seConnecterAvecGoogle(retour: string | null): Promise<Resultat> {
  const adresseRetour = new URL('/connexion', window.location.origin)
  if (retour) adresseRetour.searchParams.set('retour', retour)
  return executer('connexion', () =>
    supabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: adresseRetour.toString() },
    }),
  )
}

export type Activation = { facteurId: string; qrCode: string; cle: string }

/** Le QR code de Supabase est un SVG brut derrière un préfixe : on l'encode pour <img>. */
export function adresseImageQr(qrCode: string): string {
  const prefixe = 'data:image/svg+xml;utf-8,'
  const svg = qrCode.startsWith(prefixe) ? qrCode.slice(prefixe.length) : qrCode
  if (svg.startsWith('data:')) return svg
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/**
 * Prépare l'activation (écran 17) : supprime d'abord les facteurs non vérifiés (sinon un deuxième
 * essai échoue sur le nom déjà pris), puis enrôle un facteur TOTP. Le QR code n'est jamais gardé.
 */
export async function preparerActivation(): Promise<Activation | { erreur: string }> {
  try {
    const mfa = supabase().auth.mfa
    const { data: facteurs, error: erreurListe } = await mfa.listFactors()
    if (erreurListe) return { erreur: traduireErreur(erreurListe, 'code') }
    for (const facteur of facteurs.all) {
      if (facteur.factor_type === 'totp' && facteur.status === 'unverified') {
        const { error } = await mfa.unenroll({ factorId: facteur.id })
        if (error) return { erreur: traduireErreur(error, 'code') }
      }
    }
    const { data, error } = await mfa.enroll({
      factorType: 'totp',
      issuer: NOM_APPLICATION_TOTP,
      friendlyName: NOM_APPLICATION_TOTP,
    })
    if (error) return { erreur: traduireErreur(error, 'code') }
    return { facteurId: data.id, qrCode: adresseImageQr(data.totp.qr_code), cle: data.totp.secret }
  } catch (erreur) {
    return { erreur: traduireErreur(erreur, 'code') }
  }
}

/** Code à 6 chiffres (écrans 17 et 18) : la session passe en aal2. */
export async function verifierCode(facteurId: string, code: string): Promise<Resultat> {
  const valeurs = schemaCode.safeParse({ code })
  if (!valeurs.success) return { erreur: messagesConnexion.codeFaux }
  const resultat = await executer('code', () =>
    supabase().auth.mfa.challengeAndVerify({ factorId: facteurId, code: valeurs.data.code }),
  )
  if (!resultat.erreur) await rafraichirSession()
  return resultat
}

export type ResultatLien =
  { etat: 'valide' } | { etat: 'invalide' } | { etat: 'erreur'; erreur: string }

/**
 * Lien d'invitation ou de récupération (/acces), après le clic sur « Continuer » : les antivirus
 * de messagerie ouvrent les liens sans cliquer, ils ne consomment donc pas le jeton.
 */
export async function verifierLien(
  tokenHash: string,
  etape: EtapeMotDePasse,
): Promise<ResultatLien> {
  try {
    const { error } = await supabase().auth.verifyOtp({
      token_hash: tokenHash,
      type: etape === 'invitation' ? 'invite' : 'recovery',
    })
    if (!error) {
      definirMotDePasseAChoisir(etape)
      await rafraichirSession()
      return { etat: 'valide' }
    }
    if (
      isAuthApiError(error) &&
      error.status >= 400 &&
      error.status < 500 &&
      error.status !== 429
    ) {
      return { etat: 'invalide' }
    }
    return { etat: 'erreur', erreur: traduireErreur(error, 'lien-email') }
  } catch (erreur) {
    return { etat: 'erreur', erreur: traduireErreur(erreur, 'lien-email') }
  }
}

/** « Choisissez votre mot de passe » ou « Nouveau mot de passe » (updateUser). */
export async function choisirMotDePasse(valeurs: ValeursNouveauMotDePasse): Promise<Resultat> {
  const { motDePasse } = schemaNouveauMotDePasse.parse(valeurs)
  const resultat = await executer('mot-de-passe', () =>
    supabase().auth.updateUser({ password: motDePasse }),
  )
  if (!resultat.erreur) {
    effacerMotDePasseAChoisir()
    await rafraichirSession()
  }
  return resultat
}

/**
 * « Mot de passe oublié » : toujours le même message, qu'un compte existe ou non. Seules les
 * limites de fréquence et les pannes réseau s'affichent.
 */
export async function demanderLien(valeurs: ValeursMotDePasseOublie): Promise<Resultat> {
  const { email } = schemaMotDePasseOublie.parse(valeurs)
  const resultat = await executer('lien-email', () =>
    supabase().auth.resetPasswordForEmail(email, {
      redirectTo: new URL('/acces', window.location.origin).toString(),
    }),
  )
  const message = resultat.erreur
  return message === messagesConnexion.tropDeTentatives || message === messagesConnexion.echecReseau
    ? resultat
    : {}
}

/** Session enregistrée par auth-js dans ce navigateur (clés « sb-...-auth-token »). */
function effacerSessionLocale() {
  try {
    for (const cle of Object.keys(window.localStorage)) {
      if (cle.startsWith('sb-') && cle.includes('-auth-token')) window.localStorage.removeItem(cle)
    }
  } catch {
    // Stockage inaccessible : rien n'y est enregistré.
  }
}

async function deconnexionLocaleReussie(): Promise<boolean> {
  try {
    const { error } = await supabase().auth.signOut({ scope: 'local' })
    return error === null
  } catch {
    return false
  }
}

/**
 * « Se déconnecter » : portée locale, pour ne pas déconnecter les autres personnes d'un compte
 * partagé (BRIEF section 8, règle 6). Sans réseau, auth-js garde la session : on l'efface
 * alors nous-mêmes et on recharge, pour qu'un appareil partagé ne reste jamais connecté.
 */
export async function seDeconnecter(): Promise<void> {
  noterDeconnexionVolontaire()
  effacerMotDePasseAChoisir()
  viderDonnees()
  if (!(await deconnexionLocaleReussie())) {
    effacerSessionLocale()
    window.location.assign('/connexion')
    return
  }
  await rafraichirSession()
}

/** Écran « Compte désactivé » : déconnexion locale s'il reste une session sur cet appareil. */
export async function quitterSessionDesactivee(): Promise<void> {
  try {
    const { data } = await supabase().auth.getSession()
    if (data.session) await seDeconnecter()
  } catch {
    // Configuration absente ou stockage illisible : aucune session à fermer.
  }
}
