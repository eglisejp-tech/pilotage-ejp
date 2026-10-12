import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  effacerPrenom,
  effacerPrenomsAnciens,
  lireConnexions,
  lireLibellesComptes,
  lirePersonnes,
} from '@/data/personnes'
import {
  connexionsAffichees,
  nombreAEffacer,
  personnesActives,
} from '@/features/personnes/construirePersonnes'
import type { DonneesPersonnes } from '@/features/personnes/modelePersonnes'

/** Racine des clés de l'onglet : « Réessayer » et un effacement relisent tout l'onglet. */
const RACINE = 'personnes'

export type ResultatPersonnes =
  | { etat: 'chargement' }
  | { etat: 'erreur'; reessayer: () => void }
  | { etat: 'pret'; donnees: DonneesPersonnes }

export interface ActionsPersonnes {
  afficherPlus: () => void
  /** Rend le nombre de déclarations effacées ; un échec remonte à la fenêtre. */
  effacer: (intervenantId: number) => Promise<number>
  effacerAnciens: () => Promise<number>
}

/**
 * Lit l'onglet « Personnes » d'EJP Tech (T56) : les personnes par compte (`v_personnes`), les
 * libellés des comptes et les connexions, 50 par 50. La base ne rend rien à un autre profil.
 */
export function usePersonnes(): { resultat: ResultatPersonnes; actions: ActionsPersonnes } {
  const client = useQueryClient()
  const personnes = useQuery({ queryKey: [RACINE, 'liste'], queryFn: lirePersonnes })
  const libelles = useQuery({ queryKey: [RACINE, 'comptes'], queryFn: lireLibellesComptes })
  const connexions = useInfiniteQuery({
    queryKey: [RACINE, 'connexions'],
    queryFn: ({ pageParam }) => lireConnexions(pageParam),
    initialPageParam: null as number | null,
    getNextPageParam: (derniere) => derniere.suivant ?? undefined,
  })

  const donnees = useMemo<DonneesPersonnes | null>(() => {
    if (!personnes.data || !libelles.data || !connexions.data) return null
    return {
      actives: personnesActives(personnes.data),
      aEffacer: nombreAEffacer(personnes.data),
      connexions: connexionsAffichees(
        connexions.data.pages.flatMap((page) => page.connexions),
        libelles.data,
      ),
      aPlus: connexions.hasNextPage,
      plusEnCours: connexions.isFetchingNextPage,
    }
  }, [
    personnes.data,
    libelles.data,
    connexions.data,
    connexions.hasNextPage,
    connexions.isFetchingNextPage,
  ])

  const relire = () => client.invalidateQueries({ queryKey: [RACINE] })
  const actions: ActionsPersonnes = {
    afficherPlus: () => void connexions.fetchNextPage(),
    effacer: async (intervenantId) => {
      const nombre = await effacerPrenom(intervenantId)
      await relire()
      return nombre
    },
    effacerAnciens: async () => {
      const nombre = await effacerPrenomsAnciens()
      await relire()
      return nombre
    },
  }

  const enEchec =
    (personnes.isError && !personnes.data) ||
    (libelles.isError && !libelles.data) ||
    (connexions.isError && !connexions.data)
  if (enEchec) {
    return {
      resultat: {
        etat: 'erreur',
        reessayer: () => void client.resetQueries({ queryKey: [RACINE] }),
      },
      actions,
    }
  }
  if (donnees === null) return { resultat: { etat: 'chargement' }, actions }
  return { resultat: { etat: 'pret', donnees }, actions }
}
