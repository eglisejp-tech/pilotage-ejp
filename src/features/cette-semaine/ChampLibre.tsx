import type { TexteLibre } from './types'

interface Props {
  texte: TexteLibre
}

/**
 * Champ libre écrit par un ministère (titre, description, action attendue d'un point, nom d'un
 * événement). Masqué par EJP Tech, il s'affiche en `--encre-3`, partout (BRIEF, « Modération ») ;
 * sinon il garde la couleur de son bloc.
 */
export function ChampLibre({ texte }: Props) {
  if (!texte.masque) return <>{texte.texte}</>
  return <span className="text-encre-3">{texte.texte}</span>
}
