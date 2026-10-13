import { useState } from 'react'
import { FenetreMasquage } from '@/features/moderation/FenetreMasquage'
import type { ChampMasquable } from '@/features/moderation/FenetreMasquage'
import type { Masquage } from '@/features/moderation/schemas'
import { TEXTES_MODERATION } from '@/features/moderation/textes'
import type { CibleMasquable } from '@/lib/base'

interface Props {
  /** Ce qu'on masque, sous le titre de la fenêtre : « Indicateur à valider, Communication ». */
  contexte: string
  /** Le « Pourquoi » (cible `demande_indicateur`) ou le motif d'un refus (cible `validation`). */
  cible: Extract<CibleMasquable, 'demande_indicateur' | 'validation'>
  cibleId: string
  champ: ChampMasquable
  /** L'appel à `masquer_texte`. */
  masquer: (masquage: Masquage) => Promise<void>
  /** Texte masqué : le bloc annonce « Texte masqué. » et rend le focus à son titre. */
  surMasque: () => void
  /** Identifiant du titre de la ligne : le lecteur d'écran sait de quelle ligne il s'agit. */
  decritPar: string
}

const boutonSecondaire =
  'inline-flex min-h-cible items-center border border-encre bg-papier px-4 text-[15px] font-semibold whitespace-nowrap text-encre hover:bg-fond'

/**
 * « Masquer le texte » sous un « Pourquoi » ou un motif de refus (EJP Tech seulement ;
 * validation-metier.md, 2.2). Ce champ n'a volontairement aucun rappel sur les données
 * personnelles (T30) : le masquage est le recours si un ministère y écrit une donnée personnelle.
 * La fenêtre est celle de l'écran Modération (`masquer_texte`, motif dans une liste, définitif).
 */
export function MasquageTexte({
  contexte,
  cible,
  cibleId,
  champ,
  masquer,
  surMasque,
  decritPar,
}: Props) {
  const [fenetre, setFenetre] = useState(false)
  return (
    <>
      <button
        type="button"
        aria-describedby={decritPar}
        aria-haspopup="dialog"
        onClick={() => setFenetre(true)}
        className={boutonSecondaire}
      >
        {TEXTES_MODERATION.boutonMasquer}
      </button>
      {fenetre ? (
        <FenetreMasquage
          contexte={contexte}
          champs={[champ]}
          masquer={(choix) => masquer({ cible, cibleId, champ: choix.champ, motif: choix.motif })}
          onFait={() => {
            setFenetre(false)
            surMasque()
          }}
          onAnnuler={() => setFenetre(false)}
        />
      ) : null}
    </>
  )
}
