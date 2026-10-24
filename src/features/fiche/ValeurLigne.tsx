import type { ValeurFiche } from '@/features/fiche/modeleFiche'
import { TEXTES_VIDES_INDICATEURS } from '@/features/indicateurs/textesVides'

interface Props {
  valeur: ValeurFiche
}

/**
 * Valeur d'une ligne de la fiche : un chiffre en Big Shoulders (exact, sensible compris, P52), ou
 * un texte (« Pas encore de saisie », « Non calculé »), jamais un 0 pour une absence. Les mots
 * d'état ne se coupent pas (proposition 17, T69) : la colonne des valeurs les tient sur une ligne.
 */
export function ValeurLigne({ valeur }: Props) {
  switch (valeur.etat) {
    case 'saisie':
      return (
        // Une seule taille par objet (écart 9, T69) : le chiffre d'une rangée, 36 px au téléphone
        // comme dans 03 et 07 (32 px avant), 44 px au plus.
        <span className="font-chiffres text-chiffre leading-none font-extrabold whitespace-nowrap tabular-nums">
          {valeur.texte}
          {valeur.unite ? <span className="ml-0.5 text-[0.5em]">{valeur.unite}</span> : null}
        </span>
      )
    case 'vide':
      return (
        <span className="text-detail whitespace-nowrap text-encre-3">
          {TEXTES_VIDES_INDICATEURS.pasEncoreDeSaisie}
        </span>
      )
    case 'non_calcule':
      return (
        <span className="text-detail font-semibold whitespace-nowrap text-encre-2">
          {valeur.texte}
        </span>
      )
  }
}
