import { BlocVosPoints } from '@/features/accueil-ministere/BlocVosPoints'
import { BlocVosSaisies } from '@/features/accueil-ministere/BlocVosSaisies'
import { OuvertureMinistere } from '@/features/accueil-ministere/OuvertureMinistere'
import type { DonneesAccueilMinistere } from '@/features/accueil-ministere/types'
import { ADecider } from './ADecider'
import { BlocSession } from './BlocSession'
import { CarteFij } from './CarteFij'
import { ChiffresEglise } from './ChiffresEglise'
import { GrilleCetteSemaine } from './GrilleCetteSemaine'
import type { BlocsAccueil } from './GrilleCetteSemaine'
import { LesMinisteres } from './LesMinisteres'
import { OuvertureSemaine } from './OuvertureSemaine'
import { ResumeEglise } from './ResumeEglise'
import type { DonneesCetteSemaine } from './types'
import { useLargeurMin } from './useLargeurMin'

interface Props {
  donnees: DonneesCetteSemaine
  /**
   * Accueil du ministère (maquette 07, lot E7) : phrase de ce qu'il reste à faire, boutons,
   * « Vos saisies » et « Vos points ». Absent pour les autres profils et dans l'aperçu.
   */
  accueil?: DonneesAccueilMinistere
}

/**
 * Vue de l'église « Cette semaine » (maquettes 01, 02, 03, 07), selon le profil (BRIEF, section 9) :
 * - berger et conseil : phrase surlignée, « À décider », colonnes « Prochaine réunion » et
 *   « Point ouvert » ;
 * - EJP Tech : le même contenu, en lecture seule, sans aucun bouton d'action (T29) ;
 * - ministère : l'ouverture de 07 (phrase de ce qu'il reste à faire, bouton principal, « Vos
 *   saisies », « Vos points »), puis les blocs de l'église, sans « À décider » ni ces colonnes ;
 * - administration de l'église : la phrase de l'église, sans « À décider » ni surligneur ;
 * - ministère sous 600 px : trois chiffres et « Tout voir », qui déplie le reste sur place.
 * Sur téléphone, « À décider » remonte juste après la phrase quand un point ouvert est urgent.
 */
export function VueCetteSemaine({ donnees, accueil }: Props) {
  const decision = 'aDecider' in donnees ? donnees.aDecider : null
  const telephone = !useLargeurMin(600)

  const ouverture =
    donnees.profil === 'ministere' && accueil ? (
      <OuvertureMinistere semaine={donnees.semaine} ouverture={accueil.ouverture} />
    ) : (
      <OuvertureSemaine
        semaine={donnees.semaine}
        phrase={donnees.phrase}
        ligneSecondaire={donnees.ligneSecondaire}
        surligner={decision !== null}
      />
    )
  const blocsAccueil: BlocsAccueil | undefined =
    donnees.profil === 'ministere' && accueil
      ? {
          vosSaisies: <BlocVosSaisies lignes={accueil.vosSaisies} />,
          vosPoints: <BlocVosPoints bloc={accueil.vosPoints} />,
        }
      : undefined
  const session = <BlocSession bloc={donnees.session} />
  const carte = <CarteFij carte={donnees.carte} />
  const ministeres = (
    <LesMinisteres ministeres={donnees.ministeres} avecColonnesConseil={decision !== null} />
  )

  if (donnees.profil === 'ministere' && telephone) {
    return (
      <div className="flex flex-col gap-9">
        {ouverture}
        {blocsAccueil?.vosSaisies}
        {blocsAccueil?.vosPoints}
        <ResumeEglise
          resume={donnees.resume}
          chiffres={donnees.chiffres}
          note={donnees.noteChiffres}
        >
          {session}
          {carte}
          {ministeres}
        </ResumeEglise>
      </div>
    )
  }

  return (
    <GrilleCetteSemaine
      ouverture={ouverture}
      chiffres={
        <ChiffresEglise
          titre={
            donnees.profil === 'ministere' ? "L'église cette semaine" : "Les chiffres de l'église"
          }
          lignes={donnees.chiffres}
          note={donnees.noteChiffres}
        />
      }
      aDecider={
        decision ? (
          <ADecider points={decision.points} lienTousLesPoints={decision.lienTousLesPoints} />
        ) : null
      }
      aDeciderEnTete={decision !== null && telephone && decision.urgent}
      session={session}
      carte={carte}
      ministeres={ministeres}
      accueil={blocsAccueil}
    />
  )
}
