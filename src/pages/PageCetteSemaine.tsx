import { useSearchParams } from 'react-router'
import { useAccueilMinistere } from '@/features/accueil-ministere/useAccueilMinistere'
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
 * section 9). `?session=` choisit le type de la session affichée (T20). Le ministère a en plus
 * l'ouverture de 07 (phrase de ce qu'il reste à faire, boutons, « Vos saisies », « Vos points »),
 * lue par `useAccueilMinistere` ; les autres profils ne la lisent pas. Trois états : le
 * chargement (titres tout de suite, « Chargement » après 300 ms), l'erreur de page avec
 * « Réessayer » (échec ou 10 s sans réponse, de la vue ou de l'accueil), puis la vue. Titre :
 * « Cette semaine, Pilotage EJP ».
 */
export function PageCetteSemaine({ lecteur }: Proprietes) {
  useTitrePage('Cette semaine')
  const [parametres] = useSearchParams()
  const resultat = useCetteSemaine(lecteur, typeSessionDeLAdresse(parametres.get('session')))
  const accueil = useAccueilMinistere(lecteur.profil === 'ministere' ? lecteur.ministereId : null)

  if (resultat.erreur || accueil.etat === 'erreur') {
    const reessayer = () => {
      if (resultat.erreur) resultat.reessayer()
      if (accueil.etat === 'erreur') accueil.reessayer()
    }
    return (
      <>
        <h1 className="sr-only">Cette semaine</h1>
        <ErreurDePage
          message={TEXTES_VIDES.page.erreur}
          libelleBouton={TEXTES_VIDES.page.reessayer}
          onReessayer={reessayer}
        />
      </>
    )
  }
  if (resultat.donnees && accueil.etat === 'pret') {
    return <VueCetteSemaine donnees={resultat.donnees} accueil={accueil.donnees} />
  }
  if (resultat.donnees && accueil.etat === 'sans_objet') {
    return <VueCetteSemaine donnees={resultat.donnees} />
  }
  return <ChargementCetteSemaine profil={lecteur.profil} />
}
