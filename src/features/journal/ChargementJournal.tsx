import { useEffect, useState } from 'react'
import { EnTeteJournal } from '@/features/journal/EnTeteJournal'
import { TEXTES_JOURNAL } from '@/features/journal/textesJournal'
import type { TypeCompte } from '@/lib/base'

/** « Chargement » n'apparaît qu'après 300 ms : une réponse rapide ne fait rien clignoter. */
export const DELAI_CHARGEMENT = 300

interface Props {
  titre: string
  profil: TypeCompte
}

/**
 * Chargement de l'écran 06 (LISEZMOI, « États ») : le titre, sa phrase et le filet tout de suite ;
 * après 300 ms, « Chargement » en `--encre-3` à la place de la liste, avec `aria-busy`. Pas
 * d'animation. Les 10 s et l'erreur viennent des lectures.
 */
export function ChargementJournal({ titre, profil }: Props) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const minuterie = setTimeout(() => setVisible(true), DELAI_CHARGEMENT)
    return () => clearTimeout(minuterie)
  }, [])
  return (
    <div aria-busy="true" className="flex flex-col gap-9">
      <EnTeteJournal titre={titre} profil={profil} />
      <div className="flex flex-col border-t-2 border-encre">
        {/* La zone d'annonce existe dès le départ, vide : « Chargement » y entre après 300 ms. */}
        <p role="status" className="py-[18px] text-encre-3">
          {visible ? TEXTES_JOURNAL.chargement : null}
        </p>
      </div>
    </div>
  )
}
