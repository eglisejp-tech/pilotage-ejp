import { useQuery } from '@tanstack/react-query'
import type { FunctionComponent } from 'react'
import { lireProchaineReunion } from '@/data/reunions'
import { construireReunion } from '@/features/fiche/construireReunion'
import type { ProprietesEmplacementFiche } from '@/features/fiche/types'
import { VueReunion } from '@/features/fiche/VueReunion'
import type { EtatReunion } from '@/features/fiche/VueReunion'

/**
 * Emplacement « Prochaine réunion » de la fiche (maquettes 04 et 12, lot E6) : lit la dernière
 * déclaration du ministère dont la date n'est pas passée (`v_prochaine_reunion`, règle 15). Le
 * ministère a « Renseigner » ou « Modifier » ; le berger, le conseil et EJP Tech la lisent, sans
 * aucun bouton (T29).
 */
export const ProchaineReunion: FunctionComponent<ProprietesEmplacementFiche> = ({
  ministereId,
  profil,
}) => {
  const lecture = useQuery({
    queryKey: ['reunion', 'prochaine', ministereId],
    queryFn: () => lireProchaineReunion(ministereId),
  })
  const etat: EtatReunion = lecture.isError
    ? { etat: 'erreur', reessayer: () => void lecture.refetch() }
    : lecture.isSuccess
      ? { etat: 'donnees', reunion: construireReunion(lecture.data) }
      : { etat: 'chargement' }
  return <VueReunion etat={etat} peutSaisir={profil === 'ministere'} />
}
