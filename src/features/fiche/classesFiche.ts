import { classesBouton } from '@/components/ui/Bouton'
import { cn } from '@/lib/utils'

/**
 * Bouton secondaire de l'ouverture de la fiche (maquettes 04 et 12) : cadre fin, fond papier, le
 * modèle commun de 44 px (proposition 6, T69). Une seule source pour « Saisir le mois », « Saisir
 * une session » et « Nouveau point », qui sont des liens.
 */
export const CLASSE_BOUTON_SECONDAIRE_FICHE = cn(
  classesBouton({ variante: 'secondaire', taille: 'ligne' }),
  'whitespace-nowrap',
)

/** « Saisir les chiffres du dimanche », la seule action jaune de la fiche (maquette 12). */
export const CLASSE_BOUTON_PRINCIPAL_FICHE = cn(
  classesBouton({ variante: 'principal', taille: 'ligne' }),
  'whitespace-nowrap',
)
