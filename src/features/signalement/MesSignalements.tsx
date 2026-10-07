import { useId } from 'react'
import { EtatVide } from '@/components/etats/EtatVide'
import { TEXTES_VIDES } from '@/features/cette-semaine/textesVides'
import type { LigneSignalement } from '@/data/signalements'
import { TexteSignale } from '@/features/signalement/TexteSignale'
import { TEXTES_MES_SIGNALEMENTS } from '@/features/signalement/textes'

/** Ce que montre « Vos derniers signalements ». */
export type ContenuMesSignalements =
  | { etat: 'chargement' }
  | { etat: 'probleme'; reessayer: () => void }
  | { etat: 'liste'; signalements: LigneSignalement[] }

interface Props {
  contenu: ContenuMesSignalements
}

/**
 * « Vos derniers signalements », sous le formulaire (plan E8, proposé) : les trois derniers du
 * ministère, avec « Ouvert » ou « Clos le 8 oct. » et la réponse d'EJP Tech s'il y en a une.
 * Premier usage : rien n'est affiché (pas de bloc vide sous un formulaire). Pendant la lecture,
 * rien non plus : le formulaire reste le contenu principal.
 */
export function MesSignalements({ contenu }: Props) {
  const idTitre = useId()
  if (contenu.etat === 'chargement') return null
  if (contenu.etat === 'liste' && contenu.signalements.length === 0) return null

  return (
    <section aria-labelledby={idTitre} className="flex flex-col gap-1 border-t border-filet pt-5">
      <h2 id={idTitre} className="font-lecture text-[22px] leading-tight font-medium">
        {TEXTES_MES_SIGNALEMENTS.titre}
      </h2>
      {contenu.etat === 'probleme' ? (
        <EtatVide
          situation="probleme_passager"
          action={{ libelle: TEXTES_VIDES.page.reessayer, surClic: contenu.reessayer }}
        >
          {TEXTES_VIDES.page.erreur}
        </EtatVide>
      ) : (
        <ul>
          {contenu.signalements.map((signalement) => (
            <li
              key={signalement.id}
              className="flex flex-col gap-1 border-t border-filet py-3.5 first:border-t-0"
            >
              <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-note">
                <span className="text-encre-3">
                  {TEXTES_MES_SIGNALEMENTS.ligne(signalement.ecran, signalement.saisi_le)}
                </span>
                <span className="font-semibold text-encre-2">
                  {signalement.ouvert || signalement.clos_le === null
                    ? TEXTES_MES_SIGNALEMENTS.ouvert
                    : TEXTES_MES_SIGNALEMENTS.clos(signalement.clos_le)}
                </span>
              </p>
              <p className="font-lecture text-[17px] leading-snug">
                «&nbsp;
                <TexteSignale texte={signalement.texte} />
                &nbsp;»
              </p>
              {signalement.commentaire ? (
                <p className="text-sm leading-normal text-encre-2">
                  {TEXTES_MES_SIGNALEMENTS.commentaire}{' '}
                  <TexteSignale texte={signalement.commentaire} />
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
