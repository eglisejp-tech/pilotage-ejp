import { Bouton } from '@/components/ui/Bouton'
import { cn } from '@/lib/utils'

interface Props {
  libelle: string
  onClick: () => void
  /** Bouton principal (« Ajouter un ministère ») : fond `--lumiere`, 52 px. */
  principal?: boolean
}

/**
 * Bouton d'ajout de l'écran 13 (et « Déclarer une session » de l'écran 14) : le principal en jaune
 * (« Ajouter un ministère », 52 px), les autres bordés (« Ajouter un membre du conseil », 44 px),
 * sur le modèle commun (Bouton, T69). Pleine largeur sous 600 px.
 */
export function BoutonAjout({ libelle, onClick, principal = false }: Props) {
  return (
    <Bouton
      variante={principal ? 'principal' : 'secondaire'}
      taille={principal ? 'ajout' : 'ligne'}
      onClick={onClick}
      className={cn(
        'w-full whitespace-nowrap tablette:w-auto',
        principal && 'tablette:self-start ordinateur:self-auto',
      )}
    >
      {libelle}
    </Bouton>
  )
}
