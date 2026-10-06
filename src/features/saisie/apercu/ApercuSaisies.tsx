import { useSearchParams } from 'react-router'
import { lireProfilApercu } from '@/features/navigation/apercu/exemples'
import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'
import { etatApercuDimanche, etatApercuMois } from '@/features/saisie-chiffres/apercu/etatsApercu'
import { lireEcranApercuE3 } from '@/features/saisie-chiffres/apercu/exemples'
import { ContenuSaisieDimanche } from '@/features/saisie-chiffres/ContenuSaisieDimanche'
import { ContenuSaisieMois } from '@/features/saisie-chiffres/ContenuSaisieMois'
import {
  surtitreDimanche,
  TEXTES_CHIFFRES,
  titreDimanche,
  titreMois,
} from '@/features/saisie-chiffres/textes'
import { PageNonDisponible } from '@/pages/PageNonDisponible'

const fermer = () => undefined

/**
 * Aperçus de développement du lot E3, sans base ni envoi (/apercu/saisies) : la saisie du
 * dimanche (maquette 08, par défaut, avec ses quatre aides en flux, que lit `e2e/aide.spec.ts`)
 * et « Chiffres du mois » (`?ecran=mois`), chacun dans ses états (`?etat=`, voir
 * `etatsApercu.ts`). Un autre profil que le ministère (`?profil=`) reçoit la page non
 * disponible, comme dans l'application : EJP Tech n'a aucun bouton de saisie. Données d'exemple.
 */
export function ApercuSaisies() {
  const [parametres] = useSearchParams()
  const profil = parametres.get('profil')
  const etat = parametres.get('etat')
  if (profil !== null && lireProfilApercu(profil) !== 'ministere') return <PageNonDisponible />

  if (lireEcranApercuE3(parametres.get('ecran')) === 'mois') {
    const mois = etatApercuMois(etat)
    return (
      <PanneauSaisie
        titre={mois.etat === 'pret' ? titreMois(mois.mois, mois.enCours) : 'Chiffres du mois'}
        surtitre={TEXTES_CHIFFRES.surtitreMois}
        onFermer={fermer}
      >
        <ContenuSaisieMois etat={mois} />
      </PanneauSaisie>
    )
  }
  const dimanche = etatApercuDimanche(etat)
  return (
    <PanneauSaisie
      titre={dimanche.etat === 'pret' ? titreDimanche(dimanche.dimanche) : 'Chiffres du dimanche'}
      surtitre={surtitreDimanche(dimanche.etat === 'pret' && dimanche.champs.correction)}
      onFermer={fermer}
    >
      <ContenuSaisieDimanche etat={dimanche} />
    </PanneauSaisie>
  )
}
