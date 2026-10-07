import type { ValeurFiche } from '@/features/fiche/modeleFiche'
import { TEXTES_VIDES_INDICATEURS } from '@/features/indicateurs/textesVides'

interface Props {
  valeur: ValeurFiche
}

/**
 * Valeur d'une ligne de la fiche : un chiffre en Big Shoulders (exact, sensible compris, P52), ou
 * un texte (« Pas encore de saisie », « Non calculé »), jamais un 0 pour une absence.
 */
export function ValeurLigne({ valeur }: Props) {
  switch (valeur.etat) {
    case 'saisie':
      return (
        <span className="font-chiffres text-[32px] leading-none font-extrabold whitespace-nowrap tabular-nums md:text-chiffre">
          {valeur.texte}
          {valeur.unite ? <span className="ml-0.5 text-[0.5em]">{valeur.unite}</span> : null}
        </span>
      )
    case 'vide':
      return (
        <span className="text-sm text-encre-3">{TEXTES_VIDES_INDICATEURS.pasEncoreDeSaisie}</span>
      )
    case 'non_calcule':
      return <span className="text-sm font-semibold text-encre-2">{valeur.texte}</span>
  }
}
