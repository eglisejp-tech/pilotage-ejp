import { useEffect, useRef } from 'react'
import { EtatVide } from '@/components/etats/EtatVide'
import { BarreFiltres } from '@/features/journal/BarreFiltres'
import { EnTeteJournal } from '@/features/journal/EnTeteJournal'
import { aDesFiltres, FILTRES_RETIRES } from '@/features/journal/filtres'
import type { FiltresJournal } from '@/features/journal/filtres'
import { ListeJournal } from '@/features/journal/ListeJournal'
import type { DonneesJournal } from '@/features/journal/modeleJournal'
import { TEXTES_JOURNAL } from '@/features/journal/textesJournal'
import type { TypeCompte } from '@/lib/base'
import { ErreurDePage } from '@/pages/ErreurDePage'

interface Props {
  /** « Journal », « Mon journal » ou « Journal technique ». */
  titre: string
  profil: TypeCompte
  donnees: DonneesJournal
  /** Change les filtres : l'adresse les porte (BRIEF, section 9). */
  surFiltres: (suivants: FiltresJournal) => void
  /** « Afficher 50 lignes de plus ». */
  surPlus: () => void
  /**
   * Relance la lecture qui a échoué alors que des lignes sont déjà à l'écran ; null : rien n'a
   * échoué. Les lignes et les filtres restent, le bandeau d'erreur s'ajoute sous la liste.
   */
  surReessayer?: (() => void) | null
}

const classeBouton =
  'inline-flex min-h-cible items-center border border-encre bg-papier px-4 text-sm font-semibold whitespace-nowrap text-encre hover:bg-fond'

/**
 * Écran 06 « Journal » (berger, conseil, administration de l'église), « Mon journal » (ministère)
 * et « Journal technique » (EJP Tech) : titre et phrase, filtres Compte, Action et Période (pas de
 * « Compte » pour le ministère), tableau du plus récent au plus ancien, 50 lignes puis « Afficher
 * 50 lignes de plus ». Les filtres sont dans l'adresse. Sans ligne : « Aucune ligne pour ces
 * filtres. » et « Retirer les filtres ».
 */
export function VueJournal({
  titre,
  profil,
  donnees,
  surFiltres,
  surPlus,
  surReessayer = null,
}: Props) {
  const { filtres, lignes, aPlus, enMiseAJour } = donnees
  const enEchec = surReessayer !== null && !enMiseAJour
  const compteur = useRef<HTMLParagraphElement>(null)
  const aDemandePlus = useRef(false)

  // Quand le bouton disparaît (c'était la dernière page), le focus passe au compteur : il ne se
  // perd pas dans la page.
  useEffect(() => {
    if (aDemandePlus.current && !aPlus && !enMiseAJour) {
      aDemandePlus.current = false
      compteur.current?.focus()
    }
  }, [aPlus, enMiseAJour])

  return (
    <div className="flex flex-col gap-9">
      <EnTeteJournal titre={titre} profil={profil} />
      <BarreFiltres donnees={donnees} surFiltres={surFiltres} />
      <div aria-busy={enMiseAJour} className="flex min-w-0 flex-col border-t-2 border-encre">
        {lignes.length === 0 ? (
          aDesFiltres(filtres) ? (
            <EtatVide
              situation="aucun_resultat"
              action={{
                libelle: TEXTES_JOURNAL.vide.retirer,
                surClic: () => surFiltres(FILTRES_RETIRES),
              }}
            >
              {TEXTES_JOURNAL.vide.pourCesFiltres}
            </EtatVide>
          ) : (
            <EtatVide situation="premier_usage">{TEXTES_JOURNAL.vide.sansFiltre}</EtatVide>
          )
        ) : (
          <>
            <ListeJournal lignes={lignes} />
            <div className="flex flex-col items-start gap-3 pt-5">
              {aPlus && !enEchec ? (
                <button
                  type="button"
                  className={classeBouton}
                  onClick={() => {
                    aDemandePlus.current = true
                    surPlus()
                  }}
                >
                  {TEXTES_JOURNAL.plus}
                </button>
              ) : null}
              <p
                ref={compteur}
                role="status"
                tabIndex={-1}
                className="text-note text-encre-3 focus-visible:outline-hidden"
              >
                {TEXTES_JOURNAL.compteur(lignes.length, aPlus)}
              </p>
            </div>
          </>
        )}
        {enEchec && surReessayer ? (
          <div className="pt-5">
            <ErreurDePage
              message={TEXTES_JOURNAL.erreur}
              libelleBouton={TEXTES_JOURNAL.reessayer}
              onReessayer={surReessayer}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
