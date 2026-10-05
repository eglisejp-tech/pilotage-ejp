import { ADecider } from './ADecider'
import { BlocSession } from './BlocSession'
import { CarteFij } from './CarteFij'
import { ChiffresEglise } from './ChiffresEglise'
import { LesMinisteres } from './LesMinisteres'
import { OuvertureSemaine } from './OuvertureSemaine'
import type { DonneesCetteSemaine } from './types'
import { useLargeurMin } from './useLargeurMin'

interface Props {
  donnees: DonneesCetteSemaine
}

// Colonne de droite : « À décider » et la carte des FIJ (380 px à partir de 1280 px). Sans
// « À décider », les chiffres gardent la colonne de gauche, alignés sur la session.
const deuxColonnes =
  'lg:grid-cols-[minmax(0,1fr)_18.75rem] lg:gap-x-10 xl:grid-cols-[minmax(0,1fr)_23.75rem] xl:gap-x-16'

/**
 * Vue de l'église « Cette semaine » (maquettes 01, 02, 03), selon le profil (BRIEF, section 9) :
 * - berger et conseil : phrase surlignée, « À décider », colonnes « Prochaine réunion » et
 *   « Point ouvert » ;
 * - ministère et administration de l'église : ni « À décider », ni surligneur, ni ces colonnes.
 * Ordre de lecture identique à toutes les tailles : la phrase, les chiffres, « À décider », la
 * session, les départements, les ministères. Sur téléphone, « À décider » remonte juste après
 * la phrase quand un point ouvert est urgent.
 */
export function VueCetteSemaine({ donnees }: Props) {
  const decision =
    donnees.profil === 'berger' || donnees.profil === 'conseil' ? donnees.aDecider : null
  const telephone = !useLargeurMin(600)
  const aDeciderEnTete = decision !== null && telephone && decision.urgent

  const aDecider = decision ? (
    <ADecider points={decision.points} lienTousLesPoints={decision.lienTousLesPoints} />
  ) : null

  return (
    <div className="flex flex-col gap-9 min-[600px]:gap-11 lg:gap-13">
      <OuvertureSemaine
        semaine={donnees.semaine}
        phrase={donnees.phrase}
        ligneSecondaire={donnees.ligneSecondaire}
        surligner={decision !== null}
      />
      {aDeciderEnTete ? aDecider : null}
      <div className={`grid items-start gap-9 min-[600px]:gap-11 ${deuxColonnes}`}>
        <ChiffresEglise
          titre={
            donnees.profil === 'ministere' ? "L'église cette semaine" : "Les chiffres de l'église"
          }
          lignes={donnees.chiffres}
          note={donnees.noteChiffres}
        />
        {aDeciderEnTete ? null : aDecider}
      </div>
      <div
        className={`grid items-start gap-9 min-[600px]:gap-11 md:grid-cols-[minmax(0,1fr)_17.5rem] md:gap-x-10 ${deuxColonnes}`}
      >
        {/* TODO lot B : état « aucune_session_du_type » (TEXTES_VIDES.session.aucuneSessionDuType). */}
        <BlocSession
          session={donnees.session.etat === 'session' ? donnees.session.session : null}
        />
        <CarteFij carte={donnees.carte} />
      </div>
      <LesMinisteres ministeres={donnees.ministeres} avecColonnesConseil={decision !== null} />
    </div>
  )
}
