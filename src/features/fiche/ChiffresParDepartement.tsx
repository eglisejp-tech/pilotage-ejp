import type { FunctionComponent } from 'react'
import { ChiffresParDepartementLu } from '@/features/fiche/ChiffresParDepartementLu'
import { blocVisible } from '@/features/fiche/donneesChiffresParDepartement'
import type { ProprietesEmplacementFiche } from '@/features/fiche/types'

/**
 * Emplacement « Chiffres par département » de la fiche de Coordo FIJ (X5, P40 ; lot E4). Le bloc
 * n'existe que sur la fiche du ministère `fij`, lue par ce ministère (12), le berger, le conseil
 * et EJP Tech (04) ; il est absent de toute autre fiche et de l'administration, sans requête.
 * Seul le ministère `fij` voit l'action de saisie ; EJP Tech lit sans aucun bouton (T29).
 */
export const ChiffresParDepartement: FunctionComponent<ProprietesEmplacementFiche> = ({
  ministereCode,
  profil,
}) => {
  if (!blocVisible(ministereCode, profil)) return null
  return <ChiffresParDepartementLu peutSaisir={profil === 'ministere'} />
}
