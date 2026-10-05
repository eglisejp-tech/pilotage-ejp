import { useSearchParams } from 'react-router'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import { ChargementCetteSemaine } from '@/features/cette-semaine/ChargementCetteSemaine'
import { typeSessionDeLAdresse } from '@/features/cette-semaine/lecteur'
import { TEXTES_VIDES } from '@/features/cette-semaine/textesVides'
import type { Lecteur } from '@/features/cette-semaine/types'
import { useCetteSemaine } from '@/features/cette-semaine/useCetteSemaine'
import { VueCetteSemaine } from '@/features/cette-semaine/VueCetteSemaine'
import { ErreurDePage } from '@/pages/ErreurDePage'

type Proprietes = {
  /** Stable d'un rendu à l'autre (PageApplication le mémorise). */
  lecteur: Lecteur
}

/**
 * Accueil « / » du ministère, du berger, du conseil et de l'administration de l'église (BRIEF
 * section 9). `?session=` choisit le type de la session affichée (T20). Trois états : le
 * chargement (titres tout de suite, « Chargement » après 300 ms), l'erreur de page avec
 * « Réessayer » (échec ou 10 s sans réponse), puis la vue. Titre : « Cette semaine, Pilotage EJP ».
 */
export function PageCetteSemaine({ lecteur }: Proprietes) {
  useTitrePage('Cette semaine')
  const [parametres] = useSearchParams()
  const resultat = useCetteSemaine(lecteur, typeSessionDeLAdresse(parametres.get('session')))

  if (resultat.donnees) return <VueCetteSemaine donnees={resultat.donnees} />
  if (resultat.erreur) {
    return (
      <>
        <h1 className="sr-only">Cette semaine</h1>
        <ErreurDePage
          message={TEXTES_VIDES.page.erreur}
          libelleBouton={TEXTES_VIDES.page.reessayer}
          onReessayer={resultat.reessayer}
        />
      </>
    )
  }
  return <ChargementCetteSemaine profil={lecteur.profil} />
}
