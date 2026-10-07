import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ErreurCompte } from '@/data/comptes'
import {
  attendre,
  donneesExemple,
  donneesPremierUsage,
  lireRefusApercu,
  lireVueApercuComptes,
  simulerAction,
  simulerCreation,
} from '@/features/comptes/apercu/exemples'
import type { DonneesApercu } from '@/features/comptes/apercu/exemples'
import { construireComptes } from '@/features/comptes/construireComptes'
import type { ActionsComptes, DonneesComptes } from '@/features/comptes/types'
import { VueComptes } from '@/features/comptes/VueComptes'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import type { EtatBloc } from '@/features/fiche/modeleFiche'
import { lireProfilApercu } from '@/features/navigation/apercu/exemples'
import { PageNonDisponible } from '@/pages/PageNonDisponible'
import { TEXTES_COMPTES } from '@/features/comptes/textes'

const reessayer = () => undefined

/**
 * Aperçu de développement de l'écran 13 (lot L1), sans base : le vrai écran, des données
 * d'exemple, des actions simulées qui changent la page comme les Edge Functions la changeraient.
 * Adresse : /apercu/comptes?profil=admin_eglise.
 * - `vue=donnees` (défaut), `premier-usage` (aucun ministère, aucun compte), `chargement`,
 *   `probleme` (erreur de page) ;
 * - `refus=<code>` : chaque action est refusée avec ce code (`invitation_trop_recente`...) ;
 *   `envoi=echec` : la réponse n'arrive pas (« La connexion a échoué. ») ;
 * - tout autre profil reçoit la page non disponible, comme dans l'application.
 * Enregistrée seulement en développement.
 */
export function ApercuComptes() {
  const [parametres] = useSearchParams()
  const profil = lireProfilApercu(parametres.get('profil'))
  if (profil !== 'admin_eglise') return <PageNonDisponible />
  const vue = lireVueApercuComptes(parametres.get('vue'))
  return (
    <EcranApercu
      key={`${vue}-${parametres.toString()}`}
      vue={vue}
      refus={lireRefusApercu(parametres.get('refus'))}
      echec={parametres.get('envoi') === 'echec'}
    />
  )
}

interface Props {
  vue: ReturnType<typeof lireVueApercuComptes>
  refus: ReturnType<typeof lireRefusApercu>
  echec: boolean
}

function EcranApercu({ vue, refus, echec }: Props) {
  useTitrePage(TEXTES_COMPTES.titre)
  const [donnees, setDonnees] = useState<DonneesApercu>(() =>
    vue === 'premier-usage' ? donneesPremierUsage() : donneesExemple(),
  )
  // Dernières données, pour enchaîner deux actions sans attendre un nouveau rendu.
  const courantes = useRef(donnees)

  const appliquer = async (changer: (avant: DonneesApercu) => DonneesApercu) => {
    await attendre()
    if (echec) throw new Error('Connexion perdue (aperçu).')
    if (refus !== null) throw new ErreurCompte(refus)
    const apres = changer(courantes.current)
    courantes.current = apres
    setDonnees(apres)
  }

  const actions: ActionsComptes = {
    creer: (creation) => appliquer((avant) => simulerCreation(avant, creation)),
    relancer: (id) => appliquer((avant) => simulerAction(avant, id, 'relancer')),
    desactiver: (id) => appliquer((avant) => simulerAction(avant, id, 'desactiver')),
    reactiver: (id) => appliquer((avant) => simulerAction(avant, id, 'reactiver')),
    refaireActivation: (id) => appliquer((avant) => simulerAction(avant, id, 'refaire')),
  }

  let etat: EtatBloc<DonneesComptes>
  if (vue === 'chargement') etat = { etat: 'chargement' }
  else if (vue === 'probleme') etat = { etat: 'erreur', reessayer }
  else {
    etat = {
      etat: 'donnees',
      donnees: construireComptes(
        donnees.comptes.map((compte) => compte.ligne),
        donnees.ministeres,
        donnees.indicateurs,
      ),
    }
  }
  return <VueComptes titre={TEXTES_COMPTES.titre} donnees={etat} actions={actions} />
}
