import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { StatutChoisi } from '@/data/pointsEcriture'
import { ActionsPoint } from '@/features/points-actions/ActionsPoint'
import type { CompteDesActions, PointDesActions } from '@/features/points-actions/ActionsPoint'
import { ContexteEcrituresPoint } from '@/features/points-actions/ecritures'
import type { EcrituresPoint } from '@/features/points-actions/ecritures'
import { lireProfilApercu } from '@/features/navigation/apercu/exemples'
import type { StatutPoint } from '@/lib/base'
import { LIBELLE_STATUT } from '@/lib/metier/points'

// Aperçu de développement des boutons d'un point (lot P1) : un point d'exemple et le vrai composant
// `ActionsPoint`, sans base. Les écritures sont simulées (un contexte les remplace) et le point
// d'exemple suit le résultat, comme la page le ferait après sa relecture : « Marquer traité »
// retire les boutons, « Changer le statut » change le statut affiché. Adresse :
// /apercu/points-actions.
// - `profil=ministere` (par défaut), `berger`, `conseil`, `admin_eglise`, `admin_plateforme` ;
// - `lien=createur` (par défaut), `mentionne` ou `aucun` : le lien d'un ministère avec le point ;
// - `statut=a_traiter` (par défaut), `en_cours`, `attente_decision` ou `traite` ;
// - `titre=masque` : le titre du point est masqué par EJP Tech ;
// - `envoi=echec` : connexion perdue à l'envoi ; `envoi=refus` : la base refuse (point déjà traité).

const COMMUNICATION = '10000000-0000-4000-8000-000000000001'
const INTEGRATION = '10000000-0000-4000-8000-000000000005'
const JEUNESSE = '10000000-0000-4000-8000-000000000004'
const POINT_EXEMPLE = '30000000-0000-4000-8000-000000000001'

const STATUTS: readonly StatutPoint[] = ['a_traiter', 'en_cours', 'attente_decision', 'traite']

function lireStatut(valeur: string | null): StatutPoint {
  return STATUTS.find((statut) => statut === valeur) ?? 'a_traiter'
}

function lireCompte(parametres: URLSearchParams): CompteDesActions {
  const type = lireProfilApercu(parametres.get('profil') ?? 'ministere')
  if (type !== 'ministere') return { type, ministereId: null }
  const lien = parametres.get('lien')
  if (lien === 'mentionne') return { type, ministereId: INTEGRATION }
  if (lien === 'aucun') return { type, ministereId: JEUNESSE }
  return { type, ministereId: COMMUNICATION }
}

const attendre = () => new Promise<void>((fini) => window.setTimeout(fini, 300))

export function ApercuActionsPoint() {
  const [parametres] = useSearchParams()
  const compte = lireCompte(parametres)
  const echec = parametres.get('envoi') === 'echec'
  const refus = parametres.get('envoi') === 'refus'
  const masque = parametres.get('titre') === 'masque'
  const [statut, setStatut] = useState<StatutPoint>(lireStatut(parametres.get('statut')))
  const [clientRequetes] = useState(() => new QueryClient())

  const ecritures = useMemo<EcrituresPoint>(() => {
    const simuler = async () => {
      await attendre()
      // La forme réelle d'une connexion perdue avec supabase-js : une erreur à `code` vide.
      if (echec) throw { message: 'FetchError: Failed to fetch', details: '', hint: '', code: '' }
      if (refus) throw { code: 'P0001', message: 'Ce point est déjà traité.' }
    }
    return {
      changerStatut: async (_pointId: string, choisi: StatutChoisi) => {
        await simuler()
        setStatut(choisi)
      },
      marquerTraite: async () => {
        await simuler()
        setStatut('traite')
      },
    }
  }, [echec, refus])

  const point: PointDesActions = {
    id: POINT_EXEMPLE,
    titre: {
      texte: masque ? '[texte masqué par EJP Tech]' : 'Salle pour la soirée de louange',
      masque,
    },
    statut,
    ministereId: COMMUNICATION,
    mentions: [INTEGRATION],
  }

  return (
    <QueryClientProvider client={clientRequetes}>
      <ContexteEcrituresPoint value={ecritures}>
        <section aria-labelledby="apercu-titre" data-repli-focus className="flex flex-col gap-5">
          <h1 id="apercu-titre" className="font-lecture text-[32px] leading-[1.1] font-medium">
            Points d'attention
          </h1>
          <article className="flex flex-col gap-3 border-t border-filet py-4">
            <h2 className="font-lecture text-[22px] leading-tight font-medium">
              {point.titre.texte}
            </h2>
            <p className="text-encre-2">{LIBELLE_STATUT[statut]}</p>
            <p className="text-sm text-encre-3">Communication, mentions : Intégration</p>
            <ActionsPoint point={point} compte={compte} />
          </article>
        </section>
      </ContexteEcrituresPoint>
    </QueryClientProvider>
  )
}
