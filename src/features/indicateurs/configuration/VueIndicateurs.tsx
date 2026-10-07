import { useId } from 'react'
import type { ReactNode } from 'react'
import { EtatVide } from '@/components/etats/EtatVide'
import { useLargeurMin } from '@/features/cette-semaine/useLargeurMin'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import { ChargementBloc } from '@/features/fiche/ChargementBloc'
import type { EtatBloc } from '@/features/fiche/modeleFiche'
import type { ConfigurationIndicateurs } from '@/features/indicateurs/configuration/construire'
import { ListeIndicateursTelephone } from '@/features/indicateurs/configuration/ListeIndicateursTelephone'
import { ResultatCreation } from '@/features/indicateurs/configuration/ResultatCreation'
import { TableauIndicateurs } from '@/features/indicateurs/configuration/TableauIndicateurs'
import { TEXTES_CONFIGURATION } from '@/features/indicateurs/configuration/textes'
import type { CreationPrevus } from '@/features/indicateurs/configuration/useCreationPrevus'
import type { TypeCompte } from '@/lib/base'
import { ErreurDePage } from '@/pages/ErreurDePage'

interface Props {
  /** « Indicateurs ». */
  titre: string
  /** Profil qui lit l'écran : `admin_eglise` ou `admin_plateforme`. */
  profil: TypeCompte
  configuration: EtatBloc<ConfigurationIndicateurs>
  creation: CreationPrevus
  /**
   * Bloc « À valider » (lot L4), sous les phrases : posé par la page, qui sait le profil. Il lit
   * ses données lui-même et ne rend rien quand rien n'attend.
   */
  blocAValider?: ReactNode
}

const textes = TEXTES_CONFIGURATION

/**
 * Écran `/indicateurs` (administration et EJP Tech ; configuration-indicateurs.md, 7.1) : la phrase
 * de l'église, le bloc « À valider », puis le tableau des ministères actifs à partir de 600 px,
 * une liste en dessous. Jamais une valeur d'indicateur. Aucun ministère : l'état vide dit où
 * les créer. Problème passager : bandeau et « Réessayer ».
 */
export function VueIndicateurs({ titre, profil, configuration, creation, blocAValider }: Props) {
  const idTitre = useId()
  const tableau = useLargeurMin(600)
  useTitrePage(titre)
  return (
    <section aria-labelledby={idTitre} className="flex flex-col">
      <h1 id={idTitre} className="font-lecture text-titre leading-tight font-medium">
        {titre}
      </h1>
      <div className="mt-2 border-t-2 border-encre" />
      {configuration.etat === 'erreur' ? (
        <div className="mt-6">
          <ErreurDePage
            message={textes.erreur}
            libelleBouton={textes.reessayer}
            onReessayer={configuration.reessayer}
          />
        </div>
      ) : null}
      {configuration.etat === 'chargement' ? <ChargementBloc /> : null}
      {configuration.etat === 'donnees' ? (
        <>
          {configuration.donnees.lignes.length === 0 ? (
            <EtatVide
              situation="premier_usage"
              action={{ libelle: textes.liste.actionMinisteres, vers: '/comptes' }}
              peutAgir={profil === 'admin_eglise'}
            >
              {textes.liste.aucunMinistere}
            </EtatVide>
          ) : (
            <div className="mt-4 max-w-prose text-encre-2">
              {configuration.donnees.phrases.map((phrase) => (
                <p key={phrase}>{phrase}</p>
              ))}
            </div>
          )}
          {blocAValider}
          <ResultatCreation creation={creation} />
          {configuration.donnees.lignes.length === 0 ? null : (
            <div className="mt-4">
              {tableau ? (
                <TableauIndicateurs
                  lignes={configuration.donnees.lignes}
                  creation={creation}
                  idTitre={idTitre}
                />
              ) : (
                <ListeIndicateursTelephone
                  lignes={configuration.donnees.lignes}
                  creation={creation}
                  idTitre={idTitre}
                />
              )}
            </div>
          )}
        </>
      ) : null}
    </section>
  )
}
