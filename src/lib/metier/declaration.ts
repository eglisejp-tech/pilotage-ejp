import { z } from 'zod'

// Déclaration de la personne qui utilise un compte partagé de ministère (T56). Le prénom suit la
// même règle que la base (20261013090000_observabilite_personnes.sql) : 1 à 30 caractères, des
// lettres, avec espace, apostrophe ou trait d'union entre deux mots et un point après un mot
// (« Marie D. »). Ni chiffre, ni @, ni crochet : ni email, ni téléphone. La question revient à
// chaque connexion et à la première ouverture de chaque nouvelle journée, jour de Paris calculé
// par la base (T63, à la place du rappel des 7 jours de T56).

/** Marqueur d'un prénom effacé par EJP Tech (sur demande, ou au bout de 12 mois). */
export const PRENOM_EFFACE = '[prénom effacé]'

export const LONGUEUR_MAX_PRENOM = 30

export const MESSAGES_PRENOM = {
  vide: 'Indiquez votre prénom.',
  lettres: 'Écrivez seulement votre prénom, en lettres.',
  long: '30 caractères au plus.',
} as const

const LETTRES = 'A-Za-zÀ-ÖØ-öø-ɏ'
const FORME_PRENOM = new RegExp(`^[${LETTRES}]+\\.?(?:[ '’-][${LETTRES}]+\\.?)*$`, 'u')

/**
 * Accents composés (NFC : un « é » copié depuis un téléphone devient une seule lettre), espaces
 * retirés au début et à la fin, espaces répétés réduits à un : comme la base.
 */
export function nettoyerPrenom(valeur: string): string {
  return valeur.normalize('NFC').trim().replace(/\s+/g, ' ')
}

/** Prénom nettoyé, puis contrôlé : le formulaire et l'appel à la base partagent ce schéma. */
export const schemaPrenom = z
  .string()
  .transform(nettoyerPrenom)
  .pipe(
    z
      .string()
      .min(1, MESSAGES_PRENOM.vide)
      .max(LONGUEUR_MAX_PRENOM, MESSAGES_PRENOM.long)
      .regex(FORME_PRENOM, MESSAGES_PRENOM.lettres),
  )

/** Motif envoyé à la base ; elle pose elle-même « connexion » pour la première de la session. */
export type MotifDeclaration = 'connexion' | 'rappel' | 'changement'

/** Dernière déclaration de la session, telle que la lit `v_ma_declaration`. */
export type Declaration = {
  id: number
  prenom: string
  /** Faite aujourd'hui, jour de Paris calculé par la base (`du_jour`, T63). */
  duJour: boolean
}

/**
 * Faut-il demander le prénom ? Oui sans déclaration sur cette session (une nouvelle connexion),
 * quand elle date d'un jour précédent (rappel du jour, T63), ou quand EJP Tech a effacé le prénom.
 */
export function declarationNecessaire(declaration: Declaration | null): boolean {
  if (declaration === null) return true
  if (declaration.prenom === PRENOM_EFFACE) return true
  return !declaration.duJour
}

/**
 * Prénom déjà écrit dans le champ (T63) : au rappel du jour, celui de la dernière déclaration de
 * cette connexion, qu'un seul appui sur « Continuer » confirme. Vide à une nouvelle connexion,
 * après « Ce n'est pas moi », ou quand le prénom a été effacé.
 */
export function prenomPropose(changement: boolean, declaration: Declaration | null): string {
  if (changement || declaration === null || declaration.prenom === PRENOM_EFFACE) return ''
  return declaration.prenom
}

/** Motif d'une déclaration : « Ce n'est pas moi », rappel du jour (T63), ou connexion. */
export function motifDeclaration(
  changement: boolean,
  declaration: Declaration | null,
): MotifDeclaration {
  if (changement) return 'changement'
  return declaration === null ? 'connexion' : 'rappel'
}
