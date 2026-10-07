import type { FunctionComponent } from 'react'
import { Link } from 'react-router'
import { CLASSE_BOUTON_SECONDAIRE_FICHE } from '@/features/fiche/classesFiche'
import { TEXTES_FICHE } from '@/features/fiche/textesFiche'
import type { ProprietesEmplacementFiche } from '@/features/fiche/types'

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
    <Link to="/saisir/point" className={CLASSE_BOUTON_SECONDAIRE_FICHE}>
      {TEXTES_FICHE.nouveauPoint}
    </Link>
  ) : null
