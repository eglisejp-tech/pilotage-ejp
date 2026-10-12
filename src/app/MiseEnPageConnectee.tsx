import { useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { MiseEnPage } from '@/app/MiseEnPage'
import { accueil, ONGLETS } from '@/features/navigation/profils'
import { seDeconnecter } from '@/features/session/actions'
import { useCompteConnecte, usePrenomDeclare } from '@/features/session/contexte'
import { adresseChangement } from '@/features/session/decisions'

/**
 * Mise en page du compte connecté en aal2 : ses onglets, son libellé, « Se déconnecter » et, pour
 * un compte de ministère, la personne déclarée sur cet appareil avec « Ce n'est pas moi » (T56).
 */
export function MiseEnPageConnectee() {
  const compte = useCompteConnecte()
  const prenom = usePrenomDeclare()
  const { pathname, search } = useLocation()
  const [deconnexionEnCours, setDeconnexionEnCours] = useState(false)

  async function deconnecter() {
    setDeconnexionEnCours(true)
    await seDeconnecter()
  }

  return (
    <MiseEnPage
      libelleCompte={compte.libelle}
      onglets={ONGLETS[compte.type]}
      accueil={accueil(compte.type)}
      onSignOut={() => void deconnecter()}
      deconnexionEnCours={deconnexionEnCours}
      personne={
        prenom === null
          ? undefined
          : { prenom, lienChangement: adresseChangement(`${pathname}${search}`) }
      }
      avecBandeau
    >
      <Outlet />
    </MiseEnPage>
  )
}
