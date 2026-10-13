import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { lireAValider } from '@/data/indicateurs'
import {
  lireIndicateursPropres,
  lireMinisteresConfiguration,
  lireUsageConfiguration,
} from '@/data/indicateursConfiguration'
import { masquerTexte } from '@/data/moderation'
import { lireDecisionsRecentes, validerIndicateur } from '@/data/validationIndicateurs'
import { useApresEcriture } from '@/features/evenements/useApresEcriture'
import type { EtatBloc } from '@/features/fiche/modeleFiche'
import { CLES_CONFIGURATION } from '@/features/indicateurs/configuration/cles'
import {
  construireAttentesAdministration,
  construireDecidees,
  construireLignesAdministration,
  construireLignesEjpTech,
} from '@/features/indicateurs/validation/construire'
import type { LigneAValider, LigneDecidee } from '@/features/indicateurs/validation/construire'
import type { ActionsLigne } from '@/features/indicateurs/validation/LigneAValider'

/** Clés des lectures du bloc : une par profil, pour que chacun relise ce que lit la base. */
export const CLES_A_VALIDER = {
  ejpTech: ['indicateurs', 'a-valider', 'ejp-tech'],
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
      // « Masquer le texte » (`masquer_texte`) : le « Pourquoi » d'une demande ou le motif d'un
      // refus. Les lectures sont relues, réussi ou non.
      masquer: async (masquage) => {
        try {
          await masquerTexte(masquage)
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
 * Bloc de l'administration de l'église : l'attente, lue dans `indicateur`, `v_usage_indicateurs` et
 * `ministere` (jamais `demande_indicateur` : le « Pourquoi » n'est lu que par le ministère et EJP
 * Tech). Ces trois lectures sont celles du tableau de l'écran (mêmes clés que L3a) : rien n'est lu
 * deux fois. Aucune action, aucune décision.
 */
export function useBlocAdministration(): BlocAValiderLu {
  // Les trois lectures du tableau de l'écran (L3a), sous les mêmes clés. Le bloc se monte une fois
  // le tableau lu : sans `refetchOnMount: false`, TanStack Query relirait ces données « périmées »
  // dès qu'il s'y abonne. Après une écriture, `invaliderConfiguration` les relit comme avant.
  const indicateurs = useQuery({
    queryKey: CLES_CONFIGURATION.indicateurs,
    queryFn: lireIndicateursPropres,
    refetchOnMount: false,
  })
  const usage = useQuery({
    queryKey: CLES_CONFIGURATION.usage,
    queryFn: lireUsageConfiguration,
    refetchOnMount: false,
  })
  const ministeres = useQuery({
    queryKey: CLES_CONFIGURATION.ministeres,
    queryFn: lireMinisteresConfiguration,
    refetchOnMount: false,
  })
  const lignes = useMemo((): EtatBloc<LigneAValider[]> => {
    const requetes = [indicateurs, usage, ministeres]
    if (requetes.some((requete) => requete.isError)) {
      return {
        etat: 'erreur',
        reessayer: () => {
          for (const requete of requetes) if (requete.isError) void requete.refetch()
        },
      }
    }
    if (
      indicateurs.data === undefined ||
      usage.data === undefined ||
      ministeres.data === undefined
    ) {
      return { etat: 'chargement' }
    }
    return {
      etat: 'donnees',
      donnees: construireLignesAdministration(
        construireAttentesAdministration(indicateurs.data, ministeres.data, usage.data),
      ),
    }
  }, [indicateurs, usage, ministeres])
  return { lignes, decidees: null, actions: null }
}
