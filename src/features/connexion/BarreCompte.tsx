import { BoutonLien } from '@/features/connexion/BoutonLien'

type Proprietes = {
  libelleCompte: string
  onSignOut: () => void
}

/** Barre du haut de l'écran 17 : « Se déconnecter » à gauche, le compte connecté à droite. */
export function BarreCompte({ libelleCompte, onSignOut }: Proprietes) {
  return (
    <header className="border-b border-filet bg-papier">
      <div className="mx-auto flex max-w-[27.5rem] items-center justify-between gap-4 px-5 py-3.5">
        <BoutonLien onClick={onSignOut}>Se déconnecter</BoutonLien>
        <p className="min-w-0 text-right text-sm text-encre-3">{libelleCompte}</p>
      </div>
    </header>
  )
}
