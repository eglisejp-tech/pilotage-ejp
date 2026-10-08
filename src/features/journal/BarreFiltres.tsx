import { ChampListe } from '@/features/journal/ChampListe'
import type { FiltresJournal } from '@/features/journal/filtres'
import { estCodeAction } from '@/features/journal/libellesActions'
import type { DonneesJournal } from '@/features/journal/modeleJournal'
import { estPeriode, LIBELLES_PERIODES, PERIODES } from '@/features/journal/periodes'
import { TEXTES_JOURNAL } from '@/features/journal/textesJournal'

interface Props {
  donnees: Pick<DonneesJournal, 'filtres' | 'comptes' | 'actions' | 'ministereChoisi'>
  surFiltres: (suivants: FiltresJournal) => void
}

const classeLien =
  'inline-flex min-h-cible items-center text-sm text-nuit underline underline-offset-4'

/**
 * Les filtres de l'écran 06 (maquette 06) : Compte, Action et Période, puis, quand l'adresse
 * nomme un ministère, « Ministère : Communication » avec « Retirer le filtre ». Un ministère n'a
 * pas le filtre « Compte » : la base ne lui rend déjà que son ministère et son compte.
 */
export function BarreFiltres({ donnees, surFiltres }: Props) {
  const { filtres, comptes, actions, ministereChoisi } = donnees
  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-label={TEXTES_JOURNAL.filtres.groupe}
        className="flex flex-wrap items-end gap-4"
      >
        {comptes !== null ? (
          <ChampListe
            libelle={TEXTES_JOURNAL.filtres.compte}
            valeur={filtres.compte ?? ''}
            surChoix={(valeur) => surFiltres({ ...filtres, compte: valeur === '' ? null : valeur })}
          >
            <option value="">{TEXTES_JOURNAL.filtres.tousLesComptes}</option>
            {comptes.map((compte) => (
              <option key={compte.id} value={compte.id}>
                {compte.libelle}
              </option>
            ))}
          </ChampListe>
        ) : null}
        <ChampListe
          libelle={TEXTES_JOURNAL.filtres.action}
          valeur={filtres.action ?? ''}
          surChoix={(valeur) =>
            surFiltres({ ...filtres, action: estCodeAction(valeur) ? valeur : null })
          }
        >
          <option value="">{TEXTES_JOURNAL.filtres.toutesLesActions}</option>
          {actions.map((action) => (
            <option key={action.code} value={action.code}>
              {action.libelle}
            </option>
          ))}
        </ChampListe>
        <ChampListe
          libelle={TEXTES_JOURNAL.filtres.periode}
          valeur={filtres.periode}
          surChoix={(valeur) =>
            surFiltres({ ...filtres, periode: estPeriode(valeur) ? valeur : filtres.periode })
          }
        >
          {PERIODES.map((periode) => (
            <option key={periode} value={periode}>
              {LIBELLES_PERIODES[periode]}
            </option>
          ))}
        </ChampListe>
      </div>
      {ministereChoisi !== null ? (
        <p className="flex flex-wrap items-center gap-x-4 text-[15px]">
          <span className="font-semibold">
            {TEXTES_JOURNAL.filtres.ministere(ministereChoisi.nom)}
          </span>
          <button
            type="button"
            onClick={() => surFiltres({ ...filtres, ministere: null })}
            className={classeLien}
          >
            {TEXTES_JOURNAL.filtres.retirerMinistere}
          </button>
        </p>
      ) : null}
    </div>
  )
}
