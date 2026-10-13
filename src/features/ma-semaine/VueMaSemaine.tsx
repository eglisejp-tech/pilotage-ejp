import { BlocVosPoints } from '@/features/accueil-ministere/BlocVosPoints'
import { BlocVosSaisies } from '@/features/accueil-ministere/BlocVosSaisies'
import { OuvertureMinistere } from '@/features/accueil-ministere/OuvertureMinistere'
import { ChiffresDeLaSemaine } from './ChiffresDeLaSemaine'
import { DansLEglise } from './DansLEglise'
import type { DonneesMaSemaine } from './types'

interface Props {
  donnees: DonneesMaSemaine
}

// Colonne de droite à partir de 1024 px (380 px à partir de 1280 px), comme « Cette semaine ».
const colonnes =
  'grid items-start gap-9 min-[600px]:gap-11 lg:grid-cols-[minmax(0,1fr)_18.75rem] lg:gap-x-10 xl:grid-cols-[minmax(0,1fr)_23.75rem] xl:gap-x-16'
const colonne = 'flex min-w-0 flex-col gap-9 min-[600px]:gap-11 lg:gap-13'

/**
 * « Ma semaine » d'un ministère (maquette 07, décision T57). L'ouverture de 07 sur toute la
 * largeur, puis « Vos saisies » et « Vos chiffres de la semaine » à gauche, « Vos points » et
 * « Dans l'église » à droite. Sur téléphone et tablette, une seule colonne dans cet ordre : saisies,
 * chiffres, points, église. Aucun bloc du berger : ni session détaillée par ministère, ni tableau
 * des ministères, ni carte des FIJ (sauf pour le ministère FIJ, dans ses chiffres).
 */
export function VueMaSemaine({ donnees }: Props) {
  const { accueil } = donnees
  return (
    <div className="flex flex-col gap-9 min-[600px]:gap-11 lg:gap-13">
      <OuvertureMinistere semaine={donnees.semaine} ouverture={accueil.ouverture} />
      <div className={colonnes}>
        <div className={colonne}>
          <BlocVosSaisies lignes={accueil.vosSaisies} />
          <ChiffresDeLaSemaine lignes={donnees.chiffres} fij={donnees.fij} />
        </div>
        <div className={colonne}>
          <BlocVosPoints
            bloc={accueil.vosPoints}
            compte={{ type: 'ministere', ministereId: accueil.ministereId }}
          />
          <DansLEglise lignes={donnees.eglise} />
        </div>
      </div>
    </div>
  )
}
