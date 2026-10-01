import { ColonneConnexion } from '@/features/connexion/ColonneConnexion'
import { TitreConnexion } from '@/features/connexion/TitreConnexion'
import { useTitrePage } from '@/features/connexion/useTitrePage'

/** Erreur inattendue pendant l'affichage d'un écran : rien d'autre qu'un rechargement. */
export function ErreurApplication() {
  useTitrePage('Erreur')
  return (
    <ColonneConnexion>
      <TitreConnexion
        surtitre="Pilotage EJP"
        titre="L'écran n'a pas pu s'afficher"
        taille="moyenne"
      >
        Rechargez la page. Si l'erreur revient, prévenez EJP Tech.
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
