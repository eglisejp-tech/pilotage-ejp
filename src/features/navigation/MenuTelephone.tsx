import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { PersonneDeclaree } from '@/features/declaration/PersonneDeclaree'
import type { Personne } from '@/features/declaration/PersonneDeclaree'
import { MenuEspaces } from '@/features/espaces/MenuEspaces'
import type { ProprietesEspaces } from '@/features/espaces/MenuEspaces'
import { BoutonDeconnexion } from '@/features/navigation/BoutonDeconnexion'
import type { Onglet } from '@/features/navigation/profils'
import { RubanOctobreRose } from '@/features/octobre-rose/RubanOctobreRose'
import { cn } from '@/lib/utils'

type Proprietes = {
  libelleCompte: string
  onglets: readonly Onglet[]
  accueil: string
  onSignOut: () => void
  deconnexionEnCours?: boolean
  /** Compte de ministère : la personne déclarée sur cet appareil (T56). */
  personne?: Personne
  /** « Changer d'espace » (T73) : les comptes ouverts sur l'appareil. */
  espaces?: ProprietesEspaces
  /**
   * Menu à toutes les largeurs (plus de cinq onglets : EJP Tech, T60). À partir de 1024 px, la
   * ligne et le menu s'alignent sur le contenu de la page.
   */
  partout?: boolean
}

const ID_MENU = 'menu-principal'

/**
 * En-tête sous 1024 px (maquette 03, BRIEF_DESIGN section 7) : « Pilotage EJP », le libellé du
 * compte en dessous, et un bouton menu de 44 px. Le menu liste les onglets, puis le compte,
 * « Se déconnecter », « Confidentialité » et « Conditions d'utilisation ». Il se ferme avec Échap
 * et à chaque changement de page.
 */
export function MenuTelephone({
  libelleCompte,
  onglets,
  accueil,
  onSignOut,
  deconnexionEnCours,
  personne,
  espaces,
  partout = false,
}: Proprietes) {
  const aligne = partout ? 'lg:mx-auto lg:box-content lg:max-w-contenu lg:px-marge' : ''
  const { pathname } = useLocation()
  // Le menu reste ouvert tant que la page ne change pas : un changement d'adresse le ferme.
  const [ouvertSur, setOuvertSur] = useState<string | null>(null)
  const ouvert = ouvertSur === pathname
  const bouton = useRef<HTMLButtonElement>(null)

  function fermer() {
    setOuvertSur(null)
  }

  function surTouche(evenement: KeyboardEvent<HTMLDivElement>) {
    if (evenement.key === 'Escape' && ouvert) {
      fermer()
      bouton.current?.focus()
    }
  }

  return (
    <div className={partout ? undefined : 'lg:hidden'} onKeyDown={surTouche}>
      <div className={cn('flex items-center justify-between gap-4 px-5 py-3.5', aligne)}>
        <div className="min-w-0">
          {/* Cible de 44 px ; les marges négatives gardent la hauteur de ligne dessinée. Le ruban
              d'Octobre rose (en octobre seulement) suit le nom, hors du lien. */}
          <div className="flex items-center gap-1.5">
            <Link
              to={accueil}
              className="-my-2.5 inline-flex min-h-11 items-center font-lecture text-[19px] leading-tight font-semibold"
            >
              Pilotage EJP
            </Link>
            <RubanOctobreRose className="h-4.5" />
          </div>
          <p className="mt-0.5 text-sm wrap-anywhere text-encre-2">
            <span className="sr-only">Compte connecté : </span>
            {libelleCompte}
            {/* La personne déclarée sur cet appareil (T56) se lit sans ouvrir le menu. */}
            {personne ? `, ${personne.prenom}` : null}
          </p>
        </div>
        <button
          ref={bouton}
          type="button"
          aria-expanded={ouvert}
          aria-controls={ID_MENU}
          onClick={() => setOuvertSur(ouvert ? null : pathname)}
          className="flex size-11 shrink-0 flex-col items-center justify-center gap-1.25 border border-filet bg-papier"
        >
          <span className="sr-only">{ouvert ? 'Fermer le menu' : 'Ouvrir le menu'}</span>
          <span aria-hidden="true" className="h-0.5 w-4.5 bg-encre" />
          <span aria-hidden="true" className="h-0.5 w-4.5 bg-encre" />
        </button>
      </div>

      <div
        id={ID_MENU}
        hidden={!ouvert}
        className={cn('border-t border-filet px-5 pt-2 pb-4', aligne)}
      >
        <nav aria-label="Menu principal">
          <ul role="list">
            {onglets.map(({ libelle, chemin }) => (
              <li key={chemin}>
                <NavLink
                  to={chemin}
                  end={chemin === '/'}
                  onClick={fermer}
                  className="flex min-h-12 items-center text-base text-encre-2 aria-[current=page]:font-bold aria-[current=page]:text-encre"
                >
                  {({ isActive }) => (
                    <span
                      className={cn(
                        'py-1',
                        isActive && 'shadow-[inset_0_-4px_0_var(--color-lumiere)]',
                      )}
                    >
                      {libelle}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-2 flex flex-col items-start border-t border-filet pt-3">
          <p className="text-sm font-semibold text-encre">
            <span className="sr-only">Compte connecté : </span>
            {libelleCompte}
          </p>
          {personne ? <PersonneDeclaree {...personne} surChangement={fermer} /> : null}
          {espaces ? <MenuEspaces {...espaces} disposition="menu" /> : null}
          <BoutonDeconnexion onClick={onSignOut} enCours={deconnexionEnCours} />
          <Link
            to="/confidentialite"
            onClick={fermer}
            className="inline-flex min-h-cible items-center text-sm text-encre-3 underline underline-offset-4"
          >
            Confidentialité
          </Link>
          <Link
            to="/conditions"
            onClick={fermer}
            className="inline-flex min-h-cible items-center text-sm text-encre-3 underline underline-offset-4"
          >
            Conditions d'utilisation
          </Link>
        </div>
      </div>
    </div>
  )
}
