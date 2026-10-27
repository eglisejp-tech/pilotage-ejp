import { useParams } from 'react-router'
import { SaisieAjoutEvenement } from '@/features/evenements/SaisieAjoutEvenement'
import { SaisieConsultationEvenement } from '@/features/evenements/SaisieConsultationEvenement'
import { SaisieMiseAJourEvenement } from '@/features/evenements/SaisieMiseAJourEvenement'
import { useCompteConnecte } from '@/features/session/contexte'
import { PageNonDisponible } from '@/pages/PageNonDisponible'

/**
 * `/saisir/evenement` (ajout, maquette 11) et `/saisir/evenement/:id` (mise à jour), pour un
 * compte de ministère ; `/saisir/evenement/:id` aussi pour EJP Tech, en lecture, avec « Retirer
 * l'événement » (T78). `PageApplication` a déjà refusé les autres profils, sans requête. Le titre
 * vient du panneau (« Ajouter un événement », « Mettre à jour l'événement », « Événement »), pas
 * de `ProprietesPage`.
 */
export function PageSaisieEvenement() {
  const compte = useCompteConnecte()
  const { id } = useParams()
  if (compte.type === 'admin_plateforme' && id !== undefined) {
    return <SaisieConsultationEvenement id={id} libelleCompte={compte.libelle} />
  }
  if (compte.ministereId === null) return <PageNonDisponible />
  return id === undefined ? (
    <SaisieAjoutEvenement ministereId={compte.ministereId} libelleCompte={compte.libelle} />
  ) : (
    <SaisieMiseAJourEvenement
      id={id}
      ministereId={compte.ministereId}
      libelleCompte={compte.libelle}
    />
  )
}
