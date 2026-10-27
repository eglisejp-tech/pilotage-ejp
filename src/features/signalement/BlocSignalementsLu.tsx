import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { masquerTexte } from '@/data/moderation'
import {
  cloreSignalement,
  lireSignalementsATraiter,
  lireSuiviDesSignalements,
  prendreEnCharge,
  repondreAuMinistere,
} from '@/data/signalements'
import { enEchec } from '@/features/evenements/lectures'
import { ContenuBlocSignalements } from '@/features/signalement/ContenuBlocSignalements'
import type { ContenuBloc } from '@/features/signalement/ContenuBlocSignalements'
import type { GestesEjpTech } from '@/features/signalement/LigneSignalementBloc'
import type { Masquage } from '@/features/moderation/schemas'
import { useRelireApresGeste } from '@/features/signalement/useRelireApresGeste'

/** Clé de la lecture du bloc, relue après chaque geste. */
const CLE_SIGNALEMENTS_A_TRAITER = ['signalements', 'a-traiter'] as const

/**
 * Lecture du bloc « Signalements » pour EJP Tech : `v_signalement`, ouverts et clos des 30
 * derniers jours (filtres de la base), puis leurs lignes de suivi. Un geste (prendre en charge,
 * répondre, clore, masquer) passe par sa fonction de la base, puis la liste est relue avant
 * d'annoncer la réussite (T77).
 */
export function BlocSignalementsLu() {
  const relire = useRelireApresGeste()
  const lecture = useQuery({
    queryKey: CLE_SIGNALEMENTS_A_TRAITER,
    queryFn: lireSignalementsATraiter,
  })
  const ids = (lecture.data ?? []).map((ligne) => ligne.id)
  const suivi = useQuery({
    queryKey: ['signalements', 'suivi', ...ids],
    queryFn: () => lireSuiviDesSignalements(ids),
    enabled: lecture.isSuccess,
    // Un signalement de plus dans la liste ne fait pas revenir le chargement.
    placeholderData: keepPreviousData,
  })

  const gestes: GestesEjpTech = {
    prendre: async (id) => {
      await prendreEnCharge(id)
      await relire()
    },
    repondre: async (reponse) => {
      await repondreAuMinistere(reponse)
      await relire()
    },
    clore: async (cloture) => {
      await cloreSignalement(cloture)
      await relire()
    },
  }

  // « Masquer » : `masquer_texte`, puis la liste est relue (le texte masqué s'affiche en
  // `--encre-3`, ici comme sur la fiche du ministère).
  const masquer = async (masquage: Masquage) => {
    try {
      await masquerTexte(masquage)
    } finally {
      await relire()
    }
  }
  const reessayer = () => {
    void lecture.refetch()
    if (lecture.isSuccess) void suivi.refetch()
  }

  let contenu: ContenuBloc
  if (lecture.data && suivi.data) {
    contenu = {
      etat: 'liste',
      signalements: lecture.data,
      suivi: suivi.data,
      gestes,
      relire: () => void relire(),
      masquer,
    }
  } else if (enEchec([lecture, suivi])) {
    contenu = { etat: 'probleme', reessayer }
  } else {
    contenu = { etat: 'chargement' }
  }
  return <ContenuBlocSignalements contenu={contenu} />
}
