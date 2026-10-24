import { EnTetePage } from '@/components/ui/EnTetePage'
import { TEXTES_JOURNAL } from '@/features/journal/textesJournal'
import type { TypeCompte } from '@/lib/base'

interface Props {
  /** « Journal », « Mon journal » ou « Journal technique ». */
  titre: string
  profil: TypeCompte
}

/**
 * Titre et phrase de l'écran 06 (maquette 06), dans l'en-tête de page commun (T69) : ils restent
 * à l'écran dans tous les états.
 */
export function EnTeteJournal({ titre, profil }: Props) {
  return <EnTetePage titre={titre} phrase={TEXTES_JOURNAL.introduction(profil)} />
}
