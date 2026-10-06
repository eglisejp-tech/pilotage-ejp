import { useQuery } from '@tanstack/react-query'
import { ajouterEvenement } from '@/data/evenementsEcriture'
import { lireSemaine } from '@/data/eglise'
import { lireMinisteres } from '@/data/ministeres'
import { enEchec } from '@/features/evenements/lectures'
import { ministeresAMentionner } from '@/features/evenements/mentions'
import { PanneauEvenement } from '@/features/evenements/PanneauEvenement'
import type { ContenuPanneauEvenement } from '@/features/evenements/PanneauEvenement'
import type { AjoutEvenement } from '@/features/evenements/schemas'
import { useApresEcriture } from '@/features/evenements/useApresEcriture'
import { useFermerSaisie } from '@/features/evenements/useFermerSaisie'

/**
 * `/saisir/evenement` : lit le jour de Paris (`v_semaine`) et les ministères, puis ouvre le
 * formulaire d'ajout. L'envoi passe par `ajouter_evenement` ; une réussite fait relire les
 * lectures de l'application (calendrier, fraîcheur).
 */
export function SaisieAjoutEvenement({
  ministereId,
  libelleCompte,
}: {
  ministereId: string
  libelleCompte: string
}) {
  const fermer = useFermerSaisie()
  const apresEcriture = useApresEcriture()
  const semaine = useQuery({ queryKey: ['eglise', 'semaine'], queryFn: lireSemaine })
  const ministeres = useQuery({ queryKey: ['ministeres', 'liste'], queryFn: lireMinisteres })

  const envoyer = async (evenement: AjoutEvenement) => {
    await ajouterEvenement(evenement)
    apresEcriture()
  }

  let contenu: ContenuPanneauEvenement
  if (semaine.data && ministeres.data) {
    contenu = {
      etat: 'ajout',
      aujourdhui: semaine.data.aujourdhui,
      ministereId,
      ministeres: ministeresAMentionner(ministeres.data, ministereId),
      envoyer,
    }
  } else if (enEchec([semaine, ministeres]) || semaine.data === null) {
    contenu = {
      etat: 'probleme',
      mode: 'ajout',
      reessayer: () => {
        void semaine.refetch()
        void ministeres.refetch()
      },
    }
  } else {
    contenu = { etat: 'chargement', mode: 'ajout' }
  }
  return <PanneauEvenement contenu={contenu} onFermer={fermer} surtitre={libelleCompte} />
}
