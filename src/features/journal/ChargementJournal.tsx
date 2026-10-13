import { useMotChargement } from '@/components/etats/useMotChargement'
import { EnTeteJournal } from '@/features/journal/EnTeteJournal'
import { TEXTES_JOURNAL } from '@/features/journal/textesJournal'
import type { TypeCompte } from '@/lib/base'

interface Props {
  titre: string
  profil: TypeCompte
}

/**
 * Chargement de l'écran 06 (LISEZMOI, « États ») : le titre, sa phrase et le filet tout de suite ;
 * après 300 ms, « Chargement » en `--encre-3` à la place de la liste, avec `aria-busy`, puis, après
 * 4 s, « Chargement plus long que d'habitude » (m248). Pas d'animation. Les 10 s et l'erreur
 * viennent des lectures.
 */
export function ChargementJournal({ titre, profil }: Props) {
  const mot = useMotChargement(TEXTES_JOURNAL.chargement)
  return (
    <div aria-busy="true" className="flex flex-col gap-9">
      <EnTeteJournal titre={titre} profil={profil} />
      <div className="flex flex-col border-t-2 border-encre">
        {/* La zone d'annonce existe dès le départ, vide : « Chargement » y entre après 300 ms. */}
        <p role="status" className="py-[18px] text-encre-3">
          {mot}
        </p>
      </div>
    </div>
  )
}
