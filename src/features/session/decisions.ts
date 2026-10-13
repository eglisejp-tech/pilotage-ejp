import type { EtatSession } from '@/features/session/etat'
import { accueil, profilAutorise } from '@/features/navigation/profils'
import type { TypeCompte } from '@/lib/base'

// Décisions des gardes (BRIEF section 8, « Routage selon le niveau », et section 9,
// « Adresses »). Fonctions pures : la garde React les applique, les tests les vérifient.

/** Groupes d'adresses protégées par une même garde. */
export type Zone =
  | 'connexion'
  | 'double-authentification'
  | 'mot-de-passe'
  | 'conditions'
  | 'declaration'
  | 'application'

export const ADRESSE_CONNEXION = '/connexion'
export const ADRESSE_DOUBLE_AUTHENTIFICATION = '/double-authentification'
export const ADRESSE_MOT_DE_PASSE = '/acces/mot-de-passe'
export const ADRESSE_COMPTE_DESACTIVE = '/compte-desactive'
export const ADRESSE_CONDITIONS_A_ACCEPTER = '/conditions-a-accepter'
/** « Qui utilise l'outil ? » (T56) ; `?changer=1` : « Ce n'est pas moi ». */
export const ADRESSE_DECLARATION = '/qui-utilise'
export const PARAMETRE_CHANGEMENT = 'changer'

export type ContexteGarde = {
  /** Adresse demandée : chemin, paramètres et ancre. */
  adresse: string
  /** Paramètre `retour` de l'adresse demandée. */
  retour: string | null
  /** Un lien d'invitation ou de récupération attend un mot de passe. */
  motDePasseAChoisir: boolean
}

const ORIGINE_FICTIVE = 'http://pilotage.invalid'

export function avecRetour(chemin: string, retour: string | null): string {
  return retour ? `${chemin}?${new URLSearchParams({ retour }).toString()}` : chemin
}

/** Adresse de « Ce n'est pas moi » : l'écran de déclaration, puis retour à la page quittée. */
export function adresseChangement(retour: string | null): string {
  const parametres = new URLSearchParams({ [PARAMETRE_CHANGEMENT]: '1' })
  if (retour && retour !== '/') parametres.set('retour', retour)
  return `${ADRESSE_DECLARATION}?${parametres.toString()}`
}

/** L'adresse demandée est-elle « Ce n'est pas moi » (`?changer=1`) ? */
export function changementDemande(adresse: string): boolean {
  try {
    return new URL(adresse, ORIGINE_FICTIVE).searchParams.get(PARAMETRE_CHANGEMENT) === '1'
  } catch {
    return false
  }
}

/**
 * Adresse de retour sûre : un chemin de l'application (jamais une autre origine) auquel le
 * profil a droit. Sinon null, et la garde envoie vers l'accueil du profil.
 */
export function retourValide(retour: string | null, type: TypeCompte): string | null {
  if (!retour?.startsWith('/') || retour.startsWith('//') || retour.includes('\\')) return null
  let url: URL
  try {
    url = new URL(retour, ORIGINE_FICTIVE)
  } catch {
    return null
  }
  if (url.origin !== ORIGINE_FICTIVE || !profilAutorise(url.pathname, type)) return null
  return `${url.pathname}${url.search}${url.hash}`
}

/**
 * Adresse vers laquelle rediriger, ou null pour afficher l'adresse demandée. Dans la zone
 * « application », le droit du profil sur l'adresse se vérifie ensuite, écran par écran.
 */
export function destination(
  etat: EtatSession,
  zone: Zone,
  { adresse, retour, motDePasseAChoisir }: ContexteGarde,
): string | null {
  // Adresse à retrouver après la connexion : celle demandée dans l'application, sinon celle
  // déjà reçue en paramètre.
  const aRetrouver =
    zone === 'application'
      ? adresse === '/'
        ? null
        : adresse
      : zone === 'mot-de-passe'
        ? null
        : retour

  switch (etat.statut) {
    case 'anonyme':
      return zone === 'connexion' ? null : avecRetour(ADRESSE_CONNEXION, aRetrouver)
    case 'desactive':
      return ADRESSE_COMPTE_DESACTIVE
    case 'activation':
      if (motDePasseAChoisir) return zone === 'mot-de-passe' ? null : ADRESSE_MOT_DE_PASSE
      return zone === 'double-authentification'
        ? null
        : avecRetour(ADRESSE_DOUBLE_AUTHENTIFICATION, aRetrouver)
    case 'code':
      return zone === 'double-authentification'
        ? null
        : avecRetour(ADRESSE_DOUBLE_AUTHENTIFICATION, aRetrouver)
    case 'conditions':
      // Le mot de passe d'abord (invitation, récupération), puis les conditions, puis l'application.
      if (motDePasseAChoisir) return zone === 'mot-de-passe' ? null : ADRESSE_MOT_DE_PASSE
      // « Ce n'est pas moi » sur l'écran des conditions d'une personne (T61) : le prénom change
      // avant d'accepter, la nouvelle personne accepte ensuite elle-même.
      if (zone === 'declaration' && etat.prenom !== undefined && changementDemande(adresse)) {
        return null
      }
      return zone === 'conditions' ? null : avecRetour(ADRESSE_CONDITIONS_A_ACCEPTER, aRetrouver)
    case 'declaration':
      // Un compte de ministère dit d'abord qui l'utilise (T56), puis cette personne accepte les
      // conditions (T61), puis l'application.
      if (motDePasseAChoisir) return zone === 'mot-de-passe' ? null : ADRESSE_MOT_DE_PASSE
      return zone === 'declaration' ? null : avecRetour(ADRESSE_DECLARATION, aRetrouver)
    case 'connecte':
      if (motDePasseAChoisir) return zone === 'mot-de-passe' ? null : ADRESSE_MOT_DE_PASSE
      if (zone === 'application') return null
      // « Ce n'est pas moi » : un compte de ministère déjà déclaré revient sur l'écran.
      if (
        zone === 'declaration' &&
        etat.compte.type === 'ministere' &&
        changementDemande(adresse)
      ) {
        return null
      }
      return retourValide(retour, etat.compte.type) ?? accueil(etat.compte.type)
  }
}
