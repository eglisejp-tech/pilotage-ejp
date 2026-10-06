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

interface Props {
  donnees: DonneesFiche
  points: PointFiche[]
  dernieresSaisies: EtatBloc<DerniereSaisieFiche[]>
  /**
   * Pose les emplacements de W0 (réunion et calendrier de E6, chiffres par département de E4,
   * comptages et graphiques du lot de lecture), qui lisent leurs propres données. Faux dans
   * l'aperçu, qui ne fait aucune requête.
   */
  avecEmplacements?: boolean
}

/** « Tout le journal » : Mon journal (ministère), le journal filtré (berger, conseil, EJP Tech). */
function lienJournal(profil: ProfilFiche, ministereId: string): string {
  if (profil === 'ministere') return '/journal'
  const adresse = profil === 'admin_plateforme' ? '/journal-technique' : '/journal'
  return `${adresse}?ministere=${ministereId}`
}

/**
 * Fiche d'un ministère (maquettes 04 et 12) : ouverture, puis deux colonnes à partir de 1280 px
 * (les chiffres, le bloc FIJ et le calendrier à gauche ; les points et les dernières saisies à
 * droite), une seule colonne en dessous. Le ministère lit la sienne avec ses boutons de saisie ; le
 * berger, le conseil et EJP Tech la lisent, EJP Tech sans aucun bouton (T29).
 */
export function VueFiche({ donnees, points, dernieresSaisies, avecEmplacements = true }: Props) {
  const emplacement = {
    ministereId: donnees.ministere.id,
    ministereCode: donnees.ministere.code,
    profil: donnees.profil,
  }
  return (
    <div className="flex flex-col gap-12">
      <EnTeteFiche
        donnees={donnees}
        reunion={
          avecEmplacements ? <EmplacementDeFiche emplacement="reunion" {...emplacement} /> : null
        }
      />
      <div className="grid items-start gap-12 xl:grid-cols-[minmax(0,1fr)_23.75rem] xl:gap-x-16">
        <div className="flex min-w-0 flex-col gap-12">
          <ChiffresDuMinistere donnees={donnees} />
          {avecEmplacements ? (
            <>
              <EmplacementDeFiche emplacement="statistiquesFij" {...emplacement} />
              <EmplacementDeFiche emplacement="calendrier" {...emplacement} />
              <EmplacementDeFiche emplacement="comptages" {...emplacement} />
              <EmplacementDeFiche emplacement="graphiques" {...emplacement} />
            </>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-12">
          <BlocPointsFiche
            points={points}
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
