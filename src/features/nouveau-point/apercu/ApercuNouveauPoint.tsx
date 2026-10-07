import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { PanneauNouveauPoint } from '@/features/nouveau-point/PanneauNouveauPoint'
import { contenuNouveauPoint, lireEcranApercuPoint } from '@/features/nouveau-point/apercu/exemples'
import { PageNonDisponible } from '@/pages/PageNonDisponible'

const fermer = () => undefined
const COMPTE_EXEMPLE = 'Ministère Communication'

/**
 * Aperçu de développement de « Nouveau point d'attention » (maquette 10), sans base : le vrai
 * panneau, avec les données d'exemple et un envoi simulé. Adresse : /apercu/nouveau-point,
 * `?ecran=` choisit l'écran : `formulaire` (par défaut, trois aides : priorité, attendu et
 * échéance), `sans-mention` (aucun autre ministère actif), `chargement`, `probleme`.
 * `&envoi=echec` simule une connexion perdue à l'envoi ; `&profil=berger` (ou `conseil`,
 * `admin_eglise`, `ejp_tech`) montre « Page non disponible » (seul le ministère crée un point).
 * Enregistrée seulement en développement.
 */
export function ApercuNouveauPoint() {
  const [parametres] = useSearchParams()
  const ecran = lireEcranApercuPoint(parametres.get('ecran'))
  const echec = parametres.get('envoi') === 'echec'
  // Un contenu par écran : l'envoi simulé garde son état d'un envoi à l'autre.
  const contenu = useMemo(() => contenuNouveauPoint(ecran, echec), [ecran, echec])

  const profil = parametres.get('profil')
  if (profil !== null && profil !== 'ministere') return <PageNonDisponible />

  return (
    <PanneauNouveauPoint
      key={ecran}
      contenu={contenu}
      onFermer={fermer}
      surtitre={COMPTE_EXEMPLE}
    />
  )
}
