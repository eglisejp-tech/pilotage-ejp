import type { FunctionComponent } from 'react'
import { Link } from 'react-router'
import { CLASSE_BOUTON_SECONDAIRE_FICHE } from '@/features/fiche/classesFiche'
import type { ProprietesEmplacementFiche } from '@/features/fiche/types'
import { TEXTES_GERER_INDICATEURS } from '@/features/mes-indicateurs/textesLien'

/**
 * Lien « Gérer mes indicateurs » de « Ma fiche » (maquette 12 ; configuration-indicateurs.md, 7.3
 * et 7.5), sous les chiffres du ministère, en bas de la section : un lien vers
 * `/ma-fiche/indicateurs`, pour le profil « ministère » seulement. Le berger, le conseil et EJP
 * Tech n'ont pas cet écran (T29) : pour eux, l'emplacement ne rend rien, même si la fiche le posait.
 */
export const EmplacementGererIndicateurs: FunctionComponent<ProprietesEmplacementFiche> = ({
  profil,
}) =>
  profil === 'ministere' ? (
    <div className="mt-4">
      <Link to="/ma-fiche/indicateurs" className={CLASSE_BOUTON_SECONDAIRE_FICHE}>
        {TEXTES_GERER_INDICATEURS.lien}
      </Link>
    </div>
  ) : null
