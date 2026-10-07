import { cn } from '@/lib/utils'

interface Props {
  libelle: string
  onClick: () => void
  /** Bouton principal (« Ajouter un ministère ») : fond `--lumiere`, 52 px. */
  principal?: boolean
}

/**
 * Bouton d'ajout de l'écran 13 : le principal en jaune (« Ajouter un ministère »), les autres
 * bordés (« Ajouter un membre du conseil »), 44 px au moins (LISEZMOI, écarts de 12 et 13).
 * Pleine largeur sous 600 px.
 */
export function BoutonAjout({ libelle, onClick, principal = false }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex w-full items-center justify-center px-4.5 text-[15px] font-semibold whitespace-nowrap text-encre min-[600px]:w-auto',
        principal
          ? 'min-h-13 bg-lumiere min-[600px]:self-start min-[1024px]:self-auto'
          : 'min-h-cible border border-encre bg-papier hover:bg-fond',
      )}
    >
      {libelle}
    </button>
  )
}
