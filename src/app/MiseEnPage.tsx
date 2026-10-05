import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { EnTete } from '@/features/navigation/EnTete'
import type { ProprietesEnTete } from '@/features/navigation/EnTete'

type Proprietes = ProprietesEnTete & { children: ReactNode }

// Mise en page des écrans de l'application : en-tête du profil, contenu, pied de page.
// box-content : le plafond de 1280 px s'applique au contenu, la marge latérale s'y ajoute
// (maquette 01 : 1264 px de contenu entre deux marges de 88 px à 1440 px).
export function MiseEnPage({ children, ...entete }: Proprietes) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenu"
        className="sr-only bg-papier px-4 py-3 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Aller au contenu
      </a>
      <EnTete {...entete} />
      {/* Blocs intérieurs : dans la colonne flexible, mx-auto empêcherait l'étirement. */}
      <main id="contenu" className="flex-1">
        <div className="mx-auto box-content max-w-contenu px-marge py-10">{children}</div>
      </main>
      <footer>
        <div className="mx-auto box-content flex max-w-contenu flex-wrap gap-x-6 px-marge pb-6">
          <Link
            to="/confidentialite"
            className="inline-flex min-h-cible items-center text-note text-encre-3 underline underline-offset-4"
          >
            Confidentialité
          </Link>
          <Link
            to="/conditions"
            className="inline-flex min-h-cible items-center text-note text-encre-3 underline underline-offset-4"
          >
            Conditions d'utilisation
          </Link>
        </div>
      </footer>
    </div>
  )
}
