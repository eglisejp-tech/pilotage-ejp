import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { usePiegeFocus } from '@/features/saisie/usePiegeFocus'
import { lireRefusModeration } from '@/features/moderation/refus'
import { schemaChoixMasquage } from '@/features/moderation/schemas'
import type { ChoixMasquage } from '@/features/moderation/schemas'
import { MOTIFS_RADIO, TEXTES_FENETRE_MASQUAGE } from '@/features/moderation/textes'
import type { MotifMasquage } from '@/lib/base'

/** Un champ que la fenêtre propose de masquer (jamais un champ déjà masqué ou vide). */
export interface ChampMasquable {
  /** Nom de la colonne, tel que `masquer_texte` le reçoit. */
  code: string
  /** « Ce qui se passe » */
  libelle: string
  /** Le texte actuel, montré pour que EJP Tech choisisse le bon champ. */
  texte: string
}

interface Props {
  /** Ce qu'on masque, sous le titre : « Point d'attention, Social ». */
  contexte: string
  champs: readonly ChampMasquable[]
  /** L'appel à `masquer_texte`. Un refus s'affiche sous les boutons, la fenêtre reste ouverte. */
  masquer: (choix: ChoixMasquage) => Promise<void>
  /** Texte masqué : la fenêtre se ferme par le parent, qui dit « Texte masqué. ». */
  onFait: () => void
  onAnnuler: () => void
}

const classeRadioBase =
  'size-5 shrink-0 accent-encre focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-encre'
const classeRadioChamp = `mt-0.5 ${classeRadioBase}`
const classeRadioMotif = classeRadioBase

/**
 * Fenêtre « Masquer le texte » (BRIEF, « Modération » ; écran 15) : le choix du champ (seulement
 * les champs non vides et pas déjà masqués), le motif par boutons radio, la phrase « Le texte sera
 * remplacé par ... Cette action ne peut pas être annulée. », puis « Masquer définitivement ». Il
 * n'y a aucun champ libre : ni rappel sur les données personnelles, ni compteur. Fenêtre modale :
 * le focus y reste, Échap annule, le focus revient au bouton d'origine (ou au titre de la ligne,
 * quand ce bouton a disparu). Avec un seul champ, il est déjà choisi et se lit en citation.
 */
