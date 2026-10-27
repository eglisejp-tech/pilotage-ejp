import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { BandeauAvancement } from '@/features/avancement/BandeauAvancement'
import { EnTete } from '@/features/navigation/EnTete'
import type { ProprietesEnTete } from '@/features/navigation/EnTete'
import { EnTeteSaisie } from '@/features/navigation/EnTeteSaisie'
import { BandeauOctobreRose } from '@/features/octobre-rose/BandeauOctobreRose'
import { ContexteEnTeteSaisie } from '@/features/saisie/enTeteSaisie'
import type { EnTeteSaisie as OffreEnTeteSaisie } from '@/features/saisie/enTeteSaisie'

type Proprietes = ProprietesEnTete & {
  children: ReactNode
  /** Bandeau d'avancement sous l'en-tête (T50) : pages connectées seulement. */
  avecBandeau?: boolean
  /** Bandeau Octobre rose sous l'en-tête, en octobre seulement : pages connectées seulement. */
  avecOctobreRose?: boolean
}

/** La saisie qui tient l'en-tête simplifié : son « Retour », et un jeton pour le rendre. */
interface SaisieOuverte {
  retour: () => void
  jeton: number
}

// Mise en page des écrans de l'application : en-tête du profil, contenu, pied de page.
// box-content : le plafond de 1280 px s'applique au contenu, la marge latérale s'y ajoute
// (maquette 01 : 1264 px de contenu entre deux marges de 88 px à 1440 px).
// Une saisie en page entière (sous 600 px, PanneauSaisie) prend l'en-tête simplifié de la
// maquette 08 (proposition 4, T69) : « Retour » et le compte, sans menu ni bandeau d'avancement.
export function MiseEnPage({
  children,
  avecBandeau = false,
  avecOctobreRose = false,
  ...entete
}: Proprietes) {
  const [saisie, setSaisie] = useState<SaisieOuverte | null>(null)
  const prochainJeton = useRef(0)
  const offre = useMemo<OffreEnTeteSaisie>(
    () => ({
      ouvrir: (retour) => {
        prochainJeton.current += 1
        const jeton = prochainJeton.current
        setSaisie({ retour, jeton })
        // Une autre saisie a pu prendre l'en-tête entre-temps : on ne rend que le sien.
        return () => setSaisie((actuelle) => (actuelle?.jeton === jeton ? null : actuelle))
      },
    }),
    [],
  )
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenu"
        className="sr-only bg-papier px-4 py-3 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Aller au contenu
      </a>
      {saisie ? (
        <EnTeteSaisie
          libelleCompte={entete.libelleCompte}
          personne={entete.personne}
          onRetour={saisie.retour}
        />
      ) : (
        <EnTete {...entete} />
      )}
      {avecBandeau && !saisie ? <BandeauAvancement /> : null}
      {avecOctobreRose && !saisie ? <BandeauOctobreRose /> : null}
      {/* Blocs intérieurs : dans la colonne flexible, mx-auto empêcherait l'étirement.
          tabIndex -1 : « Fermer » le bandeau renvoie le focus ici. */}
      <main id="contenu" tabIndex={-1} className="flex-1 outline-none">
        <div className="mx-auto box-content max-w-contenu px-marge py-10">
          <ContexteEnTeteSaisie.Provider value={offre}>{children}</ContexteEnTeteSaisie.Provider>
        </div>
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
