import { useQuery } from '@tanstack/react-query'
import { lireMesSignalements, signalerDifficulte } from '@/data/signalements'
import { enEchec } from '@/features/evenements/lectures'
import { useApresEcriture } from '@/features/evenements/useApresEcriture'
import { useFermerSaisie } from '@/features/evenements/useFermerSaisie'
import type { ContenuMesSignalements } from '@/features/signalement/MesSignalements'
import { PanneauSignalement } from '@/features/signalement/PanneauSignalement'
import type { Signalement } from '@/features/signalement/schemas'
import { TEXTES_MES_SIGNALEMENTS } from '@/features/signalement/textes'
import type { EcranSignalement } from '@/lib/base'

interface Props {
  ministereId: string
  libelleCompte: string
  /** Écran d'origine, lu dans l'adresse (« autre » pour un code inconnu). */
  ecran: EcranSignalement
}

/**
 * `/signaler` pour un ministère : le formulaire s'affiche tout de suite (il ne lit rien) ;
 * « Vos derniers signalements » se lit à part, sous la RLS du ministère. Un envoi réussi relit
 * cette liste (et les autres lectures, comme toute saisie).
 */
export function SaisieSignalement({ ministereId, libelleCompte, ecran }: Props) {
  const fermer = useFermerSaisie()
  const apresEcriture = useApresEcriture()
  const lecture = useQuery({
    queryKey: ['signalements', 'miens', ministereId],
    queryFn: () => lireMesSignalements(ministereId, TEXTES_MES_SIGNALEMENTS.nombre),
  })

  const envoyer = async (signalement: Signalement) => {
    await signalerDifficulte(signalement)
    apresEcriture()
  }

  let mesSignalements: ContenuMesSignalements
  if (lecture.data) mesSignalements = { etat: 'liste', signalements: lecture.data }
  else if (enEchec([lecture]))
    mesSignalements = { etat: 'probleme', reessayer: () => void lecture.refetch() }
  else mesSignalements = { etat: 'chargement' }

  return (
    <PanneauSignalement
      ecran={ecran}
      envoyer={envoyer}
      mesSignalements={mesSignalements}
      onFermer={fermer}
      surtitre={libelleCompte}
    />
  )
}
