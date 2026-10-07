import type { ActionLigne } from '@/features/comptes/actionsLigne'
import { BoutonsLigne } from '@/features/comptes/BoutonsLigne'
import { CelluleIndicateurs } from '@/features/comptes/CelluleIndicateurs'
import { EtatDoubleAuthentification } from '@/features/comptes/EtatDoubleAuthentification'
import { TEXTES_COMPTES } from '@/features/comptes/textes'
import type { LigneCompte } from '@/features/comptes/types'

interface Props {
  lignes: LigneCompte[]
  idTitre: string
  onAction: (ligne: LigneCompte, action: ActionLigne) => void
  enCours: { cle: string; action: ActionLigne } | null
}

/**
 * Une section de l'écran 13 sous 600 px (BRIEF, section 9) : chaque compte devient un bloc (nom,
 * email, indicateurs pour un ministère, état), puis ses boutons en pleine largeur, l'un sous
 * l'autre.
 */
export function ListeComptesTelephone({ lignes, idTitre, onAction, enCours }: Props) {
  return (
    <ul aria-labelledby={idTitre}>
      {lignes.map((ligne) => (
        <li
          key={ligne.cle}
          className="flex flex-col gap-1.5 border-t border-filet py-4 text-[15px] first:border-t-0"
        >
          <span className="font-semibold">{ligne.nom}</span>
          <span className="break-all text-encre-2">
            {ligne.email ?? TEXTES_COMPTES.pasDeCompte}
          </span>
          {ligne.indicateurs !== null ? (
            <span className="text-encre-2">
              {TEXTES_COMPTES.colonneIndicateurs} : <CelluleIndicateurs ligne={ligne} />
            </span>
          ) : null}
          <EtatDoubleAuthentification etat={ligne.etat} desactiveLe={ligne.desactiveLe} />
          <div className="mt-1.5">
            <BoutonsLigne
              ligne={ligne}
              onAction={onAction}
              enCours={enCours?.cle === ligne.cle ? enCours.action : null}
              pleineLargeur
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
