import type { LigneVosSaisies } from '@/features/accueil-ministere/types'
import { TEXTES_ACCUEIL } from '@/features/accueil-ministere/textesAccueil'

/** Ce qu'une ligne de « Vos saisies » affiche sous son libellé. */
export interface EtatAffiche {
  /** « Fait » ou « À faire », avec son carré de couleur ; null : ligne sans bouton (mentionné). */
  mot: 'fait' | 'a_faire' | null
  /** « 10 au service », « Date non confirmée », « Mentionné par Communication : ... ». */
  texte: string | null
}

/** « Fait, 10 au service », « À faire : en attente de validation, dans 3 jours ». */
const PREFIXES = [/^Fait\s*[,:]\s*/, /^À faire\s*[,:]\s*/]

function majuscule(texte: string): string {
  return texte.charAt(0).toLocaleUpperCase('fr-FR') + texte.slice(1)
}

/**
 * Sépare le mot d'état du reste du détail, comme la maquette 07 (« ■ Fait  10 au service »,
 * « ■ À faire  Date non confirmée ») : les lignes des lots écrivent leur détail en une phrase
 * (« Fait, 10 au service »), l'écran écrit le mot à part, en couleur et toujours en toutes
 * lettres. Une ligne sans bouton (un événement d'un autre ministère qui mentionne celui-ci) n'a
 * rien à faire : elle n'a pas de mot d'état, seulement son détail.
 */
export function etatAffiche(ligne: LigneVosSaisies): EtatAffiche {
  if (ligne.action === null) return { mot: null, texte: ligne.detail }
  if (ligne.detail === null) return { mot: ligne.etat, texte: null }
  const reste = PREFIXES.reduce((texte, prefixe) => texte.replace(prefixe, ''), ligne.detail)
  return { mot: ligne.etat, texte: reste === '' ? null : majuscule(reste) }
}

/** Le mot d'état écrit (« Fait », « À faire »). */
export function motEtat(mot: 'fait' | 'a_faire'): string {
  return TEXTES_ACCUEIL.etat[mot]
}
