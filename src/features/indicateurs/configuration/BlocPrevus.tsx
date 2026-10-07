import { useId, useState } from 'react'
import { Aide } from '@/components/aide/Aide'
import { LibelleAvecAide } from '@/components/aide/LibelleAvecAide'
import { MODELE_AUCUN } from '@/features/indicateurs/configuration/catalogue'
import type { PrevuCatalogue } from '@/features/indicateurs/configuration/catalogue'
import type { ConfigurationMinistere } from '@/features/indicateurs/configuration/construire'
import { resteAChoisirOuCreer } from '@/features/indicateurs/configuration/prevus'
import { RefusCreation } from '@/features/indicateurs/configuration/RefusCreation'
import type { CreationPrevus } from '@/features/indicateurs/configuration/useCreationPrevus'
import {
  boutonCreerPrevus,
  introPrevus,
  TEXTES_CONFIGURATION,
} from '@/features/indicateurs/configuration/textes'
import { libelleRythme } from '@/lib/metier/indicateurs'

interface Props {
  donnees: ConfigurationMinistere
  creation: CreationPrevus
}

const textes = TEXTES_CONFIGURATION.ministere
const classeBouton =
  'inline-flex min-h-14 items-center justify-center bg-lumiere px-5 text-[15px] font-semibold text-encre aria-disabled:cursor-wait'

/** Prévus à créer : le libellé, le rythme et la mention d'un calcul. */
function ListePrevus({ prevus }: { prevus: readonly PrevuCatalogue[] }) {
  return (
    <ul className="mt-3 w-full">
      {prevus.map((prevu) => (
        <li
          key={prevu.code}
          className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-filet py-2 text-[15px]"
        >
          <span className="min-w-0 break-words">{prevu.libelle}</span>
          <span className="text-note text-encre-3">
            {libelleRythme(prevu.nature)}
            {prevu.calcul !== null ? ', calcul' : ''}
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Bloc « Prévus par la coordination » de `/indicateurs/:id` (7.2), tant qu'il reste des
 * indicateurs prévus à créer : la liste et le bouton « Créer ces 6 indicateurs ». Si le nom du
 * ministère n'est pas reconnu, la phrase qui attend le choix, puis le choix « Choisir dans la liste
 * de la coordination », avec « Aucun prévu » en dernier. La base crée tout ou rien, sans doublon ;
 * son refus s'affiche sous le bouton. Le bloc disparaît dès que les prévus sont créés ou que
 * « Aucun prévu » est enregistré ; le message de réussite reste sous la phrase du ministère.
 */
export function BlocPrevus({ donnees, creation }: Props) {
  const idTitre = useId()
  const idChoix = useId()
  const [choix, setChoix] = useState('')
  const { prevus } = donnees
  if (!resteAChoisirOuCreer(prevus)) return null

  const modele =
    prevus.genre === 'a_creer'
      ? prevus.modele
      : (donnees.modeles.find((candidat) => candidat.code === choix) ?? null)
  const aCreer = prevus.genre === 'a_creer' ? prevus.manquants : (modele?.prevus ?? [])
  const nombre = aCreer.length
  const enCours = creation.enCours === donnees.id
  const ministere = { id: donnees.id, nom: donnees.nom }

  return (
    <section aria-labelledby={idTitre} className="mt-6 border border-filet bg-papier p-4">
      <div className="flex flex-wrap items-center">
        <h2 id={idTitre} className="font-lecture text-[22px] leading-tight font-medium">
          {textes.titrePrevus}
        </h2>
        <Aide code="indicateurs.prevus" libelle={textes.titrePrevus} placement="flottante" />
      </div>
      {prevus.genre === 'a_choisir' && choix === '' ? (
        <p className="mt-2 max-w-prose text-encre-2">{textes.attenteChoix}</p>
      ) : null}
      {prevus.genre === 'a_choisir' ? (
        <div className="mt-2 flex max-w-prose flex-col">
          <LibelleAvecAide
            htmlFor={idChoix}
            libelle={textes.choixModele}
            code="indicateurs.modele"
          />
          <select
            id={idChoix}
            value={choix}
            onChange={(evenement) => setChoix(evenement.target.value)}
            className="h-14 w-full min-w-0 border border-encre bg-papier px-3.5 text-base text-encre"
          >
            <option value="">{textes.choixModelePlaceholder}</option>
            {donnees.modeles.map((candidat) => (
              <option key={candidat.code} value={candidat.code}>
                {candidat.nom}
              </option>
            ))}
            <option value={MODELE_AUCUN}>{textes.aucunPrevu}</option>
          </select>
        </div>
      ) : null}
      {choix === MODELE_AUCUN && prevus.genre === 'a_choisir' ? (
        <div className="mt-3 flex flex-col items-start gap-3">
          <p className="max-w-prose text-encre-2">{textes.aucunPrevuExplication}</p>
          <button
            type="button"
            aria-disabled={enCours || undefined}
            aria-busy={enCours || undefined}
            onClick={() => void creation.creer(ministere, MODELE_AUCUN)}
            className={classeBouton}
          >
            {textes.boutonAucunPrevu}
          </button>
        </div>
      ) : null}
      {modele !== null && choix !== MODELE_AUCUN ? (
        <div className="mt-3 flex flex-col items-start gap-3">
          <p className="max-w-prose text-encre-2">{introPrevus(modele.nom, nombre)}</p>
          <ListePrevus prevus={aCreer} />
          <button
            type="button"
            aria-disabled={enCours || undefined}
            aria-busy={enCours || undefined}
            onClick={() => void creation.creer(ministere, modele.code)}
            className={classeBouton}
          >
            {boutonCreerPrevus(nombre)}
          </button>
        </div>
      ) : null}
      <RefusCreation refus={creation.dernier === donnees.id ? creation.refus : null} />
    </section>
  )
}
