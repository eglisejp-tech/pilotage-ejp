import { LogoGoogle } from '@/features/connexion/LogoGoogle'

type Proprietes = {
  onClick: () => void
  /** Redirection vers Google en cours. */
  enCours?: boolean
  /** Une autre action est en cours sur l'écran : le clic est ignoré. */
  occupe?: boolean
}

/**
 * Bouton « Continuer avec Google » (maquette 16), thème clair officiel de Google (consignes de
 * marque Google Identity) : fond #FFFFFF, bordure de 1 px #747775, texte #1F1F1F en Roboto
 * Medium, logo officiel à gauche du texte. La taille suit la maquette (pleine largeur, 56 px).
 *
 * Exception assumée à la règle « aucune couleur hors des tokens » (CLAUDE.md), comme le logo :
 * ces trois couleurs et la police Roboto (500, chargée pour ce seul bouton) viennent de Google
 * et ne servent nulle part ailleurs (docs/reference/maquettes/LISEZMOI.md, « Détails de
 * l'authentification »).
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
      className="flex min-h-14 w-full items-center justify-center gap-3 border border-[#747775] bg-[#FFFFFF] px-3 font-[Roboto,arial,sans-serif] text-base leading-5 font-medium text-[#1F1F1F] aria-disabled:cursor-wait"
    >
      <LogoGoogle />
      {enCours ? 'Ouverture de Google' : 'Continuer avec Google'}
    </button>
  )
}
