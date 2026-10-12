import { Link } from 'react-router'
import { TEXTES_EN_TETE_PERSONNE } from '@/features/declaration/textes'

export type Personne = {
  /** Prénom déclaré sur cet appareil (« Marie D. »). */
  prenom: string
  /** Adresse de « Ce n'est pas moi » (/qui-utilise?changer=1, avec la page à retrouver). */
  lienChangement: string
}

type Proprietes = Personne & {
  /** Appelé au clic sur « Ce n'est pas moi » (le menu du téléphone se ferme). */
  surChangement?: () => void
}

/**
 * « Vous : Marie » et le lien « Ce n'est pas moi », près de « Se déconnecter » (T56), pour un
 * compte de ministère seulement, sur l'appareil où la personne s'est déclarée.
 */
export function PersonneDeclaree({ prenom, lienChangement, surChangement }: Proprietes) {
  return (
    <div className="flex flex-wrap items-center gap-x-3">
      <p className="text-sm text-encre-2">{TEXTES_EN_TETE_PERSONNE.vous(prenom)}</p>
      <Link
        to={lienChangement}
        onClick={surChangement}
        className="inline-flex min-h-cible items-center text-sm whitespace-nowrap text-encre-3 underline underline-offset-4"
      >
        {TEXTES_EN_TETE_PERSONNE.pasMoi}
      </Link>
    </div>
  )
}
