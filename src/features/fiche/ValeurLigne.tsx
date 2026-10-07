import { Aide } from '@/components/aide/Aide'
import type { ValeurFiche } from '@/features/fiche/modeleFiche'
import { TEXTES_VIDES_INDICATEURS } from '@/features/indicateurs/textesVides'
import { MOINS_DE_3 } from '@/lib/metier/unites'

interface Props {
  valeur: ValeurFiche
  /** Libellé de la ligne : pose l'aide `fiche.moinsDe3` sur cette valeur « moins de 3 ». */
  aideMoinsDe3?: string
}

/**
 * Valeur d'une ligne de la fiche : un chiffre en Big Shoulders, ou un texte (« moins de 3 »,
 * « Pas encore de saisie », « Non calculé »), jamais un 0 pour une absence.
 */
export function ValeurLigne({ valeur, aideMoinsDe3 }: Props) {
  switch (valeur.etat) {
    case 'saisie':
      return (
        <span className="font-chiffres text-[32px] leading-none font-extrabold whitespace-nowrap tabular-nums md:text-chiffre">
          {valeur.texte}
          {valeur.unite ? <span className="ml-0.5 text-[0.5em]">{valeur.unite}</span> : null}
        </span>
      )
    case 'moins_de_3':
      return (
        <span className="inline-flex items-center">
          <span className="text-[15px] font-semibold whitespace-nowrap">{MOINS_DE_3}</span>
          {aideMoinsDe3 !== undefined ? (
            <Aide code="fiche.moinsDe3" libelle={aideMoinsDe3} placement="flottante" />
          ) : null}
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
