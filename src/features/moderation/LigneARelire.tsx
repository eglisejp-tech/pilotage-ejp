import { useId, useState } from 'react'
import { ChampLibre } from '@/features/cette-semaine/ChampLibre'
import type { TexteARelire } from '@/features/moderation/construire'
import { FenetreMasquage } from '@/features/moderation/FenetreMasquage'
import { lireRefusModeration } from '@/features/moderation/refus'
import type { ChoixMasquage } from '@/features/moderation/schemas'
import { TEXTES_MODERATION } from '@/features/moderation/textes'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'

interface Props {
  texte: TexteARelire
  /** « Rien à signaler » : appelle `marquer_relu`. */
  relire: () => Promise<void>
  /** « Masquer définitivement » : appelle `masquer_texte` pour le champ et le motif choisis. */
  masquer: (choix: ChoixMasquage) => Promise<void>
  /** Une décision est écrite : l'écran annonce ce message et rend le focus au titre de la liste. */
  surFait: (message: string) => void
}

const boutonSecondaire =
  'inline-flex min-h-cible items-center justify-center border border-encre bg-papier px-4 text-[15px] font-semibold whitespace-nowrap text-encre hover:bg-fond aria-disabled:cursor-wait'
const boutonPrincipal =
  'inline-flex min-h-cible items-center justify-center bg-encre px-4 text-[15px] font-semibold whitespace-nowrap text-papier aria-disabled:cursor-wait'

/**
 * Une ligne de la file « Champs libres à relire » (maquette 15) : le type et le ministère, puis
 * la date et l'heure de Paris ; tous les champs libres non vides entre guillemets (avec leur nom
 * quand il y en a plusieurs) ; à droite, « Rien à signaler » et « Masquer le texte » pour un texte
 * à relire, ou la décision (« Relu le 29 sept. : rien à signaler », « Masqué le 29 sept. : nom
 * d'une personne »). Un texte masqué qui garde d'autres champs non masqués garde « Masquer le
 * texte ». Un champ déjà masqué s'affiche en `--encre-3`. Une précision dit aussi l'indicateur et
 * le mois, jamais la valeur. Un refus de la base se dit sous les boutons.
 */
export function LigneARelire({ texte, relire, masquer, surFait }: Props) {
  const idTitre = useId()
  const [fenetre, setFenetre] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [refus, setRefus] = useState<string | null>(null)

  const marquerRelu = async () => {
    if (enCours) return
    setEnCours(true)
    setRefus(null)
    try {
      await relire()
      surFait(TEXTES_MODERATION.reussiteRelu)
    } catch (erreur) {
      setRefus(lireRefusModeration(erreur))
      setEnCours(false)
    }
  }

  const aRelire = texte.etat === 'a_relire'
  const peutMasquer = texte.masquables.length > 0 && texte.etat !== 'relu'
  const plusieursChamps = texte.champs.length > 1

  return (
    <article aria-labelledby={idTitre} className="flex flex-col gap-3 py-[18px]">
      <div className="grid gap-x-8 gap-y-3 min-[1024px]:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto]">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 id={idTitre} className="text-[15px] font-semibold wrap-anywhere">
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
              <p className="font-lecture text-[19px] leading-snug wrap-anywhere">
                «&nbsp;
                <ChampLibre texte={{ texte: champ.texte, masque: champ.masque }} />
                &nbsp;»
              </p>
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-col items-start gap-2 min-[1024px]:items-end">
          {texte.decision !== null ? (
            <p className="text-note text-encre-3 min-[1024px]:text-right">{texte.decision}</p>
          ) : null}
          {aRelire || peutMasquer ? (
            <div className="flex flex-wrap gap-3 max-[599px]:w-full max-[599px]:flex-col">
              {aRelire ? (
                <button
                  type="button"
                  aria-describedby={idTitre}
                  aria-disabled={enCours ? true : undefined}
                  onClick={() => void marquerRelu()}
                  className={boutonSecondaire}
                >
                  {TEXTES_MODERATION.boutonRelu}
                </button>
              ) : null}
              {peutMasquer ? (
                <button
                  type="button"
                  aria-describedby={idTitre}
                  aria-haspopup="dialog"
                  aria-disabled={enCours ? true : undefined}
                  onClick={() => {
                    if (!enCours) setFenetre(true)
                  }}
                  className={aRelire ? boutonPrincipal : boutonSecondaire}
                >
                  {TEXTES_MODERATION.boutonMasquer}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {refus !== null ? <ErreurFormulaire message={refus} /> : null}
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
