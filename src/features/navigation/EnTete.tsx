import { Link } from 'react-router'
import { BoutonDeconnexion } from '@/features/navigation/BoutonDeconnexion'
import { MenuTelephone } from '@/features/navigation/MenuTelephone'
import { NavigationOnglets } from '@/features/navigation/NavigationOnglets'
import type { Onglet } from '@/features/navigation/profils'

export type ProprietesEnTete = {
  /** Libellé du compte connecté, toujours visible : un email de ministère est partagé. */
  libelleCompte: string
  /** Onglets du profil, et seulement les siens. */
  onglets: readonly Onglet[]
  accueil: string
  onSignOut: () => void
  deconnexionEnCours?: boolean
}

/**
 * En-tête de l'application, en deux formats (BRIEF_DESIGN section 7). À partir de 1024 px :
 * « Pilotage EJP » à gauche, les onglets au centre, le compte et « Se déconnecter » à droite.
 * En dessous : voir MenuTelephone.
 */
export function EnTete(proprietes: ProprietesEnTete) {
  const { libelleCompte, onglets, accueil, onSignOut, deconnexionEnCours } = proprietes
  return (
    <header className="border-b border-filet bg-papier">
      {/* Les onglets prennent toute la hauteur : le soulignement de l'onglet actif touche le
          filet du bas, même quand le compte passe sur deux lignes (1024 à 1279 px). */}
      <div className="mx-auto box-content hidden max-w-contenu items-stretch justify-between gap-8 px-marge lg:flex">
        <div className="flex shrink-0 items-baseline gap-4 self-center">
          <Link to={accueil} className="font-lecture text-[22px] font-semibold">
            Pilotage EJP
          </Link>
          <span className="hidden text-sm text-encre-3 xl:inline">Église des Jeunes Prodiges</span>
        </div>
        <NavigationOnglets onglets={onglets} />
        <div className="flex shrink-0 flex-col items-end self-center py-2 text-sm xl:flex-row xl:items-center xl:gap-4 xl:py-0">
          <p className="font-semibold">
            <span className="sr-only">Compte connecté : </span>
            {libelleCompte}
          </p>
          <BoutonDeconnexion onClick={onSignOut} enCours={deconnexionEnCours} />
        </div>
      </div>
      <MenuTelephone {...proprietes} />
    </header>
  )
}
