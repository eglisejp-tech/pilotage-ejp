import { useId } from 'react'
import { EtatVide } from '@/components/etats/EtatVide'
import { useLargeurMin } from '@/features/cette-semaine/useLargeurMin'
import { ChargementBloc } from '@/features/fiche/ChargementBloc'
import type { EtatBloc } from '@/features/fiche/modeleFiche'
import { TEXTES_FICHE } from '@/features/fiche/textesFiche'
import type { LigneListeMinistere } from '@/features/ministeres/construireListe'
import { ListeMinisteresTelephone } from '@/features/ministeres/ListeMinisteresTelephone'
import { TableauListeMinisteres } from '@/features/ministeres/TableauListeMinisteres'
import { ErreurDePage } from '@/pages/ErreurDePage'

interface Props {
  liste: EtatBloc<LigneListeMinistere[]>
}

const textes = TEXTES_FICHE.liste

/**
 * Écran « Ministères » (berger, conseil, EJP Tech ; BRIEF, section 9) : titre, phrase, puis le
 * tableau des ministères actifs à partir de 600 px, une liste en dessous. Premier usage : aucun
 * ministère actif, la phrase dit qui les crée. Problème passager : bandeau et « Réessayer ».
 * Aucune action de saisie, pour aucun profil.
 */
export function VueMinisteres({ liste }: Props) {
  const idTitre = useId()
  const tableau = useLargeurMin(600)
  return (
    <section aria-labelledby={idTitre} className="flex flex-col">
      <h1 id={idTitre} className="font-lecture text-titre leading-tight font-medium">
        {textes.titre}
      </h1>
      <div className="mt-2 border-t-2 border-encre" />
      {liste.etat === 'erreur' ? (
        <div className="mt-6">
          <ErreurDePage
            message={TEXTES_FICHE.erreur}
            libelleBouton={TEXTES_FICHE.reessayer}
            onReessayer={liste.reessayer}
          />
        </div>
      ) : null}
      {liste.etat === 'chargement' ? <ChargementBloc /> : null}
      {liste.etat === 'donnees' ? (
        liste.donnees.length === 0 ? (
          <EtatVide situation="premier_usage">{textes.aucun}</EtatVide>
        ) : (
          <>
            <p className="mt-4 max-w-prose text-encre-2">{textes.phrase}</p>
            <div className="mt-4">
              {tableau ? (
                <TableauListeMinisteres ministeres={liste.donnees} idTitre={idTitre} />
              ) : (
                <ListeMinisteresTelephone ministeres={liste.donnees} idTitre={idTitre} />
              )}
            </div>
          </>
        )
      ) : null}
    </section>
  )
}
