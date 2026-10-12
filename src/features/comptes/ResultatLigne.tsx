import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { MessageReussite } from '@/features/saisie/MessageReussite'
import { cn } from '@/lib/utils'

/** Résultat de la dernière action d'une ligne (relance, désactivation, réactivation...). */
export interface ResultatAction {
  /** Clé de la ligne concernée. */
  cle: string
  reussite: boolean
  message: string
  /** Numéro de l'action : le même message, une deuxième fois, s'affiche de nouveau. */
  envoi: number
}

interface Props {
  /** Résultat de cette ligne, ou null. */
  resultat: ResultatAction | null
  /** Sous 600 px : le message prend toute la largeur du bloc. */
  pleineLargeur?: boolean
}

/**
 * Message d'une action de ligne de l'écran 13, sous ses boutons : là où la personne vient de
 * cliquer, même en bas d'une longue liste sur téléphone. La réussite reste 6 secondes dans une
 * région `status` toujours présente (annoncée à son arrivée) ; un refus s'affiche en couleur
 * d'erreur (`role="alert"`) et reste jusqu'à la prochaine action.
 */
export function ResultatLigne({ resultat, pleineLargeur = false }: Props) {
  return (
    // Vide, la région ne prend aucune place : seul le message a sa marge au-dessus.
    <div className={cn('text-left [&_p]:mt-2', !pleineLargeur && 'ml-auto max-w-[320px]')}>
      <MessageReussite
        message={resultat?.reussite ? resultat.message : null}
        envoi={resultat?.envoi ?? 0}
      />
      {resultat && !resultat.reussite ? <ErreurFormulaire message={resultat.message} /> : null}
    </div>
  )
}
