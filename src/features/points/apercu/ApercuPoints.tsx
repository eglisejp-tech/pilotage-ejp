import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { lireProfilApercu } from '@/features/navigation/apercu/exemples'
import { titrePour, trouverAdresse } from '@/features/navigation/profils'
import {
  COMMUNICATION,
  LECTURES_EXEMPLE_POINTS,
  lecturesDuMinistere,
  lecturesSansPoint,
} from '@/features/points/apercu/exemplesPoints'
import { ChargementPoints } from '@/features/points/ChargementPoints'
import { construirePoints } from '@/features/points/construirePoints'
import { ErreurPoints } from '@/features/points/ErreurPoints'
import type { ProfilPoints } from '@/features/points/textesPoints'
import { VuePoints } from '@/features/points/VuePoints'
import { PageNonDisponible } from '@/pages/PageNonDisponible'

const ETATS = ['liste', 'vide', 'chargement', 'erreur'] as const
type EtatApercu = (typeof ETATS)[number]

const reessayer = () => undefined

function lireEtat(valeur: string | null): EtatApercu {
  return ETATS.find((etat) => etat === valeur) ?? 'liste'
}

/**
 * Aperçu de développement de l'écran 05 et de « Mes points » (lot P3), sans base ni requête : les
 * vrais composants, nourris des points d'exemple de `exemplesPoints.ts` et construits par
 * `construirePoints`, comme dans la page. Adresse : /apercu/points. `?profil=` choisit le lecteur
 * (berger par défaut ; `conseil` ; `ministere` voit « Mes points » de Communication, sans filtre ;
 * `admin_plateforme` lit sans aucun bouton ; l'administration reçoit la page non disponible),
 * `?vue=ouverts|traites|tous` et `?ministere=<identifiant>` comme l'adresse réelle, `?etat=` :
 * `liste` (par défaut), `vide` (premier usage), `chargement`, `erreur`. Enregistrée seulement en
 * développement (src/app/routes.tsx).
 */
export function ApercuPoints() {
  const [parametres] = useSearchParams()
  const profilDemande = lireProfilApercu(parametres.get('profil'))
  const etat = lireEtat(parametres.get('etat'))
  const ministereDemande = parametres.get('ministere')
  const profil: ProfilPoints | null = profilDemande === 'admin_eglise' ? null : profilDemande

  const donnees = useMemo(() => {
    if (profil === null) return null
    const exemple =
      etat === 'vide' ? lecturesSansPoint(LECTURES_EXEMPLE_POINTS) : LECTURES_EXEMPLE_POINTS
    const lectures = profil === 'ministere' ? lecturesDuMinistere(exemple, COMMUNICATION) : exemple
    return construirePoints(lectures, profil, ministereDemande)
  }, [profil, etat, ministereDemande])

  // L'administration de l'église ne lit aucun point (plan 3.1) : la page non disponible.
  const adresse = trouverAdresse('/points')
  if (profil === null || donnees === null || adresse === null) return <PageNonDisponible />
  const titre = titrePour(adresse, profil)

  if (etat === 'chargement') return <ChargementPoints titre={titre} profil={profil} />
  if (etat === 'erreur') return <ErreurPoints titre={titre} onReessayer={reessayer} />
  return (
    <VuePoints
      titre={titre}
      profil={profil}
      donnees={donnees}
      compte={{ type: profil, ministereId: profil === 'ministere' ? COMMUNICATION : null }}
    />
  )
}
