import type { FunctionComponent } from 'react'
import { Link } from 'react-router'
import { usePanneaux } from '@/features/indicateurs/configuration/panneaux/contexte'
import { TEXTES_PANNEAUX } from '@/features/indicateurs/configuration/panneaux/textes'
import type { TypeCompte } from '@/lib/base'

export interface ProprietesActionsMinistere {
  ministereId: string
  ministereNom: string
  /**
   * Profil qui lit l'écran : l'administration de l'église (`admin_eglise`) ou EJP Tech
   * (`admin_plateforme`). EJP Tech y a en plus le lien « Voir la fiche » (valeurs, T29).
   */
  profil: TypeCompte
}

const classeBouton =
  'inline-flex min-h-13 w-full items-center justify-center border border-encre px-4.5 text-[15px] font-semibold text-encre min-[600px]:w-auto'

/**
 * Actions du ministère, sous sa phrase (7.2) : « Ajouter un indicateur » et « Ajouter un calcul »
 * (panneaux de 460 px) et, pour EJP Tech seulement, « Voir la fiche » (les valeurs, en lecture :
 * T29). Elles sont là même pour un ministère sans indicateur (Protocole). Sans écriture (écran en
 * lecture seule), les deux ajouts n'existent pas.
 */
export const ActionsMinistere: FunctionComponent<ProprietesActionsMinistere> = ({
  ministereId,
  profil,
}) => {
  const controleur = usePanneaux()
  const voirFiche = profil === 'admin_plateforme'
  if (controleur === null && !voirFiche) return null
  return (
    <div className="mt-4 flex flex-col gap-3 min-[600px]:flex-row min-[600px]:flex-wrap">
      {controleur !== null ? (
        <>
          <button
            type="button"
            onClick={() => controleur.ouvrir({ genre: 'ajout' })}
            className={`${classeBouton} bg-lumiere`}
          >
            {TEXTES_PANNEAUX.actions.ajouterIndicateur}
          </button>
          <button
            type="button"
            onClick={() => controleur.ouvrir({ genre: 'calcul' })}
            className={`${classeBouton} bg-papier hover:bg-fond`}
          >
            {TEXTES_PANNEAUX.actions.ajouterCalcul}
          </button>
        </>
      ) : null}
      {voirFiche ? (
        <Link
          to={`/ministeres/${ministereId}`}
          className={`${classeBouton} bg-papier hover:bg-fond`}
        >
          {TEXTES_PANNEAUX.actions.voirFiche}
        </Link>
      ) : null}
    </div>
  )
}
