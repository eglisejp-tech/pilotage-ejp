import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  creerCompte,
  desactiverCompte,
  lireEtatComptes,
  lireIndicateursDesMinisteres,
  reactiverCompte,
  reinitialiserDoubleAuthentification,
  relancerInvitation,
} from '@/data/comptes'
import { lireMinisteres } from '@/data/ministeres'
import { construireComptes } from '@/features/comptes/construireComptes'
import { demandeDeCreation } from '@/features/comptes/schemas'
import type { ActionsComptes, DonneesComptes } from '@/features/comptes/types'
import type { EtatBloc } from '@/features/fiche/modeleFiche'

/** Clé des lectures propres à l'écran 13 (états des comptes, nombres d'indicateurs). */
const CLE_COMPTES = ['comptes'] as const

/**
 * Lectures de l'écran 13 : `v_etat_comptes`, les ministères (même clé que les autres écrans) et
 * les indicateurs propres de chaque ministère. Une lecture en échec donne l'erreur de page, avec
 * « Réessayer » qui relance les trois.
 */
export function useComptes(): EtatBloc<DonneesComptes> {
  const comptes = useQuery({ queryKey: [...CLE_COMPTES, 'etats'], queryFn: lireEtatComptes })
  const ministeres = useQuery({ queryKey: ['ministeres', 'liste'], queryFn: lireMinisteres })
  const indicateurs = useQuery({
    queryKey: [...CLE_COMPTES, 'indicateurs'],
    queryFn: lireIndicateursDesMinisteres,
  })
  if (comptes.isError || ministeres.isError || indicateurs.isError) {
    return {
      etat: 'erreur',
      reessayer: () => {
        void comptes.refetch()
        void ministeres.refetch()
        void indicateurs.refetch()
      },
    }
  }
  if (!comptes.isSuccess || !ministeres.isSuccess || !indicateurs.isSuccess) {
    return { etat: 'chargement' }
  }
  return {
    etat: 'donnees',
    donnees: construireComptes(comptes.data, ministeres.data, indicateurs.data),
  }
}

/**
 * Actions de l'écran 13, branchées sur les Edge Functions. Après chaque réussite, l'écran relit
 * les comptes et les ministères (un ministère créé, désactivé ou réactivé change aussi les
 * autres écrans).
 */
export function useActionsComptes(): ActionsComptes {
  const client = useQueryClient()
  const relire = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: CLE_COMPTES }),
      client.invalidateQueries({ queryKey: ['ministeres'] }),
    ])
  }
  const puisRelire =
    (action: (userId: string) => Promise<void>) =>
    async (userId: string): Promise<void> => {
      await action(userId)
      await relire()
    }
  return {
    creer: async (creation) => {
      await creerCompte(demandeDeCreation(creation))
      await relire()
    },
    relancer: puisRelire(relancerInvitation),
    desactiver: puisRelire(desactiverCompte),
    reactiver: puisRelire(reactiverCompte),
    refaireActivation: puisRelire(reinitialiserDoubleAuthentification),
  }
}
