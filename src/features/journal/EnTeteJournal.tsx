import { TEXTES_JOURNAL } from '@/features/journal/textesJournal'
import type { TypeCompte } from '@/lib/base'

interface Props {
  /** « Journal », « Mon journal » ou « Journal technique ». */
  titre: string
  profil: TypeCompte
}

/** Titre et phrase de l'écran 06 (maquette 06) : ils restent à l'écran dans tous les états. */
export function EnTeteJournal({ titre, profil }: Props) {
  return (
    <header className="flex flex-col gap-2.5">
      <h1 className="font-lecture text-titre leading-tight font-medium">{titre}</h1>
      <p className="max-w-[720px] leading-relaxed text-encre-2">
        {TEXTES_JOURNAL.introduction(profil)}
      </p>
    </header>
  )
}
