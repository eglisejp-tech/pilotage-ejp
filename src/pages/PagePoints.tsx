import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import { ChargementPoints } from '@/features/points/ChargementPoints'
import { TEXTES_POINTS } from '@/features/points/textesPoints'
import type { ProfilPoints } from '@/features/points/textesPoints'
import { usePoints } from '@/features/points/usePoints'
import { VuePoints } from '@/features/points/VuePoints'
import type { CompteDesActions } from '@/features/points-actions/ActionsPoint'
import { useCompteConnecte } from '@/features/session/contexte'
import type { TypeCompte } from '@/lib/base'
import { ErreurDePage } from '@/pages/ErreurDePage'
import { PageNonDisponible } from '@/pages/PageNonDisponible'
import type { ProprietesPage } from '@/pages/proprietesPage'

/** Profils qui lisent les points ; l'administration de l'église n'en lit aucun (BRIEF, section 7). */
function profilPoints(type: TypeCompte): ProfilPoints | null {
  return type === 'admin_eglise' ? null : type
}

type ProprietesLue = {
  titre: string
  profil: ProfilPoints
  compte: CompteDesActions
}

function PagePointsLue({ titre, profil, compte }: ProprietesLue) {
  useTitrePage(titre)
  const [parametres] = useSearchParams()
  const resultat = usePoints(profil, parametres.get('ministere'))

  if (resultat.etat === 'erreur') {
    return (
      <>
        <h1 className="sr-only">{titre}</h1>
        <ErreurDePage
          message={TEXTES_POINTS.erreur}
          libelleBouton={TEXTES_POINTS.reessayer}
          onReessayer={resultat.reessayer}
        />
      </>
    )
  }
  if (resultat.etat === 'pret') {
    return <VuePoints titre={titre} profil={profil} donnees={resultat.donnees} compte={compte} />
  }
  return <ChargementPoints titre={titre} profil={profil} />
}

/**
 * Écran 05 « Points d'attention » (berger, conseil, EJP Tech en lecture seule) et « Mes points »
 * (ministère), sur `/points` (BRIEF, section 9). L'administration de l'église reçoit la page non
 * disponible, sans aucune lecture. Trois états : le chargement (titre tout de suite, « Chargement »
 * après 300 ms), l'erreur de page avec « Réessayer » (échec ou 10 s sans réponse), puis la vue.
 * Titre de l'onglet : « Points d'attention, Pilotage EJP » ou « Mes points, Pilotage EJP ».
 */
export function PagePoints({ titre }: ProprietesPage) {
  const compte = useCompteConnecte()
  const profil = profilPoints(compte.type)
  const pourLesBoutons = useMemo<CompteDesActions>(
    () => ({ type: compte.type, ministereId: compte.ministereId }),
    [compte.type, compte.ministereId],
  )
  if (profil === null) return <PageNonDisponible />
  return <PagePointsLue titre={titre} profil={profil} compte={pourLesBoutons} />
}
