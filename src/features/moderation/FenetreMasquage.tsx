import { useId, useRef, useState } from 'react'
import { Bouton } from '@/components/ui/Bouton'
import { useFenetreModale } from '@/components/ui/useFenetreModale'
import { referenceEchec } from '@/data/echecEnvoi'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
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

const classeRadio =
  'size-5 shrink-0 accent-encre focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-encre'

/**
 * Fenêtre « Masquer ce texte ? » (BRIEF, « Modération » ; écran 15) : le choix du champ (seulement
 * les champs non vides et pas déjà masqués), le motif par boutons radio, la phrase « Le texte sera
 * remplacé par « [texte masqué] ». C'est définitif. », puis « Masquer le texte » (T66), le seul
 * bouton foncé de l'écran (proposition 12, T69 : dans la ligne, il est encadré). Il n'y a aucun
 * champ libre : ni rappel sur les données personnelles, ni compteur. Avec un seul champ, il est
 * déjà choisi et se lit en citation.
 *
 * Le modèle de fenêtre commun (proposition 20, T69 ; FenetreConfirmation) : l'élément `<dialog>`
 * du navigateur, ouvert en fenêtre modale (useFenetreModale), une seule largeur de 480 px. Le
 * focus entre sur la fenêtre, y reste, Échap annule (sauf pendant l'envoi) et le focus revient au
 * bouton d'origine (ou au titre de la liste quand ce bouton a disparu, choix de l'écran).
 */
export function FenetreMasquage({ contexte, champs, masquer, onFait, onAnnuler }: Props) {
  const idTitre = useId()
  const idContexte = useId()
  const idAvertissement = useId()
  const idErreurChamp = useId()
  const idErreurMotif = useId()
  const nom = useId()
  const fenetre = useRef<HTMLDialogElement>(null)
  const unSeul = champs.length === 1
  const [champ, setChamp] = useState<string>(unSeul ? (champs[0]?.code ?? '') : '')
  const [motif, setMotif] = useState<MotifMasquage | ''>('')
  const [erreurs, setErreurs] = useState<{ champ?: string; motif?: string }>({})
  const [refus, setRefus] = useState<string | null>(null)
  const [reference, setReference] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  // Lu sans attendre le rendu : deux appuis rapprochés n'envoient qu'une fois.
  const verrou = useRef(false)

  const annulerSiLibre = () => {
    if (!verrou.current) onAnnuler()
  }
  useFenetreModale(fenetre, annulerSiLibre)

  const soumettre = async () => {
    if (verrou.current) return
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
    verrou.current = true
    setEnCours(true)
    try {
      await masquer(lu.data)
      onFait()
    } catch (erreur) {
      verrou.current = false
      setRefus(lireRefusModeration(erreur))
      setReference(referenceEchec(erreur))
      setEnCours(false)
    }
  }

  return (
    <dialog
      ref={fenetre}
      aria-modal="true"
      aria-labelledby={idTitre}
      aria-describedby={idContexte}
      tabIndex={-1}
      className="m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-[480px] overflow-y-auto border border-filet bg-papier p-6 text-encre outline-hidden backdrop:bg-encre/50 open:flex open:flex-col open:gap-5"
    >
      <div className="flex flex-col gap-1">
        {/* Lignes équilibrées : à 390 px, le « ? » ne reste jamais seul sur sa ligne. */}
        <h2 id={idTitre} className="font-lecture text-titre-fenetre text-balance">
          {TEXTES_FENETRE_MASQUAGE.titre}
        </h2>
        <p id={idContexte} className="text-interface text-encre-2">
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
            <p className="text-interface font-semibold">{champs[0]?.libelle}</p>
            <p className="font-lecture text-citation wrap-anywhere">
              «&nbsp;{champs[0]?.texte}&nbsp;»
            </p>
          </div>
        ) : (
          <fieldset
            aria-describedby={erreurs.champ ? idErreurChamp : undefined}
            className="flex min-w-0 flex-col gap-1"
          >
            <legend className="mb-1 text-interface font-semibold">
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
                  className={`mt-0.5 ${classeRadio}`}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="text-interface font-semibold">{possible.libelle}</span>
                  <span className="font-lecture text-citation wrap-anywhere text-encre-2">
                    «&nbsp;{possible.texte}&nbsp;»
                  </span>
                </span>
              </label>
            ))}
            {erreurs.champ ? (
              <p id={idErreurChamp} className="text-interface leading-normal text-alerte">
                {erreurs.champ}
              </p>
            ) : null}
          </fieldset>
        )}

        <fieldset
          aria-describedby={erreurs.motif ? idErreurMotif : undefined}
          className="flex min-w-0 flex-col gap-1"
        >
          <legend className="mb-1 text-interface font-semibold">
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
                className={classeRadio}
              />
              <span className="text-interface leading-snug">{possible.libelle}</span>
            </label>
          ))}
          {erreurs.motif ? (
            <p id={idErreurMotif} className="text-interface leading-normal text-alerte">
              {erreurs.motif}
            </p>
          ) : null}
        </fieldset>

        <p id={idAvertissement} className="leading-normal text-encre-2">
          {TEXTES_FENETRE_MASQUAGE.avertissement}
        </p>

        <div className="flex flex-col-reverse gap-2 tablette:flex-row tablette:justify-end">
          <Bouton enCours={enCours} onClick={annulerSiLibre}>
            {TEXTES_FENETRE_MASQUAGE.annuler}
          </Bouton>
          <Bouton
            type="submit"
            variante="sombre"
            enCours={enCours}
            libelleEnCours={TEXTES_FENETRE_MASQUAGE.boutonEnCours}
            aria-describedby={idAvertissement}
          >
            {TEXTES_FENETRE_MASQUAGE.bouton}
          </Bouton>
        </div>
        {refus !== null ? (
          <ErreurFormulaire message={refus} reference={reference} ecranEjpTech />
        ) : null}
      </form>
    </dialog>
  )
}
