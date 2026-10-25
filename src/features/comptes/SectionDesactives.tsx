import { useId, useState } from 'react'
import { Bouton } from '@/components/ui/Bouton'
import type { ActionLigne } from '@/features/comptes/actionsLigne'
import { ListeComptesTelephone } from '@/features/comptes/ListeComptesTelephone'
import type { ResultatAction } from '@/features/comptes/ResultatLigne'
import { TableauComptes } from '@/features/comptes/TableauComptes'
import { TEXTES_COMPTES } from '@/features/comptes/textes'
import type { LigneCompte } from '@/features/comptes/types'

interface Props {
  lignes: LigneCompte[]
  variante: 'ministeres' | 'personnes'
  /** À partir de 600 px, le tableau ; en dessous, les blocs. */
  tableau: boolean
  onAction: ((ligne: LigneCompte, action: ActionLigne) => void) | null
  enCours: { cle: string; action: ActionLigne } | null
  resultat: ResultatAction | null
  moi?: string | null
}

/**
 * Désactivés d'une section de l'écran 13, repliés sous sa liste (T74) : ils n'encombrent plus la
 * liste, et « Réactiver » y reste. Le bouton « Afficher les 2 ministères désactivés » les montre
 * (`aria-expanded`), avec les mêmes colonnes. Une action qui vise l'un d'eux (une désactivation
 * qui vient de l'y ranger, une réactivation refusée) ouvre la section : son message reste à côté
 * de ses boutons.
 */
export function SectionDesactives({
  lignes,
  variante,
  tableau,
  onAction,
  enCours,
  resultat,
  moi,
}: Props) {
  const idListe = useId()
  const idTitre = useId()
  const [ouvert, setOuvert] = useState(false)
  // État ajusté au rendu quand le résultat change (pas d'effet) : il ouvre la section.
  const [resultatVu, setResultatVu] = useState(resultat)
  if (resultat !== resultatVu) {
    setResultatVu(resultat)
    if (resultat !== null && lignes.some((ligne) => ligne.cle === resultat.cle)) setOuvert(true)
  }
  if (lignes.length === 0) return null

  const ministeres = variante === 'ministeres'
  const nombre = TEXTES_COMPTES.desactives(lignes.length, ministeres)
  return (
    <div className="mt-4 flex flex-col gap-3">
      <div>
        <Bouton
          aria-expanded={ouvert}
          aria-controls={idListe}
          onClick={() => setOuvert((valeur) => !valeur)}
        >
          {ouvert
            ? TEXTES_COMPTES.masquerDesactives(lignes.length, ministeres)
            : TEXTES_COMPTES.afficherDesactives(lignes.length, ministeres)}
        </Bouton>
      </div>
      <div id={idListe} hidden={!ouvert}>
        {ouvert ? (
          <>
            <p id={idTitre} className="sr-only">
              {nombre}
            </p>
            {tableau ? (
              <TableauComptes
                lignes={lignes}
                variante={variante}
                idTitre={idTitre}
                onAction={onAction}
                enCours={enCours}
                resultat={resultat}
                moi={moi}
              />
            ) : (
              <ListeComptesTelephone
                lignes={lignes}
                idTitre={idTitre}
                onAction={onAction}
                enCours={enCours}
                resultat={resultat}
                moi={moi}
              />
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
