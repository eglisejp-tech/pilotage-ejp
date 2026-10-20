import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { lireAValider } from '@/data/indicateurs'
import {
  lireIndicateursPropres,
  lireMinisteresConfiguration,
  lireUsageConfiguration,
} from '@/data/indicateursConfiguration'
import { masquerTexte } from '@/data/moderation'
import {
  lireDecisionsRecentes,
  lireRetraitsRecents,
  validerIndicateur,
} from '@/data/validationIndicateurs'
import { useApresEcriture } from '@/features/evenements/useApresEcriture'
import type { EtatBloc } from '@/features/fiche/modeleFiche'
import { CLES_CONFIGURATION } from '@/features/indicateurs/configuration/cles'
import {
  construireAttentesAdministration,
  construireDecidees,
  construireLignesAdministration,
  construireLignesEjpTech,
  construireRetraitsMinisteres,
} from '@/features/indicateurs/validation/construire'
import type {
  LigneAValider,
  LigneDecidee,
  LigneRetraitMinistere,
} from '@/features/indicateurs/validation/construire'
import type { ActionsLigne } from '@/features/indicateurs/validation/LigneAValider'

/** Clés des lectures du bloc : une par profil, pour que chacun relise ce que lit la base. */
export const CLES_A_VALIDER = {
  ejpTech: ['indicateurs', 'a-valider', 'ejp-tech'],
  decidees: ['indicateurs', 'a-valider', 'decidees'],
  retraits: ['indicateurs', 'a-valider', 'retraits'],
} as const

/** Ce que reçoit la vue du bloc : les lignes, les décisions et les retraits récents, les actions. */
export interface BlocAValiderLu {
  lignes: EtatBloc<LigneAValider[]>
  decidees: EtatBloc<LigneDecidee[]> | null
  /** Les retraits des ministères (T62), lus par EJP Tech seul ; null pour l'administration. */
  retraits: EtatBloc<LigneRetraitMinistere[]> | null
  actions: ActionsLigne | null
}

/**
 * Bloc d'EJP Tech : la file `v_a_valider` (avec le « Pourquoi »), les décisions et les retraits
 * faits par les ministères (T62) des 30 derniers jours, lus à part : l'échec d'une liste ne cache
 * pas la file. « Valider » et « Refuser » appellent `valider_indicateur`. Après chaque décision,
 * réussie ou non (une réponse perdue n'empêche pas la fonction d'avoir abouti, et un autre compte a
 * pu décider avant), les lectures sont relues.
 */
export function useBlocEjpTech(): BlocAValiderLu {
  const demandes = useQuery({ queryKey: CLES_A_VALIDER.ejpTech, queryFn: lireAValider })
  const decisions = useQuery({ queryKey: CLES_A_VALIDER.decidees, queryFn: lireDecisionsRecentes })
  const retraitsLus = useQuery({ queryKey: CLES_A_VALIDER.retraits, queryFn: lireRetraitsRecents })
  const apresEcriture = useApresEcriture()

  const retraits = useMemo((): EtatBloc<LigneRetraitMinistere[]> => {
    if (retraitsLus.isError) return { etat: 'erreur', reessayer: () => void retraitsLus.refetch() }
    if (retraitsLus.data === undefined) return { etat: 'chargement' }
    return { etat: 'donnees', donnees: construireRetraitsMinisteres(retraitsLus.data) }
  }, [retraitsLus])

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
      // « Masquer le texte » (`masquer_texte`) : le « Pourquoi » d'une demande, le motif d'un
      // refus ou celui d'un retrait par un ministère (T62). Les lectures sont relues, réussi ou non.
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

  return { lignes, decidees, retraits, actions }
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
  return { lignes, decidees: null, retraits: null, actions: null }
}
