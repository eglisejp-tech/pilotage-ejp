import { Outlet, useLocation, useSearchParams } from 'react-router'
import { MiseEnPage } from '@/app/MiseEnPage'
import { LIBELLES_EXEMPLE, lireProfilApercu } from '@/features/navigation/apercu/exemples'
import { ONGLETS } from '@/features/navigation/profils'

/**
 * Mise en page des aperçus de développement : l'en-tête réel du profil demandé (?profil=), sans
 * session ni appel au serveur. « Se déconnecter » n'y fait rien.
 */
export function MiseEnPageApercu() {
  const { pathname } = useLocation()
  const [parametres] = useSearchParams()
  const profil = lireProfilApercu(parametres.get('profil'))
  // L'aperçu tient lieu d'accueil : le premier onglet y mène et s'affiche actif.
  const ici = `${pathname}?profil=${profil}`
  const onglets = ONGLETS[profil].map((onglet, rang) =>
    rang === 0 ? { ...onglet, chemin: ici } : onglet,
  )
  return (
    <MiseEnPage
      libelleCompte={LIBELLES_EXEMPLE[profil]}
      onglets={onglets}
      accueil={ici}
      onSignOut={() => undefined}
    >
      <Outlet />
    </MiseEnPage>
  )
}
