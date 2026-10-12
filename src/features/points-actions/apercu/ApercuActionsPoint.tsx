import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { MinistereListe } from '@/data/ministeres'
import { MESSAGES_POINT } from '@/data/pointsEcriture'
import type { StatutChoisi } from '@/data/pointsEcriture'
import { ActionsPoint } from '@/features/points-actions/ActionsPoint'
import type { CompteDesActions, PointDesActions } from '@/features/points-actions/ActionsPoint'
import { ContexteEcrituresPoint } from '@/features/points-actions/ecritures'
import type { EcrituresPoint } from '@/features/points-actions/ecritures'
import { MINISTERES_EXEMPLE } from '@/features/evenements/apercu/exemples'
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
// - `envoi=echec` : connexion perdue à l'envoi ; `envoi=refus` : la base refuse (point déjà traité) ;
// - `mentions=desactive` : un ministère désactivé reste mentionné (il se retire, il ne s'ajoute plus) ;
//   `mentions=aucune` : le point ne mentionne personne ; `ministeres=probleme` : la lecture des
//   ministères échoue, `ministeres=lent` : elle est lente (état de chargement).

const COMMUNICATION = '10000000-0000-4000-8000-000000000001'
const INTEGRATION = '10000000-0000-4000-8000-000000000005'
const JEUNESSE = '10000000-0000-4000-8000-000000000004'
const POINT_EXEMPLE = '30000000-0000-4000-8000-000000000001'
const ACCUEIL_DESACTIVE = '10000000-0000-4000-8000-000000000009'

/** Les ministères de l'aperçu : Communication, ceux de l'aperçu des événements, et un désactivé. */
const MINISTERES: MinistereListe[] = [
  { id: COMMUNICATION, code: null, nom: 'Communication', desactive_le: null },
  ...MINISTERES_EXEMPLE.map(({ id, nom }) => ({ id, code: null, nom, desactive_le: null })),
  {
    id: ACCUEIL_DESACTIVE,
    code: null,
    nom: 'Accueil',
    desactive_le: '2026-09-01T10:00:00+00:00',
  },
]

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
  const reglageMentions = parametres.get('mentions')
  const reglageMinisteres = parametres.get('ministeres')
  const [mentions, setMentions] = useState<string[]>(
    reglageMentions === 'aucune'
      ? []
      : reglageMentions === 'desactive'
        ? [INTEGRATION, ACCUEIL_DESACTIVE]
        : [INTEGRATION],
  )
  const [clientRequetes] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  )

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
      modifierMentions: async (_pointId: string, voulues: string[]) => {
        await attendre()
        if (echec) throw { message: 'FetchError: Failed to fetch', details: '', hint: '', code: '' }
        if (refus) throw { code: 'P0001', message: MESSAGES_POINT.refus.pointTraiteMentions }
        setMentions(voulues)
      },
      lireMinisteres: async () => {
        await new Promise<void>((fini) =>
          window.setTimeout(fini, reglageMinisteres === 'lent' ? 4000 : 50),
        )
        if (reglageMinisteres === 'probleme') throw new Error('Failed to fetch')
        return MINISTERES
      },
    }
  }, [echec, refus, reglageMinisteres])

  const point: PointDesActions = {
    id: POINT_EXEMPLE,
    titre: {
      texte: masque ? '[texte masqué par EJP Tech]' : 'Salle pour la soirée de louange',
      masque,
    },
    statut,
    ministereId: COMMUNICATION,
    mentions,
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
            <p className="text-sm text-encre-3">
              Communication, mentions :{' '}
              {mentions.length === 0
                ? 'aucune'
                : mentions
                    .map((id) => MINISTERES.find((m) => m.id === id)?.nom ?? id)
                    .sort((x, y) => x.localeCompare(y, 'fr'))
                    .join(', ')}
            </p>
            <ActionsPoint point={point} compte={compte} />
          </article>
        </section>
      </ContexteEcrituresPoint>
    </QueryClientProvider>
  )
}
