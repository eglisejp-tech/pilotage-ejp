import { LogoGoogle } from '@/features/connexion/LogoGoogle'

type Proprietes = {
  onClick: () => void
  /** Redirection vers Google en cours. */
  enCours?: boolean
  /** Une autre action est en cours sur l'écran : le clic est ignoré. */
  occupe?: boolean
}

/**
 * Bouton « Continuer avec Google » (maquette 16), selon les consignes de Google : fond blanc,
 * bordure grise, logo officiel à gauche du texte. Le fond, la bordure et le texte passent par les
 * tokens ; seul le logo garde ses couleurs de marque.
 */
export function BoutonGoogle({ onClick, enCours = false, occupe = false }: Proprietes) {
  const inactif = enCours || occupe
  return (
    <button
      type="button"
      aria-disabled={inactif || undefined}
      onClick={() => {
        if (!inactif) onClick()
      }}
      className="flex min-h-14 w-full items-center justify-center gap-3 border border-encre-3 bg-papier px-4 text-base font-semibold text-encre aria-disabled:cursor-wait"
    >
      <LogoGoogle />
      {enCours ? 'Ouverture de Google' : 'Continuer avec Google'}
    </button>
  )
}
