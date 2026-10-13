import { useSearchParams } from 'react-router'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import { ChargementCetteSemaine } from '@/features/cette-semaine/ChargementCetteSemaine'
import { typeSessionDeLAdresse } from '@/features/cette-semaine/lecteur'
import { TEXTES_VIDES } from '@/features/cette-semaine/textesVides'
import type { Lecteur } from '@/features/cette-semaine/types'
import { useCetteSemaine } from '@/features/cette-semaine/useCetteSemaine'
import { VueCetteSemaine } from '@/features/cette-semaine/VueCetteSemaine'
import { ErreurDePage } from '@/pages/ErreurDePage'
import { PageMaSemaine } from '@/pages/PageMaSemaine'

type Proprietes = {
  /** Stable d'un rendu à l'autre (PageApplication le mémorise). */
  lecteur: Lecteur
}

/**
 * Accueil « / » (BRIEF section 9). Un compte de ministère a « Ma semaine » (`PageMaSemaine`,
 * décision T57) : ses propres chiffres, sans les lectures de la vue du berger. Le berger, le
 * conseil, l'administration de l'église et EJP Tech ont « Cette semaine ».
 */
export function PageCetteSemaine({ lecteur }: Proprietes) {
  if (lecteur.profil === 'ministere') return <PageMaSemaine ministereId={lecteur.ministereId} />
  return <PageEglise lecteur={lecteur} />
}

/**
 * « Cette semaine » de l'église, pour le berger, le conseil, l'administration et EJP Tech.
 * `?session=` choisit le type de la session affichée (T20). Trois états : le chargement (titres
 * tout de suite, « Chargement » après 300 ms), l'erreur de page avec « Réessayer » (échec ou 10 s
 * sans réponse), puis la vue. Titre : « Cette semaine, Pilotage EJP ».
 */
function PageEglise({ lecteur }: Proprietes) {
  useTitrePage('Cette semaine')
  const [parametres] = useSearchParams()
  const resultat = useCetteSemaine(lecteur, typeSessionDeLAdresse(parametres.get('session')))

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
  if (resultat.donnees) return <VueCetteSemaine donnees={resultat.donnees} />
  return <ChargementCetteSemaine profil={lecteur.profil} />
}
