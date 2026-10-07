// Petits outils des pages de saisie d'événement et de réunion, autour des lectures (TanStack Query).

interface EtatLecture {
  isError: boolean
  isFetching: boolean
}

/**
 * Une lecture a échoué et rien n'est en cours : problème passager. Pendant un nouvel essai
 * (« Réessayer »), le panneau repasse par le chargement.
 */
export function enEchec(lectures: readonly EtatLecture[]): boolean {
  return (
    lectures.some((lecture) => lecture.isError) && !lectures.some((lecture) => lecture.isFetching)
  )
}

const MOTIF_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Identifiant de la base (uuid) : une autre adresse ne déclenche aucune requête. */
export function estIdentifiant(valeur: string | undefined): valeur is string {
  return valeur !== undefined && MOTIF_UUID.test(valeur)
}
