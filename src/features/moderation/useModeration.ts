import { useQuery } from '@tanstack/react-query'
import { lireMinisteres } from '@/data/ministeres'
import {
  lireDemandesEnAttente,
  lireTextesARelire,
  marquerRelu,
  masquerTexte,
} from '@/data/moderation'
import { enEchec } from '@/features/evenements/lectures'
import { useApresEcriture } from '@/features/evenements/useApresEcriture'
import { construireTextesARelire } from '@/features/moderation/construire'
import type { ContenuFile } from '@/features/moderation/FileARelire'
import { resumerIndicateursAValider } from '@/features/moderation/indicateurs'
import type { IndicateursAValider } from '@/features/moderation/indicateurs'

/** Clé des lectures de l'écran 15. */
const CLE_MODERATION = ['moderation'] as const

/**
 * Lectures et écritures de la file « Champs libres à relire » : `v_textes_a_relire` et les noms des
 * ministères (même clé que les autres écrans). Une lecture en échec donne « Réessayer » ; sans
 * les noms, la ligne garde le libellé du compte auteur. « Rien à signaler » passe par
 * `marquer_relu`, « Masquer définitivement » par `masquer_texte` ; après chaque écriture, toutes les
 * lectures sont relues (la file, mais aussi les fiches et les points qui montrent le texte masqué).
 */
export function useFileModeration(): ContenuFile {
  const apresEcriture = useApresEcriture()
  const textes = useQuery({
    queryKey: [...CLE_MODERATION, 'textes'],
    queryFn: lireTextesARelire,
  })
  const ministeres = useQuery({ queryKey: ['ministeres', 'liste'], queryFn: lireMinisteres })

  if (textes.data && !ministeres.isPending) {
    return {
      etat: 'liste',
      textes: construireTextesARelire(
        textes.data,
        (ministeres.data ?? []).map(({ id, nom }) => ({ id, nom })),
      ),
      relire: async (texte) => {
        try {
          await marquerRelu({ cible: texte.cible, cibleId: texte.cibleId })
        } finally {
          // Une réponse perdue n'empêche pas la fonction d'avoir abouti : la file est relue.
          apresEcriture()
        }
      },
      masquer: async (texte, choix) => {
        try {
          await masquerTexte({ cible: texte.cible, cibleId: texte.cibleId, ...choix })
        } finally {
          apresEcriture()
        }
      },
    }
  }
  if (enEchec([textes])) {
    return {
      etat: 'probleme',
      reessayer: () => {
        void textes.refetch()
        void ministeres.refetch()
      },
    }
  }
  return { etat: 'chargement' }
}

/**
 * L'en-tête « N indicateurs attendent votre validation » : les demandes en attente, lues dans
 * `v_a_valider` sans aucun texte. `null` : rien à dire, ou lecture en échec (l'écran garde son
 * contenu, le lien « Indicateurs » de la navigation reste là).
 */
export function useIndicateursAValider(): IndicateursAValider | null {
  const demandes = useQuery({
    queryKey: [...CLE_MODERATION, 'indicateurs'],
    queryFn: lireDemandesEnAttente,
  })
  return demandes.data ? resumerIndicateursAValider(demandes.data) : null
}
