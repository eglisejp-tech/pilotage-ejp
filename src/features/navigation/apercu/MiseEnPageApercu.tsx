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
  // L'écran des indicateurs est celui d'EJP Tech, qui les configure (T60), pas du berger.
  const profil = lireProfilApercu(
    parametres.get('profil'),
    pathname.startsWith('/apercu/indicateurs') ? 'admin_plateforme' : 'berger',
  )
  // L'aperçu d'un écran qui a son onglet (/apercu/comptes pour /comptes) montre cet onglet
  // actif, comme l'application ; sinon l'aperçu tient lieu d'accueil : le premier onglet y mène
  // et s'affiche actif.
  const ici = `${pathname}?profil=${profil}`
  const rangActif = Math.max(
    0,
    ONGLETS[profil].findIndex(
      ({ chemin }) =>
        chemin !== '/' &&
        (pathname === `/apercu${chemin}` || pathname.startsWith(`/apercu${chemin}/`)),
    ),
  )
  const onglets = ONGLETS[profil].map((onglet, rang) =>
    rang === rangActif ? { ...onglet, chemin: ici } : onglet,
  )
  // ?vous=Marie%20D. : la personne déclarée sur l'appareil (T56), pour un ministère seulement.
  const vous = profil === 'ministere' ? parametres.get('vous') : null
  return (
    <MiseEnPage
      libelleCompte={LIBELLES_EXEMPLE[profil]}
      onglets={onglets}
      accueil={ici}
      personne={
        vous ? { prenom: vous, lienChangement: '/apercu/qui-utilise?changer=1' } : undefined
      }
      onSignOut={() => undefined}
      avecBandeau={pathname === '/apercu/avancement'}
    >
      <Outlet />
    </MiseEnPage>
  )
}
