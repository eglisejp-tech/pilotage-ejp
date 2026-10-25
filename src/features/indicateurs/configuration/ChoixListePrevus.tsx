import { useId } from 'react'
import { LibelleEnvoi } from '@/components/etats/LibelleEnvoi'
import { MODELE_AUCUN } from '@/features/indicateurs/configuration/catalogue'
import type { ModeleCatalogue } from '@/features/indicateurs/configuration/catalogue'
import { ListePrevus } from '@/features/indicateurs/configuration/ListePrevus'
import { introPrevus, TEXTES_CONFIGURATION } from '@/features/indicateurs/configuration/textes'

interface Props {
  modeles: readonly ModeleCatalogue[]
  /** Code choisi dans la liste : un modèle, `MODELE_AUCUN`, ou '' tant que rien n'est choisi. */
  choix: string
  onChoix: (code: string) => void
  /** Présélection d'après le nom du ministère (code ou `MODELE_AUCUN`) ; null : aucune. */
  suggestion: string | null
  enCours: boolean
  onEnregistrer: (liste: { code: string; nom: string }) => void
  /** Présent quand on revient sur un choix enregistré : le bouton « Annuler ». */
  onAnnuler?: () => void
}

const textes = TEXTES_CONFIGURATION.ministere
const classeBouton =
  'inline-flex min-h-14 items-center justify-center bg-lumiere px-5 text-[15px] font-semibold text-encre aria-disabled:cursor-wait'
const classeSecondaire =
  'inline-flex min-h-14 items-center justify-center border border-encre bg-papier px-5 text-[15px] font-semibold text-encre hover:bg-fond'

/**
 * Choix de la liste d'un ministère (7.2, T72) : « Nom du ministère dans la liste », « Aucun prévu »
 * en dernier, la liste présélectionnée d'après le nom du ministère avec son indication (une
 * suggestion, jamais un choix), l'aperçu des prévus de la liste choisie et « Enregistrer le
 * choix ». Rien n'est créé ici : la création suit, une fois le choix enregistré.
 */
export function ChoixListePrevus({
  modeles,
  choix,
  onChoix,
  suggestion,
  enCours,
  onEnregistrer,
  onAnnuler,
}: Props) {
  const idChoix = useId()
  const idIndication = useId()
  const modele = modeles.find((candidat) => candidat.code === choix) ?? null
  const indication =
    choix === ''
      ? textes.attenteChoix
      : suggestion !== null && choix === suggestion
        ? textes.indicationSuggestion
        : null
  const liste =
    choix === MODELE_AUCUN
      ? { code: MODELE_AUCUN, nom: textes.aucunPrevu }
      : modele === null
        ? null
        : { code: modele.code, nom: modele.nom }

  return (
    <>
      <div className="mt-2 flex max-w-prose flex-col gap-1.5">
        <label htmlFor={idChoix} className="text-[15px] font-semibold">
          {textes.choixModele}
        </label>
        <select
          id={idChoix}
          value={choix}
          aria-describedby={indication === null ? undefined : idIndication}
          onChange={(evenement) => onChoix(evenement.target.value)}
          className="h-14 w-full min-w-0 border border-encre bg-papier px-3.5 text-base text-encre"
        >
          <option value="">{textes.choixModelePlaceholder}</option>
          {modeles.map((candidat) => (
            <option key={candidat.code} value={candidat.code}>
              {candidat.nom}
            </option>
          ))}
          <option value={MODELE_AUCUN}>{textes.aucunPrevu}</option>
        </select>
        {/* L'indication remplace la bulle `indicateurs.modele` (T66, t334 et t335). */}
        {indication === null ? null : (
          <p id={idIndication} className="text-sm leading-normal text-encre-2">
            {indication}
          </p>
        )}
      </div>
      <div className="mt-3 flex flex-col items-start gap-3">
        {choix === MODELE_AUCUN ? (
          <p className="max-w-prose text-encre-2">{textes.aucunPrevuExplication}</p>
        ) : null}
        {modele !== null ? (
          <>
            <p className="max-w-prose text-encre-2">
              {introPrevus(modele.nom, modele.prevus.length)}
            </p>
            <ListePrevus prevus={modele.prevus} />
          </>
        ) : null}
        <div className="flex flex-wrap gap-3">
          {liste !== null ? (
            <button
              type="button"
              aria-disabled={enCours || undefined}
              aria-busy={enCours || undefined}
              onClick={() => onEnregistrer(liste)}
              className={classeBouton}
            >
              <LibelleEnvoi
                enCours={enCours}
                libelleEnCours={TEXTES_CONFIGURATION.enregistrementEnCours}
              >
                {textes.boutonEnregistrerChoix}
              </LibelleEnvoi>
            </button>
          ) : null}
          {onAnnuler !== undefined ? (
            <button type="button" onClick={onAnnuler} className={classeSecondaire}>
              {textes.annulerChangement}
            </button>
          ) : null}
        </div>
      </div>
    </>
  )
}
