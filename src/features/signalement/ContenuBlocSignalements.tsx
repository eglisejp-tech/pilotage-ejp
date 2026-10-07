import { useId, useRef, useState } from 'react'
import { EtatVide } from '@/components/etats/EtatVide'
import type { LigneSignalement } from '@/data/signalements'
import { TEXTES_VIDES } from '@/features/cette-semaine/textesVides'
import { ChargementSaisie } from '@/features/evenements/ChargementSaisie'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { MessageReussite } from '@/features/saisie/MessageReussite'
import { LigneSignalementBloc } from '@/features/signalement/LigneSignalementBloc'
import type { Cloture } from '@/features/signalement/schemas'
import { TEXTES_BLOC_SIGNALEMENTS, TEXTES_SIGNALEMENT } from '@/features/signalement/textes'

/** Ce que montre le bloc « Signalements ». */
export type ContenuBloc =
  | { etat: 'chargement' }
  | { etat: 'probleme'; reessayer: () => void }
  | {
      etat: 'liste'
      /** Ouverts et clos des 30 derniers jours (filtres de la base), du plus ancien au plus récent. */
      signalements: LigneSignalement[]
      cloturer: (cloture: Cloture) => Promise<void>
      /** Relit la liste (après « Ce signalement est déjà clos. »). */
      relire: () => void
    }

interface Props {
  contenu: ContenuBloc
}

/**
 * Bloc « Signalements » de l'accueil d'EJP Tech (T39 ; BRIEF, « Modération »), au-dessus du reste
 * de l'écran : titre avec « N signalements ouverts », sous-titre ; les ouverts, du plus ancien au
 * plus récent, chacun avec « Clore le signalement » ; puis les clos des 30 derniers jours (jour de
 * Paris, calculé par la base). Sans ouvert : « Aucun signalement. ... » (tout est fait), le titre
 * et les clos gardés. Après une clôture, « Signalement clos. » est annoncé et le focus revient au
 * titre du bloc (la ligne a quitté les ouverts).
 */
export function ContenuBlocSignalements({ contenu }: Props) {
  const idTitre = useId()
  const idClos = useId()
  const titre = useRef<HTMLHeadingElement>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(0)
  const [refus, setRefus] = useState<string | null>(null)

  const ouverts =
    contenu.etat === 'liste' ? contenu.signalements.filter((ligne) => ligne.ouvert) : []
  const clos =
    contenu.etat === 'liste'
      ? contenu.signalements.filter((ligne) => !ligne.ouvert && ligne.clos_recent)
      : []

  const cloture =
    contenu.etat === 'liste'
      ? {
          cloturer: contenu.cloturer,
          surClos: () => {
            setRefus(null)
            setReussite(TEXTES_BLOC_SIGNALEMENTS.reussite)
            setEnvoi((precedent) => precedent + 1)
            titre.current?.focus()
          },
          surDejaClos: (message: string) => {
            setReussite(null)
            setRefus(message)
            contenu.relire()
            titre.current?.focus()
          },
        }
      : undefined

  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b-2 border-encre pb-3">
        <div className="flex flex-col gap-1">
          <h2
            id={idTitre}
            ref={titre}
            tabIndex={-1}
            className="font-lecture text-section leading-tight font-medium outline-hidden"
          >
            {TEXTES_SIGNALEMENT.bloc.titre}
          </h2>
          <p className="text-sm text-encre-2">{TEXTES_SIGNALEMENT.bloc.sousTitre}</p>
        </div>
        {contenu.etat === 'liste' ? (
          <p className="text-note text-encre-2">
            {TEXTES_BLOC_SIGNALEMENTS.ouverts(ouverts.length)}
          </p>
        ) : null}
      </div>

      {contenu.etat === 'chargement' ? (
        <div className="py-[18px]">
          <ChargementSaisie />
        </div>
      ) : null}
      {contenu.etat === 'probleme' ? (
        <EtatVide
          situation="probleme_passager"
          action={{ libelle: TEXTES_VIDES.page.reessayer, surClic: contenu.reessayer }}
        >
          {TEXTES_VIDES.page.erreur}
        </EtatVide>
      ) : null}

      {refus ? (
        <div className="mt-3">
          <ErreurFormulaire message={refus} />
        </div>
      ) : null}
      <MessageReussite message={reussite} envoi={envoi} />

      {contenu.etat === 'liste' ? (
        <>
          {ouverts.length === 0 ? (
            <EtatVide situation="tout_est_fait">{TEXTES_SIGNALEMENT.bloc.vide}</EtatVide>
          ) : (
            <ol>
              {ouverts.map((signalement) => (
                <li key={signalement.id} className="border-t border-filet first:border-t-0">
                  <LigneSignalementBloc signalement={signalement} cloture={cloture} />
                </li>
              ))}
            </ol>
          )}
          {clos.length > 0 ? (
            <section aria-labelledby={idClos} className="mt-6 flex flex-col">
              <h3
                id={idClos}
                className="border-b border-filet pb-2 text-[15px] font-semibold text-encre-2"
              >
                {TEXTES_BLOC_SIGNALEMENTS.titreClos}
              </h3>
              <ol>
                {clos.map((signalement) => (
                  <li key={signalement.id} className="border-t border-filet first:border-t-0">
                    <LigneSignalementBloc signalement={signalement} />
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
