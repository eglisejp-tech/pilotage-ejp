import { ajouterUnCompte, changerDEspace, retirerCeCompte } from '@/features/espaces/actions'
import type { ProprietesEspaces } from '@/features/espaces/MenuEspaces'
import { useRegistre } from '@/features/espaces/useRegistre'
import { NOMBRE_MAX_ESPACES } from '@/lib/espaces'

/**
 * « Changer d'espace » de l'en-tête (T73) : les comptes ouverts sur l'appareil, dans l'ordre de
 * leur ouverture. L'espace actif prend le libellé du compte connecté ; un espace dont le compte
 * n'est pas encore connu (ajout en cours dans un autre onglet) n'est pas listé.
 */
export function useEspaces(libelleActif: string): ProprietesEspaces {
  const registre = useRegistre()
  const liste = registre.espaces.flatMap((espace) => {
    if (espace.id === registre.actif) return [{ id: espace.id, libelle: libelleActif, actif: true }]
    return espace.libelle ? [{ id: espace.id, libelle: espace.libelle, actif: false }] : []
  })
  return {
    liste,
    peutAjouter: registre.espaces.length < NOMBRE_MAX_ESPACES,
    surChanger: changerDEspace,
    surAjouter: ajouterUnCompte,
    surRetirer: retirerCeCompte,
  }
}
