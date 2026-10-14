import type { ActionLigne } from '@/features/comptes/actionsLigne'
import { BoutonsLigne } from '@/features/comptes/BoutonsLigne'
import { CelluleIndicateurs } from '@/features/comptes/CelluleIndicateurs'
import { EtatDoubleAuthentification } from '@/features/comptes/EtatDoubleAuthentification'
import { ResultatLigne } from '@/features/comptes/ResultatLigne'
import type { ResultatAction } from '@/features/comptes/ResultatLigne'
import { TEXTES_COMPTES } from '@/features/comptes/textes'
import type { LigneCompte } from '@/features/comptes/types'

interface Props {
  lignes: LigneCompte[]
  idTitre: string
  /** Null en lecture (administration de l'église, T60) : aucun bouton. */
  onAction: ((ligne: LigneCompte, action: ActionLigne) => void) | null
  enCours: { cle: string; action: ActionLigne } | null
  /** Résultat de la dernière action de ligne, affiché sous les boutons de son bloc. */
  resultat: ResultatAction | null
  /** Compte connecté : son bloc n'a pas de bouton (T60). */
  moi?: string | null
}

/**
 * Une section de l'écran 13 sous 600 px (BRIEF, section 9) : chaque compte devient un bloc (nom,
 * email, indicateurs pour un ministère, état), puis ses boutons en pleine largeur, l'un sous
 * l'autre.
 */
export function ListeComptesTelephone({
  lignes,
  idTitre,
  onAction,
  enCours,
  resultat,
  moi,
}: Props) {
  return (
    <ul aria-labelledby={idTitre}>
      {lignes.map((ligne) => (
        <li
          key={ligne.cle}
          data-cle={ligne.cle}
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
          {onAction !== null ? (
            <div className="mt-1.5">
              <BoutonsLigne
                ligne={ligne}
                onAction={onAction}
                enCours={enCours?.cle === ligne.cle ? enCours.action : null}
                pleineLargeur
                moi={moi}
              />
              <ResultatLigne
                resultat={resultat?.cle === ligne.cle ? resultat : null}
                pleineLargeur
              />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
