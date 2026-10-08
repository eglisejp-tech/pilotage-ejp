import { COLONNES_JOURNAL } from '@/features/journal/colonnesJournal'
import type { LigneJournalAffichee } from '@/features/journal/modeleJournal'
import { TEXTES_JOURNAL } from '@/features/journal/textesJournal'
import { cn } from '@/lib/utils'

interface Props {
  lignes: readonly LigneJournalAffichee[]
}

/**
 * Tableau du journal (maquette 06) : Date, Compte, Action et Détail à partir de 1024 px, puis une
 * ligne par entrée, du plus récent au plus ancien. En dessous, chaque entrée est une carte (la
 * date, le compte et l'action, puis le détail) et l'en-tête disparaît. L'en-tête est décoratif pour
 * les lecteurs d'écran : chaque entrée nomme ce qu'elle contient. Un texte libre que EJP Tech a
 * masqué s'affiche en `--encre-3`.
 */
export function ListeJournal({ lignes }: Props) {
  return (
    <div>
      <div
        aria-hidden="true"
        className={cn('hidden pt-3 pb-2 text-note text-encre-3', COLONNES_JOURNAL)}
      >
        <span>{TEXTES_JOURNAL.entetes.date}</span>
        <span>{TEXTES_JOURNAL.entetes.compte}</span>
        <span>{TEXTES_JOURNAL.entetes.action}</span>
        <span>{TEXTES_JOURNAL.entetes.detail}</span>
      </div>
      <ol aria-label={TEXTES_JOURNAL.liste} className="flex flex-col">
        {lignes.map((ligne) => (
          <li
            key={ligne.id}
            className={cn(
              'border-t border-filet py-3.5 text-[15px] lg:items-baseline',
              COLONNES_JOURNAL,
            )}
          >
            <span className="block text-sm text-encre-2 tabular-nums lg:text-[15px]">
              {ligne.quand}
            </span>
            <div className="flex flex-wrap items-baseline gap-x-3 lg:contents">
              <span className="block min-w-0 font-semibold break-words">
                <span className="sr-only">{TEXTES_JOURNAL.motsDeLigne.compte} : </span>
                {ligne.compte}
              </span>
              <span className="block min-w-0 break-words">
                <span className="sr-only">{TEXTES_JOURNAL.motsDeLigne.action} : </span>
                {ligne.action}
              </span>
            </div>
            <span className="mt-1 block min-w-0 break-words text-encre-2 lg:mt-0">
              <span className="sr-only">{TEXTES_JOURNAL.motsDeLigne.detail} : </span>
              {ligne.detail.map((segment, rang) =>
                segment.masque ? (
                  <span key={rang} className="text-encre-3">
                    {segment.texte}
                  </span>
                ) : (
                  <span key={rang}>{segment.texte}</span>
                ),
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
