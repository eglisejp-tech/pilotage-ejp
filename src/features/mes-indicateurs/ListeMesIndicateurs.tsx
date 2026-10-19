import { useId, useState } from 'react'
import { ChampLibre } from '@/features/cette-semaine/ChampLibre'
import { TEXTE_MASQUE } from '@/features/cette-semaine/textesVides'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import type {
  LigneMonIndicateur,
  LigneMonRetire,
  SectionMesIndicateurs,
} from '@/features/mes-indicateurs/construire'
import {
  nomBoutonRetrait,
  TEXTES_MES_INDICATEURS,
  TEXTES_RETRAIT,
} from '@/features/mes-indicateurs/textes'
import { nombre } from '@/lib/metier/texte'

/** Le ministère choisit de retirer un de ses ajouts : la page ouvre la fenêtre (T62). */
export type SurRetirer = (ligne: LigneMonIndicateur) => void

/** Bouton d'une action de ligne, souligné comme les actions de l'écran Indicateurs. */
const classeAction =
  'inline-flex min-h-cible items-center text-[15px] font-semibold text-encre underline underline-offset-4'

/** Ce que le ministère peut faire de son ajout : le bouton, ou la phrase qui dit qui le retire. */
function ActionRetrait({
  ligne,
  surRetirer,
}: {
  ligne: LigneMonIndicateur
  surRetirer: SurRetirer
}) {
  const retrait = ligne.retrait
  if (retrait === null) return null
  if (retrait.genre === 'source') {
    return <p className="max-w-prose text-note text-encre-3">{retrait.message}</p>
  }
  const demande = retrait.genre === 'demande'
  return (
    <div>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={nomBoutonRetrait(ligne.libelle, demande)}
        onClick={() => surRetirer(ligne)}
        className={classeAction}
      >
        {demande ? TEXTES_RETRAIT.retirerDemande : TEXTES_RETRAIT.retirer}
      </button>
    </div>
  )
}

/** Une ligne d'un indicateur suivi : le libellé, sa définition, son origine, son usage et son état. */
function LigneIndicateur({
  ligne,
  surRetirer,
}: {
  ligne: LigneMonIndicateur
  surRetirer: SurRetirer
}) {
  return (
    <li className="flex flex-col gap-1 py-[18px]">
      <p className="font-lecture text-[21px] leading-snug font-medium wrap-anywhere">
        {ligne.libelle}
      </p>
      <p className="max-w-prose leading-normal wrap-anywhere text-encre-2">{ligne.definition}</p>
      <p className="text-note text-encre-3">{ligne.origine}</p>
      {ligne.calcul ? (
        <p className="text-note text-encre-3">{TEXTES_MES_INDICATEURS.calculSansSaisie}</p>
      ) : null}
      {ligne.usage !== null ? <p className="text-note text-encre-3">{ligne.usage}</p> : null}
      {ligne.attente !== null ? (
        <p className="max-w-prose text-[15px] leading-normal font-semibold text-attention">
          {ligne.attente}
        </p>
      ) : null}
      {ligne.attenteSuite !== null ? (
        <p className="max-w-prose text-[15px] leading-normal text-encre-2">{ligne.attenteSuite}</p>
      ) : null}
      <ActionRetrait ligne={ligne} surRetirer={surRetirer} />
    </li>
  )
}

/**
 * Les indicateurs suivis, par rythme puis les calculs : un titre et une liste par section. Les
 * ajouts du ministère portent « Retirer la demande » (à valider) ou « Retirer » (validé) ; la
 * source d'un calcul dit à la place qui peut la retirer (T62).
 */
export function SectionsMesIndicateurs({
  sections,
  surRetirer,
}: {
  sections: SectionMesIndicateurs[]
  surRetirer: SurRetirer
}) {
  const prefixe = useId()
  return (
    <>
      {sections.map((section) => {
        const idTitre = `${prefixe}-${section.cle}`
        return (
          <section key={section.cle} aria-labelledby={idTitre} className="flex min-w-0 flex-col">
            <TitreSection id={idTitre} titre={section.titre} />
            <ul className="divide-y divide-filet">
              {section.lignes.map((ligne) => (
                <LigneIndicateur key={ligne.id} ligne={ligne} surRetirer={surRetirer} />
              ))}
            </ul>
          </section>
        )
      })}
    </>
  )
}

/** Un motif en citation, en `--encre-3` quand EJP Tech l'a masqué. */
function Citation({ motif }: { motif: string }) {
  return (
    <>
      {' : '}«&nbsp;
      <ChampLibre texte={{ texte: motif, masque: motif === TEXTE_MASQUE }} />
      &nbsp;».
    </>
  )
}

/**
 * « Retirés (2) », replié : le libellé, le rythme et la date et le motif du retrait ; un refus d'EJP
 * Tech dit son motif en citation (« Refusé le 8 oct. : « motif ». »), un retrait du ministère le
 * motif qu'il a écrit (« Retiré par vous le 14 oct. : « motif ». »), en `--encre-3` quand EJP Tech
 * l'a masqué. Le titre est souligné comme les autres listes repliées. La liste s'ouvre d'elle-même
 * quand elle porte le motif d'un refus : le ministère doit le lire.
 */
export function RetiresMesIndicateurs({ retires }: { retires: LigneMonRetire[] }) {
  const [ouvert, setOuvert] = useState(retires.some((ligne) => ligne.motifRefus !== null))
  if (retires.length === 0) return null
  return (
    <details
      open={ouvert}
      onToggle={(evenement) => setOuvert(evenement.currentTarget.open)}
      className="border-t border-filet"
    >
      <summary className="inline-flex min-h-cible cursor-pointer items-center text-[15px] font-semibold underline underline-offset-4">
        {TEXTES_MES_INDICATEURS.titreRetires} ({nombre(retires.length)})
      </summary>
      <ul className="divide-y divide-filet pb-2">
        {retires.map((ligne) => {
          const motif = ligne.motifRefus ?? ligne.motifRetrait
          return (
            <li key={ligne.id} className="flex flex-col gap-0.5 py-3">
              <p className="text-[15px] font-semibold wrap-anywhere">
                {ligne.libelle}
                <span className="font-normal text-encre-3">{`, ${ligne.rythme.toLowerCase()}`}</span>
              </p>
              <p className="text-note wrap-anywhere text-encre-3">
                {ligne.detail}
                {motif !== null ? <Citation motif={motif} /> : null}
              </p>
            </li>
          )
        })}
      </ul>
    </details>
  )
}
