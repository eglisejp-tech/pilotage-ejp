import { useState } from 'react'
import { estMasque, masquer } from '@/features/octobre-rose/memoire'
import {
  ADRESSE_DEPISTAGE,
  anneeDeParis,
  TEXTES_OCTOBRE_ROSE,
} from '@/features/octobre-rose/octobreRose'
import { useOctobreRose } from '@/features/octobre-rose/useOctobreRose'

const ACTION = 'inline-flex min-h-cible items-center text-detail underline underline-offset-4'

/**
 * Bandeau Octobre rose sous l'en-tête des pages connectées, en octobre seulement (heure de
 * Paris), sur le modèle du bandeau d'avancement : une région nommée, sans `role="status"`, rien
 * n'est annoncé au chargement. « Masquer » le cache sur cet appareil jusqu'à l'octobre suivant
 * et rend le focus au contenu. Aucun envoi, aucun suivi du lien.
 */
export function BandeauOctobreRose() {
  const octobre = useOctobreRose()
  const [masque, setMasque] = useState(() => estMasque(anneeDeParis(new Date())))

  if (!octobre || masque) return null

  function surMasquer() {
    masquer(anneeDeParis(new Date()))
    setMasque(true)
    document.getElementById('contenu')?.focus()
  }

  return (
    <section
      aria-label={TEXTES_OCTOBRE_ROSE.nom}
      className="border-b border-filet bg-octobre-rose-fond"
    >
      <div className="mx-auto box-content flex max-w-contenu flex-wrap items-center gap-x-4 px-marge">
        <p className="py-2.5 text-detail text-encre-2">
          <span className="font-semibold text-octobre-rose-fonce">{TEXTES_OCTOBRE_ROSE.nom}</span> :{' '}
          {TEXTES_OCTOBRE_ROSE.message}
        </p>
        <div className="flex items-center gap-x-4 tablette:ml-auto">
          <a
            href={ADRESSE_DEPISTAGE}
            target="_blank"
            rel="noopener noreferrer"
            className={`${ACTION} text-nuit`}
          >
            {TEXTES_OCTOBRE_ROSE.lien}{' '}
            <span className="sr-only">{TEXTES_OCTOBRE_ROSE.nouvelOnglet}</span>
          </a>
          <button
            type="button"
            onClick={surMasquer}
            className={`${ACTION} min-w-cible justify-center text-encre-3`}
          >
            {TEXTES_OCTOBRE_ROSE.masquer}{' '}
            <span className="sr-only">{TEXTES_OCTOBRE_ROSE.masquerSuite}</span>
          </button>
        </div>
      </div>
    </section>
  )
}
