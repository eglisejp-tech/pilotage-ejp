import type { EcartFiche } from '@/features/fiche/modeleFiche'

const COULEURS: Record<EcartFiche['sens'], string> = {
  hausse: 'font-bold text-bien',
  baisse: 'font-bold text-alerte',
  stable: 'font-bold text-encre-3',
  non_saisi: 'text-encre-3',
}

interface Props {
  ecart: EcartFiche
}

/**
 * Écart d'un ministère à la période précédente (règle 12) : « +1 », « −2 », ou « dimanche 20 sept.
 * non saisi ». Le texte se lit, la couleur ne fait que le doubler. À partir de 768 px, la colonne
 * est étroite : « +1 » seul, la description pour les lecteurs d'écran. En dessous, l'écart a sa
 * propre ligne : il dit à quoi il se compare (« +1 par rapport à dimanche dernier »), en texte
 * visible.
 */
export function EcartLigne({ ecart }: Props) {
  if (ecart.sens === 'non_saisi') {
    return <span className={`text-note ${COULEURS.non_saisi}`}>{ecart.texte}</span>
  }
  return (
    <span className={`text-sm md:whitespace-nowrap ${COULEURS[ecart.sens]}`}>
      <span aria-hidden="true" className="hidden md:inline">
        {ecart.texte}
      </span>
      <span className="not-sr-only md:sr-only">{ecart.description}</span>
    </span>
  )
}
