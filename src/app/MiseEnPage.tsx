import { Link, Outlet } from 'react-router'

// En-tête commun à tous les écrans. Le nom du compte connecté s'y ajoutera à l'étape 2.
// box-content : le plafond de 1280 px s'applique au contenu, la marge latérale s'y ajoute
// (maquette 01 : 1264 px de contenu entre deux marges de 88 px à 1440 px).
export function MiseEnPage() {
  return (
    <div className="min-h-dvh">
      <a
        href="#contenu"
        className="sr-only bg-papier px-4 py-3 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Aller au contenu
      </a>
      <header className="border-b border-filet bg-papier">
        <div className="mx-auto box-content flex max-w-contenu flex-wrap items-baseline gap-x-4 gap-y-1 px-marge py-4">
          <Link to="/" className="font-lecture text-xl font-semibold text-encre">
            Pilotage EJP
          </Link>
          <span className="text-note text-encre-3">Église des Jeunes Prodiges</span>
        </div>
      </header>
      <main id="contenu" className="mx-auto box-content max-w-contenu px-marge py-10">
        <Outlet />
      </main>
    </div>
  )
}
