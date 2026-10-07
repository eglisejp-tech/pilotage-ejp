import { useId, useState } from 'react'
import { Link } from 'react-router'
import { Aide } from '@/components/aide/Aide'
import { EtatVide } from '@/components/etats/EtatVide'
import { ChampLibre as Libre } from '@/features/cette-semaine/ChampLibre'
import type { LigneAlerte } from '@/features/cette-semaine/construireAlerte'
import { TEXTES_A_CONFIRMER } from '@/features/cette-semaine/textesAConfirmer'
import { aDesLignesCachees, lignesVisibles } from '@/lib/metier/alerteEvenements'
import { cn } from '@/lib/utils'

export type EtatAConfirmer =
  | { etat: 'chargement' }
  | { etat: 'erreur'; reessayer: () => void }
  | { etat: 'donnees'; lignes: readonly LigneAlerte[] }

interface Props {
  etat: EtatAConfirmer
}

const TON: Record<LigneAlerte['ton'], string> = {
  attention: 'text-attention',
  alerte: 'text-alerte',
}

/**
 * Bloc « Événements à confirmer » (T31), sous « À décider » pour le berger, le conseil et EJP Tech
 * (qui le lit sans aucun bouton). Une phrase, puis les événements par date, la plus ancienne
 * d'abord : « Soirée de louange », Communication : samedi 10 oct., dans 3 jours. Le nom du
 * ministère ouvre sa fiche. 5 lignes, puis « Voir les 8 événements à confirmer », qui déplie la
 * suite sur place. Une alerte n'a pas d'état vide : sans événement à confirmer (et pendant le
 * chargement), le bloc n'existe pas, ni titre ni cadre. Un problème passager, lui, se dit.
 */
export function EvenementsAConfirmer({ etat }: Props) {
  const idTitre = useId()
  const idListe = useId()
  const [deplie, setDeplie] = useState(false)
  if (etat.etat === 'chargement') return null
  if (etat.etat === 'donnees' && etat.lignes.length === 0) return null

  const lignes = etat.etat === 'donnees' ? etat.lignes : []
  const affichees = lignesVisibles(lignes, deplie)
  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
      <div
        data-ligne-aide
        className="flex items-center gap-1 border-b-2 border-encre pb-3 [&>button]:-my-3"
      >
        <h2 id={idTitre} className="font-lecture text-section leading-tight font-medium">
          {TEXTES_A_CONFIRMER.titre}
        </h2>
        <Aide code="accueil.aConfirmer" libelle={TEXTES_A_CONFIRMER.titre} placement="flottante" />
      </div>
      {etat.etat === 'erreur' ? (
        <EtatVide
          situation="probleme_passager"
          action={{ libelle: TEXTES_A_CONFIRMER.reessayer, surClic: etat.reessayer }}
        >
          {TEXTES_A_CONFIRMER.erreur}
        </EtatVide>
      ) : (
        <>
          <p className="py-3 text-[15px] text-encre-2">{TEXTES_A_CONFIRMER.phrase}</p>
          <ul id={idListe} className="flex flex-col">
            {affichees.map((ligne) => (
              <li
                key={ligne.id}
                className="border-t border-filet py-3 text-[15px] leading-normal break-words"
              >
                «&nbsp;
                <Libre texte={ligne.titre} />
                &nbsp;»,{' '}
                <Link
                  to={`/ministeres/${ligne.ministereId}`}
                  className="-my-3 inline-flex min-h-cible min-w-cible items-center justify-center text-nuit underline underline-offset-4"
                >
                  {ligne.ministere}
                </Link>{' '}
                : {ligne.jour},{' '}
                <span className={cn('font-semibold', TON[ligne.ton])}>{ligne.texteDate}</span>
              </li>
            ))}
          </ul>
          {aDesLignesCachees(lignes.length) ? (
            <button
              type="button"
              aria-expanded={deplie}
              aria-controls={idListe}
              onClick={() => setDeplie((valeur) => !valeur)}
              className="mt-2 inline-flex min-h-cible items-center self-start border border-encre bg-papier px-4 text-sm font-semibold whitespace-nowrap text-encre hover:bg-fond"
            >
              {deplie ? TEXTES_A_CONFIRMER.replier : TEXTES_A_CONFIRMER.voirTout(lignes.length)}
            </button>
          ) : null}
        </>
      )}
    </section>
  )
}
