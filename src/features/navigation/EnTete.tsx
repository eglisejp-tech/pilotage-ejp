import { Link } from 'react-router'
import { PersonneDeclaree } from '@/features/declaration/PersonneDeclaree'
import type { Personne } from '@/features/declaration/PersonneDeclaree'
import { MenuEspaces } from '@/features/espaces/MenuEspaces'
import type { ProprietesEspaces } from '@/features/espaces/MenuEspaces'
import { BoutonDeconnexion } from '@/features/navigation/BoutonDeconnexion'
import { MenuTelephone } from '@/features/navigation/MenuTelephone'
import { NavigationOnglets } from '@/features/navigation/NavigationOnglets'
import type { Onglet } from '@/features/navigation/profils'
import { cn } from '@/lib/utils'

export type ProprietesEnTete = {
  /** Libellé du compte connecté, toujours visible : un email de ministère est partagé. */
  libelleCompte: string
  /** Onglets du profil, et seulement les siens. */
  onglets: readonly Onglet[]
  accueil: string
  onSignOut: () => void
  deconnexionEnCours?: boolean
  /** Compte de ministère : la personne déclarée sur cet appareil (T56). */
  personne?: Personne
  /** « Changer d'espace » (T73) : les comptes ouverts sur l'appareil. */
  espaces?: ProprietesEspaces
}

/**
 * Au-delà de cinq onglets, la ligne ne tient plus, même à 1440 px : EJP Tech, avec ses neuf
 * onglets (T60, et « Personnes » de T56), garde le menu à toutes les largeurs. Les autres profils
 * n'en ont pas plus de cinq.
 */
const ONGLETS_EN_LIGNE_MAX = 5

/**
 * En-tête de l'application, en deux formats (BRIEF_DESIGN section 7). À partir de 1024 px :
 * « Pilotage EJP » à gauche, les onglets au centre, le compte et « Se déconnecter » à droite.
 * En dessous, ou au-delà de cinq onglets : voir MenuTelephone.
 */
export function EnTete(proprietes: ProprietesEnTete) {
  const { libelleCompte, onglets, accueil, onSignOut, deconnexionEnCours, personne, espaces } =
    proprietes
  const menuPartout = onglets.length > ONGLETS_EN_LIGNE_MAX
  return (
    <header className="border-b border-filet bg-papier">
      {/* Les onglets prennent toute la hauteur : le soulignement de l'onglet actif touche le
          filet du bas, même quand le compte passe sur deux lignes (1024 à 1279 px). */}
      <div
        className={cn(
          'mx-auto box-content hidden max-w-contenu items-stretch justify-between gap-8 px-marge',
          !menuPartout && 'lg:flex',
        )}
      >
        <div className="flex shrink-0 items-baseline gap-4 self-center">
          <Link
            to={accueil}
            className="inline-flex min-h-11 items-center font-lecture text-[22px] font-semibold"
          >
            Pilotage EJP
          </Link>
          <span className="hidden text-sm text-encre-3 xl:inline">Église des Jeunes Prodiges</span>
        </div>
        <NavigationOnglets onglets={onglets} />
        {/* Avec « Vous : Marie D. » et « Ce n'est pas moi » (T56), le compte reste sur plusieurs
            lignes à toutes les largeurs : sur une seule, la ligne déborde de 1280 à 1440 px, et
            plus loin avec un long prénom. Le bloc peut céder quelques pixels (min-w-0) : quand la
            place manque (cinq onglets à 1024 px), « Se déconnecter » passe sous « Changer
            d'espace » (T73) au lieu de faire défiler la page. */}
        <div
          className={cn(
            'flex min-w-0 flex-col items-end self-center py-2 text-sm',
            personne ? 'max-w-72' : 'xl:flex-row xl:items-center xl:gap-4 xl:py-0',
          )}
        >
          <p className="font-semibold">
            <span className="sr-only">Compte connecté : </span>
            {libelleCompte}
          </p>
          {personne ? <PersonneDeclaree {...personne} /> : null}
          {/* « Changer d'espace » (T73) et « Se déconnecter » sur une ligne, à droite. */}
          <div className="flex flex-wrap items-center justify-end gap-x-4">
            {espaces ? <MenuEspaces {...espaces} disposition="en-tete" /> : null}
            <BoutonDeconnexion onClick={onSignOut} enCours={deconnexionEnCours} />
          </div>
        </div>
      </div>
      <MenuTelephone {...proprietes} partout={menuPartout} />
    </header>
  )
}
