import { Link } from 'react-router'
import { ChampLibre as Libre } from '@/features/cette-semaine/ChampLibre'
import type { ReunionFiche } from '@/features/fiche/construireReunion'
import { TEXTES_REUNION_FICHE } from '@/features/fiche/textesCalendrier'

export type EtatReunion =
  | { etat: 'chargement' }
  | { etat: 'erreur'; reessayer: () => void }
  | { etat: 'donnees'; reunion: ReunionFiche | null }

interface Props {
  etat: EtatReunion
  /** Le ministère lit sa fiche : « Renseigner » et « Modifier » ouvrent le panneau de saisie. */
  peutSaisir: boolean
}

const classeLien = 'inline-flex min-h-cible items-center text-nuit underline underline-offset-4'

/**
 * « Prochaine réunion » sous la fraîcheur, à l'ouverture de la fiche (maquettes 04 et 12) :
 * « Prochaine réunion : lundi 5 oct., 20 h », puis l'objet et « Décision attendue : ... ». Rien
 * n'est déclaré : « Non renseignée. » (berger, conseil, EJP Tech) ou « Renseigner » (ministère).
 * Le ministère a « Modifier » ; les autres profils n'ont aucun bouton. Rien pendant le chargement.
 */
export function VueReunion({ etat, peutSaisir }: Props) {
  if (etat.etat === 'chargement') return null
  if (etat.etat === 'erreur') {
    return (
      <p className="flex flex-wrap items-center gap-x-3">
        <span>
          {TEXTES_REUNION_FICHE.libelle} : {TEXTES_REUNION_FICHE.erreur}
        </span>
        <button type="button" onClick={etat.reessayer} className={classeLien}>
          {TEXTES_REUNION_FICHE.reessayer}
        </button>
      </p>
    )
  }
  const { reunion } = etat
  return (
    <div className="flex flex-col gap-0.5">
      <p className="flex flex-wrap items-center gap-x-2">
        <span>
          {TEXTES_REUNION_FICHE.libelle} :{' '}
          {reunion === null ? (
            <span className="text-encre-2">{TEXTES_REUNION_FICHE.nonRenseignee}</span>
          ) : (
            <strong className="font-semibold">{reunion.quand}</strong>
          )}
        </span>
        {peutSaisir ? (
          <Link to="/saisir/reunion" className={classeLien}>
            {reunion === null ? TEXTES_REUNION_FICHE.renseigner : TEXTES_REUNION_FICHE.modifier}
          </Link>
        ) : null}
      </p>
      {reunion?.objet ? (
        <p className="text-sm text-encre-2">
          <Libre texte={reunion.objet} />
        </p>
      ) : null}
      {reunion?.decision ? (
        <p className="text-sm text-encre-2">
          {TEXTES_REUNION_FICHE.decisionAttendue} : <Libre texte={reunion.decision} />
        </p>
      ) : null}
    </div>
  )
}
