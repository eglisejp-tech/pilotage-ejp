import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { lireAValider } from '@/data/indicateurs'
import {
  lireAttentesAdministration,
  lireDecisionsRecentes,
  validerIndicateur,
} from '@/data/validationIndicateurs'
import { useApresEcriture } from '@/features/evenements/useApresEcriture'
import type { EtatBloc } from '@/features/fiche/modeleFiche'
import {
  construireDecidees,
  construireLignesAdministration,
  construireLignesEjpTech,
} from '@/features/indicateurs/validation/construire'
import type { LigneAValider, LigneDecidee } from '@/features/indicateurs/validation/construire'
import type { ActionsLigne } from '@/features/indicateurs/validation/LigneAValider'

/** Clés des lectures du bloc : une par profil, pour que chacun relise ce que lit la base. */
export const CLES_A_VALIDER = {
  ejpTech: ['indicateurs', 'a-valider', 'ejp-tech'],
  administration: ['indicateurs', 'a-valider', 'administration'],
  decidees: ['indicateurs', 'a-valider', 'decidees'],
} as const

/** Ce que reçoit la vue du bloc : les lignes, les décisions récentes et les actions. */
export interface BlocAValiderLu {
  lignes: EtatBloc<LigneAValider[]>
  decidees: EtatBloc<LigneDecidee[]> | null
  actions: ActionsLigne | null
}

/**
 * Bloc d'EJP Tech : la file `v_a_valider` (avec le « Pourquoi ») et les décisions des 30 derniers
 * jours, lues à part : l'échec des décisions ne cache pas la file. « Valider » et « Refuser »
 * appellent `valider_indicateur`. Après chaque décision, réussie ou non (une réponse perdue
 * n'empêche pas la fonction d'avoir abouti, et un autre compte a pu décider avant), les lectures
 * sont relues.
 */
export function useBlocEjpTech(): BlocAValiderLu {
  const demandes = useQuery({ queryKey: CLES_A_VALIDER.ejpTech, queryFn: lireAValider })
  const decisions = useQuery({ queryKey: CLES_A_VALIDER.decidees, queryFn: lireDecisionsRecentes })
  const apresEcriture = useApresEcriture()

  const lignes = useMemo((): EtatBloc<LigneAValider[]> => {
    if (demandes.isError) return { etat: 'erreur', reessayer: () => void demandes.refetch() }
    if (demandes.data === undefined) return { etat: 'chargement' }
    return { etat: 'donnees', donnees: construireLignesEjpTech(demandes.data) }
  }, [demandes])

  const decidees = useMemo((): EtatBloc<LigneDecidee[]> => {
    if (decisions.isError) return { etat: 'erreur', reessayer: () => void decisions.refetch() }
    if (decisions.data === undefined) return { etat: 'chargement' }
    return { etat: 'donnees', donnees: construireDecidees(decisions.data) }
  }, [decisions])

  const actions = useMemo(
    (): ActionsLigne => ({
      valider: async (ligne) => {
        try {
          await validerIndicateur({ demandeId: ligne.id, decision: 'valide' })
        } finally {
          apresEcriture()
        }
      },
      refuser: async (ligne, motif) => {
        try {
          await validerIndicateur({ demandeId: ligne.id, decision: 'refuse', motif })
        } finally {
          apresEcriture()
        }
      },
    }),
    [apresEcriture],
  )

  return { lignes, decidees, actions }
}

/**
 * Bloc de l'administration de l'église : l'attente, lue dans `indicateur` et `v_usage_indicateurs`
 * (jamais `demande_indicateur` : le « Pourquoi » n'est lu que par le ministère et EJP Tech). Aucune
 * action, aucune décision.
 */
export function useBlocAdministration(): BlocAValiderLu {
  const attentes = useQuery({
    queryKey: CLES_A_VALIDER.administration,
    queryFn: lireAttentesAdministration,
  })
  const lignes = useMemo((): EtatBloc<LigneAValider[]> => {
    if (attentes.isError) return { etat: 'erreur', reessayer: () => void attentes.refetch() }
    if (attentes.data === undefined) return { etat: 'chargement' }
    return { etat: 'donnees', donnees: construireLignesAdministration(attentes.data) }
  }, [attentes])
  return { lignes, decidees: null, actions: null }
}
