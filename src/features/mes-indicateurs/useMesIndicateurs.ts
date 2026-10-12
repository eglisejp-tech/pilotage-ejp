import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { lireLimitesIndicateurs, lireSuggestions, lireSuiviIndicateurs } from '@/data/indicateurs'
import { lireMinisteres } from '@/data/ministeres'
import { ajouterSuggestion, lireMesIndicateurs, lireMesRefus } from '@/data/validationIndicateurs'
import { useApresEcriture } from '@/features/evenements/useApresEcriture'
import type { EtatBloc } from '@/features/fiche/modeleFiche'
import { construireMesIndicateurs } from '@/features/mes-indicateurs/construire'
import type { DonneesMesIndicateurs } from '@/features/mes-indicateurs/construire'
import type { FormulaireSuggestion } from '@/features/mes-indicateurs/schemas'

/** Nom d'attente tant que la liste des ministères ne dit pas celui du compte. */
const NOM_PAR_DEFAUT = 'Votre ministère'

/** Envoie la suggestion choisie, avec son « Pourquoi » ; un refus de la base est levé tel quel. */
export type EnvoyerSuggestion = (code: string, formulaire: FormulaireSuggestion) => Promise<void>

export interface MesIndicateursLus {
  donnees: EtatBloc<DonneesMesIndicateurs>
  envoyer: EnvoyerSuggestion
}

/**
 * Lectures de « Mes indicateurs » : les indicateurs du ministère, leur suivi (jours d'attente,
 * dernière saisie), les refus et leur motif, les suggestions encore possibles, les limites et le
 * nom du ministère. Une lecture en échec donne l'erreur de page, avec « Réessayer » qui relance
 * celles qui ont échoué. L'envoi appelle `ajouter_suggestion` ; après chaque envoi, réussi ou non
 * (une réponse perdue n'empêche pas la fonction d'avoir abouti), les lectures sont relues.
 */
export function useMesIndicateurs(ministereId: string): MesIndicateursLus {
  const ministeres = useQuery({ queryKey: ['ministeres', 'liste'], queryFn: lireMinisteres })
  const indicateurs = useQuery({
    queryKey: ['mes-indicateurs', ministereId, 'indicateurs'],
    queryFn: () => lireMesIndicateurs(ministereId),
  })
  const suivi = useQuery({
    queryKey: ['mes-indicateurs', ministereId, 'suivi'],
    queryFn: () => lireSuiviIndicateurs(ministereId),
  })
  const refus = useQuery({
    queryKey: ['mes-indicateurs', ministereId, 'refus'],
    queryFn: () => lireMesRefus(ministereId),
  })
  const suggestions = useQuery({
    queryKey: ['mes-indicateurs', ministereId, 'suggestions'],
    queryFn: () => lireSuggestions(ministereId),
  })
  const limites = useQuery({
    queryKey: ['mes-indicateurs', ministereId, 'limites'],
    queryFn: () => lireLimitesIndicateurs(ministereId),
  })
  const apresEcriture = useApresEcriture()

  const donnees = useMemo((): EtatBloc<DonneesMesIndicateurs> => {
    const requetes = [ministeres, indicateurs, suivi, refus, suggestions, limites]
    if (requetes.some((requete) => requete.isError)) {
      return {
        etat: 'erreur',
        reessayer: () => {
          for (const requete of requetes) if (requete.isError) void requete.refetch()
        },
      }
    }
    if (
      ministeres.data === undefined ||
      indicateurs.data === undefined ||
      suivi.data === undefined ||
      refus.data === undefined ||
      suggestions.data === undefined ||
      limites.data === undefined
    ) {
      return { etat: 'chargement' }
    }
    return {
      etat: 'donnees',
      donnees: construireMesIndicateurs({
        nomMinistere:
          ministeres.data.find((ministere) => ministere.id === ministereId)?.nom ?? NOM_PAR_DEFAUT,
        indicateurs: indicateurs.data,
        suivi: suivi.data,
        refus: refus.data,
        suggestions: suggestions.data,
        limites: limites.data,
      }),
    }
  }, [ministeres, indicateurs, suivi, refus, suggestions, limites, ministereId])

  const envoyer = useMemo(
    (): EnvoyerSuggestion => async (code, formulaire) => {
      try {
        await ajouterSuggestion({ ministereId, code, pourquoi: formulaire.pourquoi })
      } finally {
        apresEcriture()
      }
    },
    [ministereId, apresEcriture],
  )

  return { donnees, envoyer }
}
