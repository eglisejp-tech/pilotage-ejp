import { TEXTE_CHARGEMENT_ECRAN } from '@/app/ecranALaDemande'
import { ChargementPage } from '@/components/etats/ChargementPage'
import { LECTURE_IMPOSSIBLE } from '@/components/etats/lectureImpossible'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import { ErreurDePage } from '@/pages/ErreurDePage'

type Proprietes = {
  /** Titre de l'écran attendu : l'onglet et l'annonce le disent déjà. */
  titre: string
  /** Le code de l'écran n'a pas pu arriver. */
  erreur: boolean
  onReessayer: () => void
}

/**
 * À la place d'un écran dont le code arrive (découpage par écran) : son chargement (rien pendant
 * 300 ms, puis la flamme vivante et « Chargement de la page », T65), ou, si le code n'arrive pas,
 * l'erreur de page avec « Réessayer », comme une lecture impossible. La mise en page (en-tête,
 * onglets, bandeau hors ligne) reste autour : jamais de page blanche.
 */
export function AttenteEcran({ titre, erreur, onReessayer }: Proprietes) {
  useTitrePage(titre)
  if (!erreur) return <ChargementPage texte={TEXTE_CHARGEMENT_ECRAN} />
  return (
    <>
      <h1 className="sr-only">{titre}</h1>
      <ErreurDePage
        message={LECTURE_IMPOSSIBLE}
        libelleBouton="Réessayer"
        onReessayer={onReessayer}
      />
    </>
  )
}
