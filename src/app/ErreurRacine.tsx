import { ColonneConnexion } from '@/features/connexion/ColonneConnexion'
import { TitreConnexion } from '@/features/connexion/TitreConnexion'
import { useTitrePage } from '@/features/connexion/useTitrePage'

/** Textes de l'erreur hors du routeur (m241, Proposé) : les mots de l'erreur d'affichage (m240). */
const TEXTES_ERREUR_RACINE = {
  onglet: 'Affichage impossible',
  titre: "La page n'a pas pu s'afficher",
  recours: 'Si le problème revient, prévenez EJP Tech.',
  bouton: 'Recharger la page',
} as const

/**
 * Écran d'une erreur de rendu hors du routeur (`LimiteErreurRacine`) : jamais une page blanche, un
 * message, le recours vers EJP Tech et « Recharger la page ». Il n'utilise ni le routeur ni les
 * requêtes, qui peuvent être la cause de l'erreur.
 */
export function ErreurRacine() {
  useTitrePage(TEXTES_ERREUR_RACINE.onglet)
  return (
    <ColonneConnexion>
      <TitreConnexion surtitre="Pilotage EJP" titre={TEXTES_ERREUR_RACINE.titre} taille="moyenne">
        {TEXTES_ERREUR_RACINE.recours}
      </TitreConnexion>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="min-h-14 w-full bg-lumiere px-4.5 text-[15px] font-semibold text-encre"
      >
        {TEXTES_ERREUR_RACINE.bouton}
      </button>
    </ColonneConnexion>
  )
}
