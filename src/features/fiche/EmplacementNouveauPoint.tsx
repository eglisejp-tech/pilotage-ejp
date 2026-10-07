import type { FunctionComponent } from 'react'
import { Link } from 'react-router'
import { TEXTES_FICHE } from '@/features/fiche/textesFiche'
import type { ProprietesEmplacementFiche } from '@/features/fiche/types'

const classeBouton =
  'inline-flex min-h-cible items-center justify-center border border-encre bg-papier px-5 text-[15px] font-semibold whitespace-nowrap text-encre hover:bg-fond'

/**
 * Bouton « Nouveau point » de « Ma fiche » (maquette 12), à la suite de « Saisir les chiffres du
 * dimanche » et « Saisir une session » : un lien vers `/saisir/point`, pour le profil « ministère »
 * seulement. Le berger, le conseil et EJP Tech ne créent pas de point (BRIEF, section 7 ; T29) :
 * pour eux, l'emplacement ne rend rien, même si la fiche le posait.
 */
export const EmplacementNouveauPoint: FunctionComponent<ProprietesEmplacementFiche> = ({
  profil,
}) =>
  profil === 'ministere' ? (
    <Link to="/saisir/point" className={classeBouton}>
      {TEXTES_FICHE.nouveauPoint}
    </Link>
  ) : null
