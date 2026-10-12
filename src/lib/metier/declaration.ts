import { z } from 'zod'

// Déclaration de la personne qui utilise un compte partagé de ministère (T56). Le prénom suit la
// même règle que la base (20261013090000_observabilite_personnes.sql) : 1 à 30 caractères, des
// lettres, avec espace, apostrophe ou trait d'union entre deux mots et un point après un mot
// (« Marie D. »). Ni chiffre, ni @, ni crochet : ni email, ni téléphone.

/** La question « Qui utilise l'outil ? » revient quand la déclaration a ce nombre de jours. */
export const DUREE_DECLARATION_JOURS = 7

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

/** Espaces retirés au début et à la fin, espaces répétés réduits à un : comme la base. */
export function nettoyerPrenom(valeur: string): string {
  return valeur.trim().replace(/\s+/g, ' ')
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
  /** Âge selon l'horloge du serveur, en secondes. */
  ageSecondes: number
}

/**
 * Faut-il demander le prénom ? Oui sans déclaration sur cette session, quand elle a 7 jours ou
 * plus, ou quand EJP Tech a effacé le prénom.
 */
export function declarationNecessaire(declaration: Declaration | null): boolean {
  if (declaration === null) return true
  if (declaration.prenom === PRENOM_EFFACE) return true
  return declaration.ageSecondes >= DUREE_DECLARATION_JOURS * 24 * 60 * 60
}

/** Motif d'une déclaration : « Ce n'est pas moi », rappel des 7 jours, ou connexion. */
export function motifDeclaration(
  changement: boolean,
  declaration: Declaration | null,
): MotifDeclaration {
  if (changement) return 'changement'
  return declaration === null ? 'connexion' : 'rappel'
}
