import { ColonneConnexion } from '@/features/connexion/ColonneConnexion'
import { TitreConnexion } from '@/features/connexion/TitreConnexion'
import { useTitrePage } from '@/features/connexion/useTitrePage'

/**
 * Erreur inattendue pendant l'affichage d'un écran : rien d'autre qu'un rechargement. Mêmes mots
 * que l'erreur hors du routeur (`ErreurRacine`, T66, t040 à t042) : le bouton dit de recharger.
 */
export function ErreurApplication() {
  useTitrePage('Affichage impossible')
  return (
    <ColonneConnexion>
      <TitreConnexion
        surtitre="Pilotage EJP"
        titre="La page n'a pas pu s'afficher"
        taille="moyenne"
      >
        Si le problème revient, prévenez EJP Tech.
      </TitreConnexion>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="min-h-14 w-full bg-lumiere px-4.5 text-[15px] font-semibold text-encre"
      >
        Recharger la page
      </button>
    </ColonneConnexion>
  )
}
