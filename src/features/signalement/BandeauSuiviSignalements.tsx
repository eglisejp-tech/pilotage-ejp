import { Link } from 'react-router'
import { jourDuSignalement, TEXTES_SUIVI_SEMAINE } from '@/features/signalement/textes'

interface Props {
  /** Nombre de signalements Répondu (au moins un). */
  nombre: number
  /** Le plus ancien : la date dans la phrase, et la cible du lien. */
  plusAncien: { id: string; saisi_le: string }
}

/**
 * Bandeau de « Ma semaine » (T77), sous l'ouverture : seulement quand EJP Tech a répondu à au
 * moins un signalement du ministère, qui doit dire si c'est réglé. « Voir la réponse » ouvre
 * « Mes signalements » sur le plus ancien (`/signalements#<id>`). Un encadré blanc à filet fin,
 * comme le bandeau des indicateurs de Modération ; pas de `role="alert"` (réservé aux erreurs).
 */
export function BandeauSuiviSignalements({ nombre, plusAncien }: Props) {
  const phrase =
    nombre === 1
      ? TEXTES_SUIVI_SEMAINE.bandeauUn(jourDuSignalement(plusAncien.saisi_le))
      : TEXTES_SUIVI_SEMAINE.bandeauPlusieurs(nombre)
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border border-filet bg-papier px-4 py-2">
      <p className="text-interface leading-normal">{phrase}</p>
      <Link
        to={`/signalements#${plusAncien.id}`}
        className="inline-flex min-h-cible items-center text-interface font-semibold text-nuit underline underline-offset-4"
      >
        {TEXTES_SUIVI_SEMAINE.lienBandeau}
      </Link>
    </div>
  )
}
