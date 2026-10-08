import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import type { EtatBloc } from '@/features/fiche/modeleFiche'
import { lireProfilApercu } from '@/features/navigation/apercu/exemples'
import { construireLignesSessions } from '@/features/sessions/construire'
import {
  attendre,
  AUJOURDHUI_APERCU,
  donneesExemple,
  donneesVides,
  lireVueApercuSessions,
  MINISTERES_APERCU,
  simulerDeclaration,
  simulerModification,
  simulerSuppression,
} from '@/features/sessions/apercu/exemples'
import type { DonneesApercu, VueApercuSessions } from '@/features/sessions/apercu/exemples'
import { TEXTES_SESSIONS } from '@/features/sessions/textes'
import type { ActionsSessions, DonneesSessions } from '@/features/sessions/types'
import { VueSessions } from '@/features/sessions/VueSessions'
import { PageNonDisponible } from '@/pages/PageNonDisponible'

const reessayer = () => undefined

/**
 * Aperçu de développement de l'écran 14 (lot L2), sans base : le vrai écran, des données
 * d'exemple, des actions simulées qui changent la page comme les fonctions de la base la
 * changeraient. Adresse : /apercu/sessions?profil=admin_eglise.
 * - `vue=donnees` (défaut), `vide` (aucune session), `chargement`, `probleme` (erreur de page) ;
 * - `envoi=echec` : la réponse n'arrive pas (« La connexion a échoué... ») ;
 * - tout autre profil reçoit la page non disponible, comme dans l'application.
 * Enregistrée seulement en développement.
 */
export function ApercuSessions() {
  const [parametres] = useSearchParams()
  const profil = lireProfilApercu(parametres.get('profil'))
  if (profil !== 'admin_eglise') return <PageNonDisponible />
  return (
    <EcranApercu
      key={parametres.toString()}
      vue={lireVueApercuSessions(parametres.get('vue'))}
      echec={parametres.get('envoi') === 'echec'}
    />
  )
}

function EcranApercu({ vue, echec }: { vue: VueApercuSessions; echec: boolean }) {
  useTitrePage(TEXTES_SESSIONS.titre)
  const [donnees, setDonnees] = useState<DonneesApercu>(() =>
    vue === 'vide' ? donneesVides() : donneesExemple(),
  )
  const courantes = useRef(donnees)

  const appliquer = async <T,>(
    changer: (avant: DonneesApercu) => { apres: DonneesApercu; resultat: T },
  ) => {
    await attendre()
    if (echec) throw new Error('Connexion perdue (aperçu).')
    const { apres, resultat } = changer(courantes.current)
    courantes.current = apres
    setDonnees(apres)
    return resultat
  }

  const actions: ActionsSessions = {
    declarer: (valeurs) =>
      appliquer((avant) => {
        const { apres, id } = simulerDeclaration(avant, valeurs)
        return { apres, resultat: id }
      }),
    modifier: (sessionId, ministeres) =>
      appliquer((avant) => ({
        apres: simulerModification(avant, sessionId, ministeres),
        resultat: undefined,
      })),
    supprimer: (sessionId) =>
      appliquer((avant) => ({ apres: simulerSuppression(avant, sessionId), resultat: undefined })),
    lireAttendus: (sessionId) =>
      Promise.resolve(
        courantes.current.sessions.find(({ ligne }) => ligne.session_id === sessionId)?.attendus ??
          [],
      ),
  }

  let etat: EtatBloc<DonneesSessions>
  if (vue === 'chargement') etat = { etat: 'chargement' }
  else if (vue === 'probleme') etat = { etat: 'erreur', reessayer }
  else {
    etat = {
      etat: 'donnees',
      donnees: {
        lignes: construireLignesSessions(donnees.sessions.map(({ ligne }) => ligne)),
        ministeres: MINISTERES_APERCU,
        aujourdhui: AUJOURDHUI_APERCU,
      },
    }
  }
  return <VueSessions titre={TEXTES_SESSIONS.titre} donnees={etat} actions={actions} />
}
