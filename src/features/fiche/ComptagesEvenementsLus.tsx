import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { lireComptagesEglise, lireRetardsDuMois } from '@/data/comptages'
import { lireMinisteres } from '@/data/ministeres'
import { BlocEvenementsEglise } from '@/features/fiche/BlocEvenementsEglise'
import { BlocPonctualite } from '@/features/fiche/BlocPonctualite'
import { construireComptages, construireRetards } from '@/features/fiche/construireComptages'
import type { EtatComptages, EtatRetards } from '@/features/fiche/construireComptages'

interface Props {
  /** Berger, conseil et EJP Tech : la liste des événements commencés en retard. */
  avecRetards: boolean
}

/**
 * Lecture des deux blocs (`evenements_eglise_mois()`), puis, pour les lecteurs qui la voient, des
 * événements commencés en retard du mois des grandes valeurs (`v_evenement`) avec le nom de leur
 * ministère porteur. La base décide qui lit : un refus rend le problème passager, jamais d'autres
 * chiffres. Clés sous « evenements » : une saisie d'événement les relit.
 */
export function ComptagesEvenementsLus({ avecRetards }: Props) {
  const lecture = useQuery({
    queryKey: ['evenements', 'eglise', 'comptages'],
    queryFn: lireComptagesEglise,
  })
  const donnees = useMemo(
    () => (lecture.data === undefined ? null : construireComptages(lecture.data)),
    [lecture.data],
  )
  const aLister = avecRetards ? (donnees?.retards ?? null) : null
  const retards = useQuery({
    queryKey: ['evenements', 'eglise', 'retards', aLister?.debut, aLister?.fin],
    queryFn: () =>
      aLister === null ? Promise.resolve([]) : lireRetardsDuMois(aLister.debut, aLister.fin),
    enabled: aLister !== null,
  })
  const ministeres = useQuery({
    queryKey: ['ministeres', 'liste'],
    queryFn: lireMinisteres,
    enabled: aLister !== null,
  })

  let bloc: EtatComptages
  if (lecture.isError) bloc = { etat: 'erreur', reessayer: () => void lecture.refetch() }
  else if (lecture.isPending) bloc = { etat: 'chargement' }
  else if (donnees === null) bloc = { etat: 'premier_usage' }
  else bloc = { etat: 'donnees', donnees }

  let lectureRetards: EtatRetards | null = null
  if (aLister !== null) {
    if (retards.isError || ministeres.isError) {
      lectureRetards = {
        etat: 'erreur',
        reessayer: () => {
          if (retards.isError) void retards.refetch()
          if (ministeres.isError) void ministeres.refetch()
        },
      }
    } else if (retards.data === undefined || ministeres.data === undefined) {
      lectureRetards = { etat: 'chargement' }
    } else {
      const noms = new Map(ministeres.data.map((ministere) => [ministere.id, ministere.nom]))
      lectureRetards = { etat: 'donnees', donnees: construireRetards(retards.data, noms) }
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-sections">
      <BlocEvenementsEglise bloc={bloc} />
      <BlocPonctualite bloc={bloc} retards={lectureRetards} />
    </div>
  )
}
