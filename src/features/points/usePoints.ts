import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { lireSemaine } from '@/data/eglise'
import { lireMinisteres } from '@/data/ministeres'
import { lirePointsListe } from '@/data/pointsListe'
import { construirePoints } from '@/features/points/construirePoints'
import type { DonneesPoints } from '@/features/points/modelePoints'
import type { ProfilPoints } from '@/features/points/textesPoints'

/** Sans réponse au bout de ce délai, l'écran affiche son erreur (LISEZMOI, « États »). */
export const DELAI_MAX_CHARGEMENT = 10_000

/** Clés des lectures de l'écran : « Réessayer » ne relance que celles-ci. */
const RACINES_CLES = ['eglise', 'ministeres', 'points']

export type ResultatPoints =
  | { etat: 'chargement' }
  /** Une lecture a échoué, ou 10 s sans réponse : bandeau « La connexion a échoué. Réessayez. » */
  | { etat: 'erreur'; reessayer: () => void }
  | { etat: 'pret'; donnees: DonneesPoints }

/**
 * Lit l'écran 05 : le jour de Paris (`v_semaine`), les points avec leurs mentions et les auteurs
 * des traitements, et les noms des ministères. Les clés commencent par `points`, `ministeres` et
 * `eglise` : les boutons du lot P1 relisent l'écran en invalidant `['points']`. `ministereDemande`
 * (paramètre `ministere` de l'adresse) filtre l'écran sans nouvelle lecture.
 */
export function usePoints(profil: ProfilPoints, ministereDemande: string | null): ResultatPoints {
  const queryClient = useQueryClient()
  const semaine = useQuery({ queryKey: ['eglise', 'semaine'], queryFn: lireSemaine })
  const points = useQuery({ queryKey: ['points', 'liste'], queryFn: lirePointsListe })
  const ministeres = useQuery({ queryKey: ['ministeres', 'liste'], queryFn: lireMinisteres })
  const lectures = [semaine, points, ministeres]

  const enEchec =
    lectures.some((requete) => requete.isError) || (semaine.isSuccess && semaine.data === null)
  const pret = !enEchec && lectures.every((requete) => requete.isSuccess)

  // Délai de 10 s : sans réponse, l'essai en cours passe en erreur. Chaque essai a le sien.
  const [essai, setEssai] = useState(0)
  const [essaiEnDelai, setEssaiEnDelai] = useState<number | null>(null)
  const enAttente = !pret && !enEchec
  // Le délai vaut pour une attente : une réponse arrivée après lui (ou un échec) clôt cette
  // attente, et la suivante repart avec son propre délai.
  if (!enAttente && essaiEnDelai !== null) setEssaiEnDelai(null)
  useEffect(() => {
    if (!enAttente) return
    const minuteur = setTimeout(() => setEssaiEnDelai(essai), DELAI_MAX_CHARGEMENT)
    return () => clearTimeout(minuteur)
  }, [enAttente, essai])

  const donnees = useMemo(() => {
    if (!pret || !semaine.data || !points.data || !ministeres.data) return null
    return construirePoints(
      {
        aujourdhui: semaine.data.aujourdhui,
        points: points.data.points,
        mentions: points.data.mentions,
        auteurs: points.data.auteurs,
        ministeres: ministeres.data,
      },
      profil,
      ministereDemande,
    )
  }, [pret, semaine.data, points.data, ministeres.data, profil, ministereDemande])

  const reessayer = () => {
    setEssai((precedent) => precedent + 1)
    // Une lecture sans réponse reste en cours : un simple refetch la rendrait telle quelle.
    // resetQueries l'annule et la relance ; les lectures réussies gardent leurs données.
    void queryClient.resetQueries({
      predicate: (requete) =>
        RACINES_CLES.includes(String(requete.queryKey[0])) &&
        (requete.state.status !== 'success' || requete.state.data === null),
    })
  }

  if (donnees !== null) return { etat: 'pret', donnees }
  if (enEchec || essaiEnDelai === essai) return { etat: 'erreur', reessayer }
  return { etat: 'chargement' }
}
