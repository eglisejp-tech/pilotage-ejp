import type { ReactNode } from 'react'

type Proprietes = {
  children: ReactNode
  /** Envoi en cours : le libellé change et un second envoi est ignoré par le formulaire. */
  enCours?: boolean
  libelleEnCours: string
}

/**
 * Bouton d'envoi, l'un des trois usages de la lumière (BRIEF section 10). Il n'est jamais grisé :
 * pendant l'envoi, il reste focalisable et porte aria-disabled.
 */
export function BoutonPrincipal({ children, enCours = false, libelleEnCours }: Proprietes) {
  return (
    <>
      <button
        type="submit"
        aria-disabled={enCours || undefined}
        className="min-h-14 w-full bg-lumiere px-4.5 text-[15px] font-semibold text-encre aria-disabled:cursor-wait"
      >
        {enCours ? libelleEnCours : children}
      </button>
      <p role="status" className="sr-only">
        {enCours ? libelleEnCours : ''}
      </p>
    </>
  )
}
