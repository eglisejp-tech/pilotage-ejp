import { useSearchParams } from 'react-router'
import { lireProfilApercu } from '@/features/navigation/apercu/exemples'
import { accueil, trouverAdresse, titrePour } from '@/features/navigation/profils'
import { PageAVenir } from '@/pages/PageAVenir'

/**
 * Aperçu de développement de l'en-tête et du menu de chaque profil, sans base.
 * Adresse : /apercu/navigation?profil=ministere|berger|conseil|admin_eglise|admin_plateforme
 */
export function ApercuNavigation() {
  const [parametres] = useSearchParams()
  const profil = lireProfilApercu(parametres.get('profil'))
  const adresse = trouverAdresse(accueil(profil))
  if (!adresse) return null
  return <PageAVenir titre={titrePour(adresse, profil)} etape={adresse.etape} />
}
