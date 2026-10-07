import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { MessageReussite } from '@/features/saisie/MessageReussite'

// Message de réussite d'une action sur un point (« Point marqué traité. », « Statut enregistré :
// En cours. »). Après « Marquer traité », la page relit ses points et le bouton, parfois la ligne
// entière, disparaît : un message porté par le bouton disparaîtrait avec lui. Le message vit donc
// dans sa propre zone, posée en bas de la page, hors de l'arbre de l'écran. Il reprend la brique
// `MessageReussite` (annoncé par `role="status"`, 6 secondes, LISEZMOI « Réussite »).

let zone: HTMLElement | null = null
let racine: Root | null = null
let envoi = 0

/** Dessine la zone : la même structure à chaque rendu, pour que la région annoncée reste en place. */
function dessiner(arbre: Root, message: string | null) {
  arbre.render(
    <div className="w-full max-w-[460px]">
      <MessageReussite message={message} envoi={envoi} />
    </div>,
  )
}

/** Délai entre la création de la région et son texte : les lecteurs d'écran annoncent un ajout. */
const DELAI_REGION_MS = 60

/** Zone du message, créée au premier besoin et gardée : la région annoncée existe avant le texte. */
function preparerZone(): { arbre: Root; neuve: boolean } {
  if (zone !== null && zone.isConnected && racine !== null) return { arbre: racine, neuve: false }
  zone = document.createElement('div')
  zone.setAttribute('data-annonce-point', '')
  zone.className =
    'pointer-events-none fixed inset-x-0 bottom-4 z-60 flex justify-center px-4 print:hidden'
  document.body.append(zone)
  racine = createRoot(zone)
  dessiner(racine, null)
  return { arbre: racine, neuve: true }
}

/** Montre le message de réussite pendant 6 secondes, en bas de la page. */
export function annoncerReussite(message: string): void {
  const { arbre, neuve } = preparerZone()
  envoi += 1
  const numero = envoi
  if (!neuve) {
    dessiner(arbre, message)
    return
  }
  window.setTimeout(() => {
    // La zone a pu être retirée entre-temps (tests) : on ne dessine pas dans un arbre démonté.
    if (racine === arbre && numero === envoi) dessiner(arbre, message)
  }, DELAI_REGION_MS)
}

/** Retire la zone du message (tests : une page propre pour chaque cas). */
export function retirerAnnonce(): void {
  racine?.unmount()
  zone?.remove()
  racine = null
  zone = null
  envoi = 0
}
