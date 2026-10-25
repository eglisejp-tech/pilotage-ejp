import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import { AttenteEcran } from '@/app/AttenteEcran'
import type { EcranALaDemande } from '@/app/ecranALaDemande'
import { Arrivee } from '@/components/etats/Arrivee'
import { useAttenteChargement } from '@/components/etats/useAttenteChargement'
import { useEnLigne } from '@/components/etats/useEnLigne'

type Proprietes<P> = {
  ecran: EcranALaDemande<P>
  /** Titre de l'écran pour ce profil, dit pendant que son code arrive. */
  titre: string
  /** Ce que reçoit l'écran une fois chargé. */
  proprietes: P
}

/**
 * Affiche un écran chargé à la demande. Déjà chargé, il s'affiche tout de suite, tel quel : rien
 * ne se recharge, rien n'arrive en fondu. Sinon, son code arrive selon la règle de temps de T65
 * (`useAttenteChargement`) : rien pendant 300 ms, puis la flamme vivante au moins 600 ms une fois
 * montrée (jamais de clignotement), puis l'écran en fondu. Si le code n'arrive pas, l'erreur de
 * page avec « Réessayer », qui relance le chargement ; au retour du réseau, le chargement repart
 * seul, comme une lecture en erreur se relit seule. À monter avec `key={ecran.nom}` : un autre
 * écran repart de zéro.
 */
export function AffichageEcran<P extends object>({ ecran, titre, proprietes }: Proprietes<P>) {
  const [Ecran, setEcran] = useState<ComponentType<P> | undefined>(() => ecran.charge())
  const [erreur, setErreur] = useState(false)
  const enLigne = useEnLigne()
  const [enLignePrecedent, setEnLignePrecedent] = useState(enLigne)
  if (enLignePrecedent !== enLigne) {
    setEnLignePrecedent(enLigne)
    if (enLigne && erreur) setErreur(false)
  }
  const enChargement = Ecran === undefined && !erreur
  const { attente, fondu } = useAttenteChargement(enChargement)

  useEffect(() => {
    if (!enChargement) return
    let actif = true
    ecran.charger().then(
      (charge) => {
        if (actif) setEcran(() => charge)
      },
      () => {
        if (actif) setErreur(true)
      },
    )
    return () => {
      actif = false
    }
  }, [ecran, enChargement])

  if (attente || Ecran === undefined) {
    return (
      <AttenteEcran
        titre={titre}
        erreur={!attente && erreur}
        onReessayer={() => setErreur(false)}
      />
    )
  }
  return (
    <Arrivee fondu={fondu}>
      <Ecran {...proprietes} />
    </Arrivee>
  )
}
