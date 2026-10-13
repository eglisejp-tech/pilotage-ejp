import { useEffect, useState } from 'react'
import { useEnLigne } from '@/components/etats/useEnLigne'

/** Hors ligne (m245, Proposé) : ce qui risque d'arriver, lectures et saisies. */
export const TEXTE_HORS_LIGNE =
  "Pas de connexion internet. Les chiffres affichés peuvent dater, et vos saisies ne s'enregistrent pas."

/** Retour du réseau (m246, Proposé) : la personne sait qu'elle peut réessayer. */
export const TEXTE_RETOUR_EN_LIGNE = 'Connexion rétablie.'

/** Durée de « Connexion rétablie. » (m246). */
export const DUREE_RETOUR_EN_LIGNE_MS = 4000

/**
 * Bandeau hors ligne (T25), au-dessus du routeur : visible sur toute page, connexion comprise,
 * tant que le navigateur n'a pas de réseau. Il informe seulement : il ne bloque aucun bouton. Au
 * retour du réseau, la même région dit « Connexion rétablie. » pendant 4 secondes, puis se vide.
 *
 * La région `role="status"` est toujours dans la page, vide et sans marge intérieure, et le texte
 * n'y entre qu'au besoin : beaucoup de lecteurs d'écran n'annoncent que les changements d'une
 * région déjà présente, pas une région qui apparaît avec son contenu.
 */
export function BandeauHorsLigne() {
  const enLigne = useEnLigne()
  const [enLignePrecedent, setEnLignePrecedent] = useState(enLigne)
  const [retour, setRetour] = useState(false)

  // Hors ligne puis en ligne : « Connexion rétablie. » ; l'inverse efface ce message.
  if (enLignePrecedent !== enLigne) {
    setEnLignePrecedent(enLigne)
    setRetour(enLigne)
  }

  useEffect(() => {
    if (!retour) return
    const minuterie = window.setTimeout(() => setRetour(false), DUREE_RETOUR_EN_LIGNE_MS)
    return () => window.clearTimeout(minuterie)
  }, [retour])

  return (
    <div role="status">
      {!enLigne ? (
        <p className="bg-alerte-fond px-4 py-3 text-center text-[15px] leading-normal text-alerte">
          {TEXTE_HORS_LIGNE}
        </p>
      ) : retour ? (
        <p className="border-b border-bien bg-papier px-4 py-3 text-center text-[15px] leading-normal font-semibold text-bien">
          {TEXTE_RETOUR_EN_LIGNE}
        </p>
      ) : null}
    </div>
  )
}
