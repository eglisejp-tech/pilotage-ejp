import { Link } from 'react-router'
import { LibelleEnvoi } from '@/components/etats/LibelleEnvoi'
import type { LigneMinistereConfiguration } from '@/features/indicateurs/configuration/construire'
import {
  nomAccessibleCreer,
  TEXTES_CONFIGURATION,
  texteACreer,
} from '@/features/indicateurs/configuration/textes'
import type { CreationPrevus } from '@/features/indicateurs/configuration/useCreationPrevus'

interface Props {
  ligne: LigneMinistereConfiguration
  /**
   * Null en lecture (administration de l'église, décision T60) : l'état seul, sans « Créer » ni
   * « Choisir ».
   */
  creation: CreationPrevus | null
}

const textes = TEXTES_CONFIGURATION.liste
const classeBouton =
  'inline-flex min-h-cible items-center border border-encre bg-papier px-4 text-sm font-semibold whitespace-nowrap text-encre hover:bg-fond aria-disabled:cursor-wait'

/**
 * Colonne « Prévus » (7.1) : « 6 à créer » et le bouton « Créer », « Créés », « Aucun prévu », ou
 * « À choisir » avec un lien vers l'écran du ministère, où se fait le choix. Le nom accessible du
 * bouton dit quel ministère et combien d'indicateurs.
 */
export function CellulePrevus({ ligne, creation }: Props) {
  const { prevus } = ligne
  if (prevus.genre === 'crees') return <>{textes.crees}</>
  if (prevus.genre === 'aucun') return <>{textes.aucunPrevu}</>
  if (creation === null) {
    return (
      <>{prevus.genre === 'a_choisir' ? textes.aChoisir : texteACreer(prevus.manquants.length)}</>
    )
  }
  if (prevus.genre === 'a_choisir') {
    return (
      <span className="flex flex-wrap items-center gap-x-3">
        <span>{textes.aChoisir}</span>
        <Link
          to={ligne.href}
          className="inline-flex min-h-cible items-center font-semibold underline underline-offset-4"
        >
          {textes.choisir} <span className="sr-only">pour {ligne.nom}</span>
        </Link>
      </span>
    )
  }
  const nombre = prevus.manquants.length
  const enCours = creation.enCours === ligne.id
  return (
    <span className="flex flex-wrap items-center gap-x-3">
      <span>{texteACreer(nombre)}</span>
      {/* Pendant l'envoi, le bouton dit « Création en cours » (m227) : son nom accessible est
          alors ce texte visible. */}
      <button
        type="button"
        aria-label={enCours ? undefined : nomAccessibleCreer(nombre, ligne.nom)}
        aria-disabled={enCours || undefined}
        aria-busy={enCours || undefined}
        onClick={() => void creation.creer({ id: ligne.id, nom: ligne.nom }, prevus.modele.code)}
        className={classeBouton}
      >
        <LibelleEnvoi enCours={enCours} libelleEnCours={TEXTES_CONFIGURATION.creationEnCours}>
          {textes.creer}
        </LibelleEnvoi>
      </button>
    </span>
  )
}
