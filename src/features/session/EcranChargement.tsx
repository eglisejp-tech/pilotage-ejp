import { OuvertureOutil } from '@/components/etats/OuvertureOutil'

interface Props {
  /** Première vérification depuis le chargement de l'application : l'ouverture joue (T65). */
  ouverture?: boolean
}

/**
 * Chargement de la session, plein écran : rien pendant 300 ms, puis l'ouverture de l'outil (T65,
 * moment 1 : le monogramme se dessine, la flamme s'allume, une fois par chargement de
 * l'application) ou la flamme vivante ; après 4 s, « Chargement plus long que d'habitude », dans
 * la même zone (m248), avant l'écran d'erreur à 10 s. `aria-busy` est sur le dessin
 * (`OuvertureOutil`), pas sur `main` : la zone `status` n'est jamais dans un élément occupé.
 */
export function EcranChargement({ ouverture = false }: Props) {
  return (
    <main id="contenu" className="flex min-h-dvh items-center justify-center bg-fond px-4">
      <OuvertureOutil ouverture={ouverture} />
    </main>
  )
}
