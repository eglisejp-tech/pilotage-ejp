import { Link } from 'react-router'
import { adresseSaisieMois } from '@/features/saisie-chiffres/choixPeriode'
import type { MoisAChoisir } from '@/features/saisie-chiffres/choixPeriode'
import { ListePeriodes } from '@/features/saisie-chiffres/ListePeriodes'
import { TEXTES_CHIFFRES } from '@/features/saisie-chiffres/textes'
import type { Mois } from '@/lib/metier/periodes'
import { cn } from '@/lib/utils'

interface Props {
  /** Mois affiché par le formulaire. */
  mois: Mois
  /** Le mois en cours et les deux précédents (P45 : sensibles compris). */
  proposes: readonly MoisAChoisir[]
  /** Tous les mois permis, jusqu'au 1er janvier de l'année précédente. */
  rattrapage: readonly MoisAChoisir[]
}

/**
 * Choix du mois de « Chiffres du mois » : le libellé « Mois », les trois mois proposés, puis
 * « Choisir un autre mois » pour un rattrapage. Pour le mois en cours, l'indication visible dit de
 * saisir le total à ce jour (T66, t083 et t084 : l'ancienne bulle `mois.periode`). Changer de mois
 * ouvre la saisie de ce mois (`/saisir/mois?mois=AAAA-MM`).
 */
export function ChoixMois({ mois, proposes, rattrapage }: Props) {
  const enCours = [...proposes, ...rattrapage].some(
    (candidat) => candidat.mois === mois && candidat.enCours,
  )
  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-cible flex-wrap items-center">
        <p className="text-[15px] font-semibold">{TEXTES_CHIFFRES.libelleMois}</p>
      </div>
      <nav aria-label="Mois proposés">
        <ul className="grid grid-cols-1 gap-2 min-[600px]:grid-cols-3">
          {proposes.map((propose) => (
            <li key={propose.mois}>
              <Link
                to={adresseSaisieMois(propose.mois)}
                replace
                aria-current={propose.mois === mois ? 'page' : undefined}
                className={cn(
                  'flex h-full min-h-cible items-center justify-center border px-3 py-2 text-center text-sm font-semibold',
                  propose.mois === mois
                    ? 'border-encre bg-encre text-papier'
                    : 'border-encre bg-papier text-encre hover:bg-fond',
                )}
              >
                {propose.libelle}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {enCours ? (
        <p className="text-sm leading-normal text-encre-3">
          {TEXTES_CHIFFRES.indicationMoisEnCours}
        </p>
      ) : null}
      <ListePeriodes
        libelle={TEXTES_CHIFFRES.autreMois}
        periodes={rattrapage.map((autre) => ({
          cle: autre.mois,
          libelle: autre.libelle,
          vers: adresseSaisieMois(autre.mois),
          courante: autre.mois === mois,
        }))}
      />
    </div>
  )
}