export function FenetreMasquage({ contexte, champs, masquer, onFait, onAnnuler }: Props) {
  const idTitre = useId()
  const idContexte = useId()
  const idAvertissement = useId()
  const idErreurChamp = useId()
  const idErreurMotif = useId()
  const nom = useId()
  const fenetre = useRef<HTMLDivElement>(null)
  const unSeul = champs.length === 1
  const [champ, setChamp] = useState<string>(unSeul ? (champs[0]?.code ?? '') : '')
  const [motif, setMotif] = useState<MotifMasquage | ''>('')
  const [erreurs, setErreurs] = useState<{ champ?: string; motif?: string }>({})
  const [refus, setRefus] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  usePiegeFocus(fenetre, true, () => {
    if (!enCours) onAnnuler()
  })

  // La page ne défile plus derrière la fenêtre.
  useEffect(() => {
    const avant = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = avant
    }
  }, [])

  const soumettre = async () => {
    if (enCours) return
    setRefus(null)
    const lu = schemaChoixMasquage.safeParse({ champ, motif })
    if (!lu.success) {
      const messages: { champ?: string; motif?: string } = {}
      for (const probleme of lu.error.issues) {
        const cle = probleme.path[0]
        if (cle === 'champ') messages.champ ??= probleme.message
        if (cle === 'motif') messages.motif ??= probleme.message
      }
      setErreurs(messages)
      return
    }
    setErreurs({})
    setEnCours(true)
    try {
      await masquer(lu.data)
      onFait()
    } catch (erreur) {
      setRefus(lireRefusModeration(erreur))
      setEnCours(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div aria-hidden="true" className="absolute inset-0 bg-encre/50" />
      <div
        ref={fenetre}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        aria-describedby={idContexte}
        tabIndex={-1}
        className="relative flex max-h-full w-full max-w-[520px] flex-col gap-5 overflow-y-auto border border-filet bg-papier p-6 outline-hidden"
      >
        <div className="flex flex-col gap-1">
          <h2 id={idTitre} className="font-lecture text-[28px] leading-tight font-medium">
            {TEXTES_FENETRE_MASQUAGE.titre}
          </h2>
          <p id={idContexte} className="text-[15px] text-encre-2">
            {contexte}
          </p>
        </div>

        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(evenement) => {
            evenement.preventDefault()
            void soumettre()
          }}
        >
          {unSeul ? (
            <div className="flex flex-col gap-1">
              <p className="text-[15px] font-semibold">{champs[0]?.libelle}</p>
              <p className="font-lecture text-[17px] leading-snug wrap-anywhere">
                «&nbsp;{champs[0]?.texte}&nbsp;»
              </p>
            </div>
          ) : (
            <fieldset
              aria-describedby={erreurs.champ ? idErreurChamp : undefined}
              className="flex min-w-0 flex-col gap-1"
            >
              <legend className="mb-1 text-[15px] font-semibold">
                {TEXTES_FENETRE_MASQUAGE.legendeChamp}
              </legend>
              {champs.map((possible) => (
                <label
                  key={possible.code}
                  className="flex min-h-cible cursor-pointer items-start gap-3 py-2"
                >
                  <input
                    type="radio"
                    name={`${nom}-champ`}
                    value={possible.code}
                    checked={champ === possible.code}
                    onChange={() => setChamp(possible.code)}
                    aria-invalid={erreurs.champ ? true : undefined}
                    className={classeRadioChamp}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[15px] font-semibold">{possible.libelle}</span>
                    <span className="font-lecture text-[17px] leading-snug wrap-anywhere text-encre-2">
                      «&nbsp;{possible.texte}&nbsp;»
                    </span>
                  </span>
                </label>
              ))}
              {erreurs.champ ? (
                <p id={idErreurChamp} className="text-[15px] leading-normal text-alerte">
                  {erreurs.champ}
                </p>
              ) : null}
            </fieldset>
          )}

          <fieldset
            aria-describedby={erreurs.motif ? idErreurMotif : undefined}
            className="flex min-w-0 flex-col gap-1"
          >
            <legend className="mb-1 text-[15px] font-semibold">
              {TEXTES_FENETRE_MASQUAGE.legendeMotif}
            </legend>
            {MOTIFS_RADIO.map((possible) => (
              <label
                key={possible.code}
                className="flex min-h-cible cursor-pointer items-center gap-3 py-1"
              >
                <input
                  type="radio"
                  name={`${nom}-motif`}
                  value={possible.code}
                  checked={motif === possible.code}
                  onChange={() => setMotif(possible.code)}
                  aria-invalid={erreurs.motif ? true : undefined}
                  className={classeRadioMotif}
                />
                <span className="text-[15px] leading-snug">{possible.libelle}</span>
              </label>
            ))}
            {erreurs.motif ? (
              <p id={idErreurMotif} className="text-[15px] leading-normal text-alerte">
                {erreurs.motif}
              </p>
            ) : null}
          </fieldset>

          <p id={idAvertissement} className="leading-normal text-encre-2">
            {TEXTES_FENETRE_MASQUAGE.avertissement}
          </p>

          <div className="flex flex-col-reverse gap-2 min-[480px]:flex-row min-[480px]:justify-end">
            <button
              type="button"
              onClick={() => {
                if (!enCours) onAnnuler()
              }}
              aria-disabled={enCours ? true : undefined}
              className="inline-flex min-h-cible items-center justify-center border border-encre bg-papier px-4.5 text-[15px] font-semibold text-encre hover:bg-fond"
            >
              {TEXTES_FENETRE_MASQUAGE.annuler}
            </button>
            <button
              type="submit"
              aria-describedby={idAvertissement}
              aria-disabled={enCours ? true : undefined}
              className="inline-flex min-h-cible items-center justify-center bg-encre px-4.5 text-[15px] font-semibold text-papier aria-disabled:cursor-wait"
            >
              {enCours ? TEXTES_FENETRE_MASQUAGE.boutonEnCours : TEXTES_FENETRE_MASQUAGE.bouton}
            </button>
          </div>
          {refus !== null ? <ErreurFormulaire message={refus} /> : null}
        </form>
      </div>
    </div>,
    document.body,
  )
}
