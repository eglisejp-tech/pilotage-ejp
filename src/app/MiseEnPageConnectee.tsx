import { useState } from 'react'
import { Outlet } from 'react-router'
import { MiseEnPage } from '@/app/MiseEnPage'
import { accueil, ONGLETS } from '@/features/navigation/profils'
import { seDeconnecter } from '@/features/session/actions'
import { useCompteConnecte } from '@/features/session/contexte'

/** Mise en page du compte connecté en aal2 : ses onglets, son libellé, « Se déconnecter ». */
export function MiseEnPageConnectee() {
  const compte = useCompteConnecte()
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
      avecBandeau
    >
      <Outlet />
    </MiseEnPage>
  )
}
