import { useQuery } from '@tanstack/react-query'
import { creerPoint } from '@/data/pointsEcriture'
import { lireSemaine } from '@/data/eglise'
import { lireMinisteres } from '@/data/ministeres'
import { enEchec } from '@/features/evenements/lectures'
import { ministeresAMentionner } from '@/features/evenements/mentions'
import { useApresEcriture } from '@/features/evenements/useApresEcriture'
import { useFermerSaisie } from '@/features/evenements/useFermerSaisie'
import { PanneauNouveauPoint } from '@/features/nouveau-point/PanneauNouveauPoint'
import type { ContenuPanneauNouveauPoint } from '@/features/nouveau-point/PanneauNouveauPoint'
import type { NouveauPoint } from '@/features/nouveau-point/schemas'

/**
 * `/saisir/point` : lit le jour de Paris (`v_semaine`) et les ministères, puis ouvre le formulaire.
 * L'envoi passe par `creer_point` (une seule ligne de journal par envoi) ; une réussite fait relire
 * les lectures de l'application (« Cette semaine », points, fiche, journal).
 */
export function SaisieNouveauPoint({
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

  const envoyer = async (point: NouveauPoint) => {
    await creerPoint(point)
    apresEcriture()
  }

  let contenu: ContenuPanneauNouveauPoint
  if (semaine.data && ministeres.data) {
    contenu = {
      etat: 'formulaire',
      aujourdhui: semaine.data.aujourdhui,
      ministereId,
      ministeres: ministeresAMentionner(ministeres.data, ministereId),
      envoyer,
    }
  } else if (enEchec([semaine, ministeres]) || semaine.data === null) {
    contenu = {
      etat: 'probleme',
      reessayer: () => {
        void semaine.refetch()
        void ministeres.refetch()
      },
    }
  } else {
    contenu = { etat: 'chargement' }
  }
  return <PanneauNouveauPoint contenu={contenu} onFermer={fermer} surtitre={libelleCompte} />
}
