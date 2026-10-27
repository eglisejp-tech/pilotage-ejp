import { useId, useState } from 'react'
import { Bouton } from '@/components/ui/Bouton'
import { referenceEchec } from '@/data/echecEnvoi'
import { ChampLibre } from '@/features/cette-semaine/ChampLibre'
import { RANGEE_FILE } from '@/features/moderation/colonnesFile'
import type { TexteARelire } from '@/features/moderation/construire'
import { FenetreMasquage } from '@/features/moderation/FenetreMasquage'
import { lireRefusModeration } from '@/features/moderation/refus'
import type { ChoixMasquage } from '@/features/moderation/schemas'
import { TEXTES_MODERATION } from '@/features/moderation/textes'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { cn } from '@/lib/utils'

interface Props {
  texte: TexteARelire
  /** « Marquer relu » : appelle `marquer_relu`. */
  relire: () => Promise<void>
  /** « Masquer le texte » (fenêtre) : appelle `masquer_texte` pour le champ et le motif choisis. */
  masquer: (choix: ChoixMasquage) => Promise<void>
  /** Une décision est écrite : l'écran annonce ce message et rend le focus au titre de la liste. */
  surFait: (message: string) => void
}

/**
 * Une ligne de la file « Textes à relire » (maquette 15) : le type et le ministère, puis la date
 * et l'heure de Paris ; tous les champs libres non vides entre guillemets (avec leur nom quand il
 * y en a plusieurs) ; à droite, « Marquer relu » et « Masquer le texte » pour un texte à relire,
 * ou la décision (« Relu le 29 sept. », « Masqué le 29 sept. : nom d'une personne »). Un texte
 * relu ou masqué qui garde des champs non masqués garde « Masquer le texte » (une donnée
 * personnelle peut être signalée après la relecture). Un champ déjà masqué s'affiche en
 * `--encre-3`. Une précision dit aussi l'indicateur et le mois, jamais la valeur. Un refus de la
 * base se dit sous les boutons.
 *
 * « Masquer le texte », un geste définitif, est encadré comme dans « Signalements » : rien
 * n'attire l'œil avant « Marquer relu », l'action courante ; le fond foncé n'apparaît que dans la
 * fenêtre de confirmation (proposition 12, T69 ; écart 5 avec la maquette 15). À partir de
 * 1024 px, les trois colonnes sont celles de la liste (colonnesFile.ts).
 */
export function LigneARelire({ texte, relire, masquer, surFait }: Props) {
  const idTitre = useId()
  const [fenetre, setFenetre] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [refus, setRefus] = useState<string | null>(null)
  const [reference, setReference] = useState<string | null>(null)

  const marquerRelu = async () => {
    if (enCours) return
    setEnCours(true)
    setRefus(null)
    try {
      await relire()
      surFait(TEXTES_MODERATION.reussiteRelu)
    } catch (erreur) {
      setRefus(lireRefusModeration(erreur))
      setReference(referenceEchec(erreur))
      setEnCours(false)
    }
  }

  const aRelire = texte.etat === 'a_relire'
  const peutMasquer = texte.masquables.length > 0
  const plusieursChamps = texte.champs.length > 1

  return (
    <article
      aria-labelledby={idTitre}
      className={cn('grid gap-x-8 gap-y-3 py-[18px]', RANGEE_FILE)}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <h3 id={idTitre} className="text-interface font-semibold wrap-anywhere">
          {texte.entete}
        </h3>
        <p className="text-note text-encre-3">{texte.quand}</p>
        {texte.indicateur !== null ? (
          <p className="text-note wrap-anywhere text-encre-3">{texte.indicateur}</p>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        {texte.champs.map((champ) => (
          <div key={champ.code} className="flex min-w-0 flex-col">
            {plusieursChamps ? (
              <span className="text-note text-encre-3">{champ.libelle}</span>
            ) : null}
            <p className="font-lecture text-citation wrap-anywhere">
              «&nbsp;
              <ChampLibre texte={{ texte: champ.texte, masque: champ.masque }} />
              &nbsp;»
            </p>
          </div>
        ))}
      </div>
      <div className="flex min-w-0 flex-col items-start gap-2 ordinateur:items-end">
        {texte.decision !== null ? (
          <p className="text-note text-encre-3 ordinateur:text-right">{texte.decision}</p>
        ) : null}
        {aRelire || peutMasquer ? (
          <div className="flex flex-wrap gap-3 max-tablette:w-full max-tablette:flex-col">
            {aRelire ? (
              <Bouton
                aria-describedby={idTitre}
                enCours={enCours}
                onClick={() => void marquerRelu()}
                className="whitespace-nowrap"
              >
                {TEXTES_MODERATION.boutonRelu}
              </Bouton>
            ) : null}
            {peutMasquer ? (
              <Bouton
                aria-describedby={idTitre}
                aria-haspopup="dialog"
                enCours={enCours}
                onClick={() => {
                  if (!enCours) setFenetre(true)
                }}
                className="whitespace-nowrap"
              >
                {TEXTES_MODERATION.boutonMasquer}
              </Bouton>
            ) : null}
          </div>
        ) : null}
      </div>
      {refus !== null ? (
        <div className="ordinateur:col-span-full">
          <ErreurFormulaire message={refus} reference={reference} ecranEjpTech />
        </div>
      ) : null}
      {fenetre ? (
        <FenetreMasquage
          contexte={texte.entete}
          champs={texte.masquables}
          masquer={masquer}
          onFait={() => {
            setFenetre(false)
            surFait(TEXTES_MODERATION.reussiteMasque)
          }}
          onAnnuler={() => setFenetre(false)}
        />
      ) : null}
    </article>
  )
}
