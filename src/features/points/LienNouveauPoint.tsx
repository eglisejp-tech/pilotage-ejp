import { Link } from 'react-router'
import { CLASSE_BOUTON_SECONDAIRE_FICHE } from '@/features/fiche/classesFiche'
import { TEXTES_POINTS } from '@/features/points/textesPoints'

/** Adresse du formulaire « Nouveau point » (maquette 10), pour le ministère seulement. */
export const VERS_NOUVEAU_POINT = '/saisir/point'

/**
 * « Nouveau point » en tête de « Mes points » (T66, décision 8). Le même lien pendant le
 * chargement et après : l'en-tête garde sa forme et la page ne se décale pas (T65).
 */
export function LienNouveauPoint() {
  return (
    <p className="mt-2">
      <Link to={VERS_NOUVEAU_POINT} className={CLASSE_BOUTON_SECONDAIRE_FICHE}>
        {TEXTES_POINTS.nouveauPoint}
      </Link>
    </p>
  )
}
