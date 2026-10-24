import { TEXTES_VIDES } from './textesVides'
import type { ValeurAffichee } from './types'

interface Props {
  valeur: ValeurAffichee
}

/**
 * Valeur d'un chiffre de l'église, en Big Shoulders, ou son état vide. Big Shoulders n'a pas de
 * chiffres de même largeur (son 1 est presque deux fois plus étroit que son 0) : `tabular-nums`
 * n'y change rien, la colonne aligne les valeurs à droite.
 */
export function ValeurChiffre({ valeur }: Props) {
  if (valeur.etat !== 'saisie') {
    return (
      <span className="text-sm whitespace-nowrap text-encre-3">
        {valeur.etat === 'vide' ? TEXTES_VIDES.chiffres.valeur : TEXTES_VIDES.chiffres.nonCalcule}
      </span>
    )
  }
  return (
    <span className="font-chiffres text-chiffre leading-none font-extrabold whitespace-nowrap tabular-nums">
      {valeur.texte}
      {valeur.unite ? <span className="ml-0.5 text-[0.5em]">{valeur.unite}</span> : null}
    </span>
  )
}
