import { Link } from 'react-router'
import { TEXTES_SUIVI_SEMAINE } from '@/features/signalement/textes'

interface Props {
  /** Signalements Reçu ou En cours (au moins un), sans aucun Répondu. */
  nombre: number
}

/**
 * Ligne discrète de « Ma semaine » (T77), sous « Mes points » : des signalements sont suivis par
 * EJP Tech, sans rien demander au ministère. « Voir le suivi » ouvre « Mes signalements ».
 */
export function LigneSuiviSignalements({ nombre }: Props) {
  return (
    <p className="-mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-detail text-encre-2">
      <span>{TEXTES_SUIVI_SEMAINE.ligne(nombre)}</span>
      <Link
        to="/signalements"
        className="inline-flex min-h-cible items-center font-semibold text-nuit underline underline-offset-4"
      >
        {TEXTES_SUIVI_SEMAINE.lienLigne}
      </Link>
    </p>
  )
}
