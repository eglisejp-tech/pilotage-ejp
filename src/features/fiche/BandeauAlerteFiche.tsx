import { TEXTES_BANDEAU } from '@/features/fiche/textesCalendrier'

interface Props {
  /** Une phrase par sorte d'événement à confirmer (`phrasesBandeau`). Vide : rien n'est rendu. */
  phrases: readonly string[]
}

/**
 * Bandeau d'alerte de la fiche (T31, proposition d'affichage), en tête du calendrier, pour le
 * ministère qui porte ou est mentionné sur un événement à confirmer, et pour le berger, le conseil
 * et EJP Tech. Une phrase visible, sans bulle, qui commence par le mot « À confirmer » : le
 * bandeau ne tient pas à sa couleur. Pas de `role="alert"` (réservé aux erreurs de page). Il
 * disparaît quand rien n'est à signaler.
 */
export function BandeauAlerteFiche({ phrases }: Props) {
  if (phrases.length === 0) return null
  return (
    <div
      data-alerte-fiche
      className="mt-4 flex flex-col gap-1 border-l-4 border-attention bg-papier px-4 py-3 text-[15px]"
    >
      <p className="font-semibold text-attention">{TEXTES_BANDEAU.etiquette}</p>
      {phrases.map((phrase) => (
        <p key={phrase} className="text-encre">
          {phrase}
        </p>
      ))}
    </div>
  )
}
