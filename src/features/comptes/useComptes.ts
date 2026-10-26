import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  corrigerAdresse,
  creerCompte,
  desactiverCompte,
  lireComptesJamaisActives,
  lireEtatComptes,
  lireIndicateursDesMinisteres,
  lireRaisonsSuppression,
  reactiverCompte,
  reinitialiserDoubleAuthentification,
  relancerInvitation,
  supprimerMinistere,
} from '@/data/comptes'
import { lireMinisteres } from '@/data/ministeres'
import { construireComptes } from '@/features/comptes/construireComptes'
import { suppressionDe } from '@/features/comptes/raisons'
import { demandeDeCreation } from '@/features/comptes/schemas'
import type { ActionsComptes, DonneesComptes } from '@/features/comptes/types'
import type { EtatBloc } from '@/features/fiche/modeleFiche'

/** Clé des lectures propres à l'écran 13 (états des comptes, nombres d'indicateurs). */
const CLE_COMPTES = ['comptes'] as const

const AUCUN: readonly string[] = []

/**
 * Lectures de l'écran 13 : `v_etat_comptes`, les ministères (même clé que les autres écrans) et
 * les indicateurs propres de chaque ministère ; pour EJP Tech, qui gère (`gestion`), les raisons
 * d'un refus de suppression de chaque ministère (T75) et les comptes jamais activés (T74). Une
 * lecture en échec donne l'erreur
 * de page, avec « Réessayer » qui les relance toutes.
 */
export function useComptes(gestion = false): EtatBloc<DonneesComptes> {
  const comptes = useQuery({ queryKey: [...CLE_COMPTES, 'etats'], queryFn: lireEtatComptes })
  const ministeres = useQuery({ queryKey: ['ministeres', 'liste'], queryFn: lireMinisteres })
  const indicateurs = useQuery({
    queryKey: [...CLE_COMPTES, 'indicateurs'],
    queryFn: lireIndicateursDesMinisteres,
  })
  const raisons = useQuery({
    queryKey: [...CLE_COMPTES, 'raisons-suppression'],
    queryFn: () => lireRaisonsSuppression(),
    enabled: gestion,
  })
  const jamaisActives = useQuery({
    queryKey: [...CLE_COMPTES, 'jamais-actives'],
    queryFn: lireComptesJamaisActives,
    enabled: gestion,
  })
  const lectures = gestion
    ? [comptes, ministeres, indicateurs, raisons, jamaisActives]
    : [comptes, ministeres, indicateurs]
  if (lectures.some((lecture) => lecture.isError)) {
    return {
      etat: 'erreur',
      reessayer: () => {
        for (const lecture of lectures) void lecture.refetch()
      },
    }
  }
  if (
    !comptes.isSuccess ||
    !ministeres.isSuccess ||
    !indicateurs.isSuccess ||
    (gestion && (!raisons.isSuccess || !jamaisActives.isSuccess))
  ) {
    return { etat: 'chargement' }
  }
  return {
    etat: 'donnees',
    donnees: construireComptes(
      comptes.data,
      ministeres.data,
      indicateurs.data,
      gestion ? { raisons: raisons.data ?? [], jamaisActives: jamaisActives.data ?? AUCUN } : {},
    ),
  }
}

/**
 * Actions de l'écran 13, branchées sur les Edge Functions. Après chaque réussite, l'écran relit
 * les comptes et les ministères (un ministère créé, désactivé, réactivé ou supprimé change aussi
 * les autres écrans), avant d'annoncer la réussite. Après un échec aussi, sans l'attendre : une
 * réponse perdue (délai, réseau) n'empêche pas la fonction d'avoir abouti, et la liste relue le
 * montre avant un nouvel essai.
 */
export function useActionsComptes(): ActionsComptes {
  const client = useQueryClient()
  const relire = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: CLE_COMPTES }),
      client.invalidateQueries({ queryKey: ['ministeres'] }),
    ])
  }
  const puisRelire = async (appel: () => Promise<void>): Promise<void> => {
    try {
      await appel()
    } catch (erreur) {
      void relire()
      throw erreur
    }
    await relire()
  }
  const surCompte =
    (action: (userId: string) => Promise<void>) =>
    (userId: string): Promise<void> =>
      puisRelire(() => action(userId))
  return {
    creer: (creation) => puisRelire(() => creerCompte(demandeDeCreation(creation))),
    relancer: surCompte(relancerInvitation),
    desactiver: surCompte(desactiverCompte),
    reactiver: surCompte(reactiverCompte),
    refaireActivation: surCompte(reinitialiserDoubleAuthentification),
    corriger: (userId, email) => puisRelire(() => corrigerAdresse(userId, email)),
    supprimer: (ministereId) => puisRelire(() => supprimerMinistere(ministereId)),
    // Après un refus de la suppression : les raisons de ce ministère, puis la liste relue.
    lireSuppression: async (ministereId) => {
      const lignes = await lireRaisonsSuppression(ministereId)
      await relire()
      return suppressionDe(lignes)
    },
  }
}
