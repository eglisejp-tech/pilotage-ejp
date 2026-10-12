import type { FunctionComponent } from 'react'
import type { LigneConfiguration } from '@/features/indicateurs/configuration/lignes'
import { usePanneaux } from '@/features/indicateurs/configuration/panneaux/contexte'
import type { PanneauOuvert } from '@/features/indicateurs/configuration/panneaux/contexte'
import { nomAction, TEXTES_PANNEAUX } from '@/features/indicateurs/configuration/panneaux/textes'
import type { TypeCompte } from '@/lib/base'

export interface ProprietesActionsLigne {
  ministereId: string
  ministereNom: string
  /** La ligne de l'indicateur : l'action ouvre son panneau avec ses textes et son rythme. */
  ligne: LigneConfiguration
  profil: TypeCompte
}

const classeAction =
  'inline-flex min-h-cible items-center px-2 text-[15px] font-semibold text-encre underline underline-offset-4'

type GenreLigne = Extract<
  PanneauOuvert['genre'],
  'corriger' | 'remplacer' | 'retirer' | 'confidentialite'
>

/**
 * Actions d'une ligne d'indicateur (7.2) : « Corriger » (tant que rien n'est saisi, jamais sur une
 * suggestion), « Remplacer », « Retirer » et « Retirer pour confidentialité ». Chacune ouvre son
 * panneau ou sa fenêtre ; le nom accessible cite l'indicateur. Sans écriture (écran en lecture
 * seule), la ligne n'a aucune action.
 */
export const ActionsLigne: FunctionComponent<ProprietesActionsLigne> = ({ ligne }) => {
  const controleur = usePanneaux()
  if (controleur === null) return null
  const actions: { genre: GenreLigne; libelle: string }[] = [
    ...(ligne.corrigeable
      ? [{ genre: 'corriger' as const, libelle: TEXTES_PANNEAUX.actions.corriger }]
      : []),
    { genre: 'remplacer', libelle: TEXTES_PANNEAUX.actions.remplacer },
    { genre: 'retirer', libelle: TEXTES_PANNEAUX.actions.retirer },
    { genre: 'confidentialite', libelle: TEXTES_PANNEAUX.actions.retirerConfidentialite },
  ]
  return (
    <div className="flex flex-wrap gap-x-1 min-[600px]:justify-end">
      {actions.map((action) => (
        <button
          key={action.genre}
          type="button"
          aria-label={nomAction(action.libelle, ligne.libelle)}
          onClick={() => controleur.ouvrir({ genre: action.genre, ligne })}
          className={classeAction}
        >
          {action.libelle}
        </button>
      ))}
    </div>
  )
}
