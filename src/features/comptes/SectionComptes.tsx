import { useId } from 'react'
import type { ReactNode } from 'react'
import { EtatVide } from '@/components/etats/EtatVide'
import type { ActionLigne } from '@/features/comptes/actionsLigne'
import { ListeComptesTelephone } from '@/features/comptes/ListeComptesTelephone'
import type { ResultatAction } from '@/features/comptes/ResultatLigne'
import { TableauComptes } from '@/features/comptes/TableauComptes'
import type { LigneCompte } from '@/features/comptes/types'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import { useLargeurMin } from '@/features/cette-semaine/useLargeurMin'

interface Props {
  titre: string
  /** À droite du titre : un total (« 8 actifs... ») ou les boutons d'ajout de la section. */
  complement?: ReactNode
  lignes: LigneCompte[]
  variante: 'ministeres' | 'personnes'
  /** État vide (T36) : ce qui se passe, puis qui agit. La section garde son titre et son filet. */
  vide: { texte: string; suite: string }
  /** Sous le tableau (lien vers l'écran Indicateurs). */
  note?: ReactNode
  /** Null en lecture (administration de l'église, T60) : aucun bouton de ligne. */
  onAction: ((ligne: LigneCompte, action: ActionLigne) => void) | null
  enCours: { cle: string; action: ActionLigne } | null
  /** Résultat de la dernière action de ligne (sous les boutons de la ligne concernée). */
  resultat: ResultatAction | null
  /** Compte connecté : sa ligne n'a pas de bouton (T60). */
  moi?: string | null
}

/**
 * Une section de l'écran 13 (« Ministères », « Berger et conseil », « EJP Tech ») : titre souligné,
 * puis le tableau à partir de 600 px, des blocs en dessous.
 */
export function SectionComptes({
  titre,
  complement,
  lignes,
  variante,
  vide,
  note,
  onAction,
  enCours,
  resultat,
  moi,
}: Props) {
  const idTitre = useId()
  const tableau = useLargeurMin(600)
  return (
    <section aria-labelledby={idTitre} className="flex flex-col">
      <TitreSection id={idTitre} titre={titre} complement={complement} />
      {lignes.length === 0 ? (
        <EtatVide situation="premier_usage" suite={vide.suite}>
          {vide.texte}
        </EtatVide>
      ) : tableau ? (
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
      {note && lignes.length > 0 ? <p className="mt-3 text-sm text-encre-3">{note}</p> : null}
    </section>
  )
}
