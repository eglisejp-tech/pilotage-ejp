import { ADecider } from './ADecider'
import { BlocSession } from './BlocSession'
import { CarteFij } from './CarteFij'
import { ChiffresEglise } from './ChiffresEglise'
import { GrilleCetteSemaine } from './GrilleCetteSemaine'
import { LesMinisteres } from './LesMinisteres'
import { OuvertureSemaine } from './OuvertureSemaine'
import { ResumeEglise } from './ResumeEglise'
import type { DonneesCetteSemaine } from './types'
import { useLargeurMin } from './useLargeurMin'

interface Props {
  donnees: DonneesCetteSemaine
}

/**
 * Vue de l'église « Cette semaine » (maquettes 01, 02, 03), selon le profil (BRIEF, section 9) :
 * - berger et conseil : phrase surlignée, « À décider », colonnes « Prochaine réunion » et
 *   « Point ouvert » ;
 * - EJP Tech : le même contenu, en lecture seule, sans aucun bouton d'action (T29) ;
 * - ministère et administration de l'église : ni « À décider », ni surligneur, ni ces colonnes ;
 * - ministère sous 600 px : trois chiffres et « Tout voir », qui déplie le reste sur place.
 * Sur téléphone, « À décider » remonte juste après la phrase quand un point ouvert est urgent.
 */
export function VueCetteSemaine({ donnees }: Props) {
  const decision = 'aDecider' in donnees ? donnees.aDecider : null
  const telephone = !useLargeurMin(600)

  const ouverture = (
    <OuvertureSemaine
      semaine={donnees.semaine}
      phrase={donnees.phrase}
      ligneSecondaire={donnees.ligneSecondaire}
      surligner={decision !== null}
    />
  )
  const session = <BlocSession bloc={donnees.session} />
  const carte = <CarteFij carte={donnees.carte} />
  const ministeres = (
    <LesMinisteres ministeres={donnees.ministeres} avecColonnesConseil={decision !== null} />
  )

  if (donnees.profil === 'ministere' && telephone) {
    return (
      <div className="flex flex-col gap-9">
        {ouverture}
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
    />
  )
}
