import type { ReactNode } from 'react'
import { BlocPointsFiche } from '@/features/fiche/BlocPointsFiche'
import { ChiffresDuMinistere } from '@/features/fiche/ChiffresDuMinistere'
import { DernieresSaisies } from '@/features/fiche/DernieresSaisies'
import { EmplacementDeFiche } from '@/features/fiche/emplacements'
import { EnTeteFiche } from '@/features/fiche/EnTeteFiche'
import type {
  DerniereSaisieFiche,
  DonneesFiche,
  EtatBloc,
  PointFiche,
  ProfilFiche,
} from '@/features/fiche/modeleFiche'
import type { EmplacementFiche, ProprietesEmplacementFiche } from '@/features/fiche/types'

/** Ce que la fiche pose à la place d'un emplacement de W0. */
export type RendreEmplacement = (
  emplacement: EmplacementFiche,
  fiche: ProprietesEmplacementFiche,
) => ReactNode

interface Props {
  donnees: DonneesFiche
  points: EtatBloc<PointFiche[]>
  dernieresSaisies: EtatBloc<DerniereSaisieFiche[]>
  /** Détail des sensibles en échec : « Réessayer » sous les chiffres. Absent ou null : rien. */
  reessayerDetailsSensibles?: (() => void) | null
  /**
   * Pose les emplacements de W0 (réunion et calendrier de E6, chiffres par département de E4,
   * comptages et graphiques du lot de lecture), qui lisent leurs propres données. Par défaut, les
   * vrais emplacements. L'aperçu, qui ne fait aucune requête, les remplace par des cadres visibles ;
   * les tests, par rien (`null`).
   */
  rendreEmplacement?: RendreEmplacement | null
}

/** « Tout le journal » : Mon journal (ministère), le journal filtré (berger, conseil, EJP Tech). */
function lienJournal(profil: ProfilFiche, ministereId: string): string {
  if (profil === 'ministere') return '/journal'
  const adresse = profil === 'admin_plateforme' ? '/journal-technique' : '/journal'
  return `${adresse}?ministere=${ministereId}`
}

const emplacementConnecte: RendreEmplacement = (emplacement, fiche) => (
  <EmplacementDeFiche emplacement={emplacement} {...fiche} />
)

/**
 * Fiche d'un ministère (maquettes 04 et 12) : ouverture, puis deux colonnes à partir de 1280 px
 * (les chiffres, le bloc FIJ et le calendrier à gauche ; les points et les dernières saisies à
 * droite), une seule colonne en dessous. Le ministère lit la sienne avec ses boutons de saisie ; le
 * berger, le conseil et EJP Tech la lisent, EJP Tech sans aucun bouton (T29).
 */
export function VueFiche({
  donnees,
  points,
  dernieresSaisies,
  reessayerDetailsSensibles = null,
  rendreEmplacement = emplacementConnecte,
}: Props) {
  const fiche: ProprietesEmplacementFiche = {
    ministereId: donnees.ministere.id,
    ministereCode: donnees.ministere.code,
    profil: donnees.profil,
  }
  const poser = (emplacement: EmplacementFiche): ReactNode =>
    rendreEmplacement === null ? null : rendreEmplacement(emplacement, fiche)
  return (
    <div className="flex flex-col gap-12">
      <EnTeteFiche
        donnees={donnees}
        reunion={poser('reunion')}
        nouveauPoint={poser('nouveauPoint')}
      />
      <div className="grid items-start gap-12 xl:grid-cols-[minmax(0,1fr)_23.75rem] xl:gap-x-16">
        <div className="flex min-w-0 flex-col gap-12">
          <ChiffresDuMinistere
            donnees={donnees}
            reessayerDetails={reessayerDetailsSensibles}
            gererIndicateurs={poser('gererIndicateurs')}
          />
          {poser('statistiquesFij')}
          {poser('calendrier')}
          {poser('comptages')}
          {poser('graphiques')}
        </div>
        <div className="flex min-w-0 flex-col gap-12">
          <BlocPointsFiche
            bloc={points}
            profil={donnees.profil}
            nomMinistere={donnees.ministere.nom}
          />
          <DernieresSaisies
            bloc={dernieresSaisies}
            lienJournal={lienJournal(donnees.profil, donnees.ministere.id)}
          />
        </div>
      </div>
    </div>
  )
}
