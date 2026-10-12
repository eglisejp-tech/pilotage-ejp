import { useId } from 'react'
import { ChampLibre } from '@/features/cette-semaine/ChampLibre'
import { TEXTE_MASQUE } from '@/features/cette-semaine/textesVides'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import type {
  LigneMonIndicateur,
  LigneMonRetire,
  SectionMesIndicateurs,
} from '@/features/mes-indicateurs/construire'
import { TEXTES_MES_INDICATEURS } from '@/features/mes-indicateurs/textes'
import { nombre } from '@/lib/metier/texte'

/** Une ligne d'un indicateur suivi : le libellé, sa définition, son origine, son usage et son état. */
function LigneIndicateur({ ligne }: { ligne: LigneMonIndicateur }) {
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
    </li>
  )
}

/** Les indicateurs suivis, par rythme puis les calculs : un titre et une liste par section. */
export function SectionsMesIndicateurs({ sections }: { sections: SectionMesIndicateurs[] }) {
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
                <LigneIndicateur key={ligne.id} ligne={ligne} />
              ))}
            </ul>
          </section>
        )
      })}
    </>
  )
}

/**
 * « Retirés (2) », replié : le libellé, le rythme et la date et le motif du retrait ; un refus d'EJP
 * Tech dit son motif en citation (« Refusé le 8 oct. : « motif ». »), en `--encre-3` quand EJP
 * Tech l'a masqué.
 */
export function RetiresMesIndicateurs({ retires }: { retires: LigneMonRetire[] }) {
  if (retires.length === 0) return null
  return (
    <details className="border-t border-filet">
      <summary className="flex min-h-cible cursor-pointer items-center text-[15px] font-semibold">
        {TEXTES_MES_INDICATEURS.titreRetires} ({nombre(retires.length)})
      </summary>
      <ul className="divide-y divide-filet pb-2">
        {retires.map((ligne) => (
          <li key={ligne.id} className="flex flex-col gap-0.5 py-3">
            <p className="text-[15px] font-semibold wrap-anywhere">
              {ligne.libelle}
              <span className="font-normal text-encre-3">{`, ${ligne.rythme.toLowerCase()}`}</span>
            </p>
            <p className="text-note wrap-anywhere text-encre-3">
              {ligne.detail}
              {ligne.motifRefus !== null ? (
                <>
                  {' : '}«&nbsp;
                  <ChampLibre
                    texte={{ texte: ligne.motifRefus, masque: ligne.motifRefus === TEXTE_MASQUE }}
                  />
                  &nbsp;».
                </>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
    </details>
  )
}
