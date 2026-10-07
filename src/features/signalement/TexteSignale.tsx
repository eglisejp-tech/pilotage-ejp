import { ChampLibre } from '@/features/cette-semaine/ChampLibre'
import { TEXTE_MASQUE } from '@/features/cette-semaine/textesVides'

interface Props {
  /** Texte d'un signalement ou commentaire de clôture, tel que la base le rend. */
  texte: string
}

/**
 * Un champ libre d'un signalement (texte ou commentaire). Masqué par EJP Tech
 * (« [texte masqué par EJP Tech] »), il s'affiche en `--encre-3`, comme partout (BRIEF,
 * « Modération »).
 */
export function TexteSignale({ texte }: Props) {
  return <ChampLibre texte={{ texte, masque: texte === TEXTE_MASQUE }} />
}
