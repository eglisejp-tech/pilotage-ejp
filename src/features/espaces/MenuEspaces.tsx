import { useEffect, useId, useRef, useState } from 'react'
import type { FocusEvent, KeyboardEvent } from 'react'
import { Bouton } from '@/components/ui/Bouton'
import type { ResultatEspace } from '@/features/espaces/actions'
import { TEXTES_ESPACES } from '@/features/espaces/textes'
import { cn } from '@/lib/utils'

/** Un compte ouvert sur l'appareil, tel que la liste l'affiche. */
export type EspaceAffiche = { id: string; libelle: string; actif: boolean }

export type ProprietesEspaces = {
  /** Les comptes ouverts sur l'appareil, l'espace actif compris. */
  liste: readonly EspaceAffiche[]
  /** Faux quand l'appareil a déjà son nombre maximal de comptes. */
  peutAjouter: boolean
  surChanger: (id: string) => Promise<ResultatEspace>
  surAjouter: () => ResultatEspace
  surRetirer: () => Promise<ResultatEspace>
}

type Proprietes = ProprietesEspaces & {
  /** `en-tete` : panneau posé sous le bouton (1024 px et plus) ; `menu` : dans le menu, à la suite. */
  disposition: 'en-tete' | 'menu'
}

type Action = { type: 'changer'; id: string } | { type: 'ajouter' } | { type: 'retirer' }

const classesLien =
  'inline-flex min-h-cible items-center text-detail whitespace-nowrap text-encre-3 underline underline-offset-4'

/**
 * « Changer d'espace » (T73) : bouton de l'en-tête qui ouvre la liste des comptes ouverts sur
 * l'appareil, l'espace actif marqué, puis « Ajouter un compte » et, dès deux comptes, « Retirer ce
 * compte ». Un appui sur un autre compte y passe aussitôt. Échap ferme le panneau et rend le focus
 * au bouton ; dans l'en-tête, un clic ailleurs ou le focus qui sort le ferment aussi.
 */
export function MenuEspaces({
  liste,
  peutAjouter,
  surChanger,
  surAjouter,
  surRetirer,
  disposition,
}: Proprietes) {
  const [ouvert, setOuvert] = useState(false)
  const [enCours, setEnCours] = useState<Action | null>(null)
  const [erreur, setErreur] = useState<string>()
  const bouton = useRef<HTMLButtonElement>(null)
  const conteneur = useRef<HTMLDivElement>(null)
  const idPanneau = useId()
  const surLeCote = disposition === 'en-tete'

  // Dans l'en-tête, le panneau couvre la page : un clic ailleurs le ferme.
  useEffect(() => {
    if (!ouvert || !surLeCote) return
    function surClic(evenement: PointerEvent) {
      if (!conteneur.current?.contains(evenement.target as Node)) setOuvert(false)
    }
    document.addEventListener('pointerdown', surClic)
    return () => document.removeEventListener('pointerdown', surClic)
  }, [ouvert, surLeCote])

  function surTouche(evenement: KeyboardEvent<HTMLDivElement>) {
    if (evenement.key !== 'Escape' || !ouvert) return
    // Le menu du téléphone se ferme aussi sur Échap : seul ce panneau se ferme ici.
    evenement.stopPropagation()
    setOuvert(false)
    bouton.current?.focus()
  }

  function surSortie(evenement: FocusEvent<HTMLDivElement>) {
    const suivant = evenement.relatedTarget
    if (surLeCote && suivant instanceof Node && !conteneur.current?.contains(suivant)) {
      setOuvert(false)
    }
  }

  async function agir(action: Action) {
    if (enCours) return
    setErreur(undefined)
    setEnCours(action)
    const resultat =
      action.type === 'changer'
        ? await surChanger(action.id)
        : action.type === 'ajouter'
          ? surAjouter()
          : await surRetirer()
    // Réussite : la page se recharge dans le nouvel espace, le bouton reste « en cours ».
    if (resultat.erreur) {
      setErreur(resultat.erreur)
      setEnCours(null)
    }
  }

  const plusieurs = liste.length > 1

  return (
    <div
      ref={conteneur}
      className={surLeCote ? 'relative' : 'w-full'}
      onKeyDown={surTouche}
      onBlur={surSortie}
    >
      <button
        ref={bouton}
        type="button"
        aria-expanded={ouvert}
        aria-controls={idPanneau}
        onClick={() => setOuvert(!ouvert)}
        className={classesLien}
      >
        {TEXTES_ESPACES.bouton}
      </button>
      <div
        id={idPanneau}
        hidden={!ouvert}
        className={cn(
          'flex-col gap-3',
          surLeCote
            ? 'absolute top-full right-0 z-10 w-80 border border-filet bg-papier p-4 [&:not([hidden])]:flex'
            : 'w-full pt-1 pb-2 [&:not([hidden])]:flex',
        )}
      >
        <ul role="list" aria-label={TEXTES_ESPACES.liste} className="flex flex-col gap-2">
          {liste.map((espace) => (
            <li key={espace.id}>
              {espace.actif ? (
                <p
                  aria-current="true"
                  className="flex min-h-cible items-center text-interface wrap-anywhere text-encre"
                >
                  <span>
                    <span className="font-semibold">{espace.libelle}</span>{' '}
                    <span className="text-encre-3">({TEXTES_ESPACES.actif})</span>
                  </span>
                </p>
              ) : (
                <Bouton
                  taille="ligne-dense"
                  pleineLargeur
                  enCours={enCours?.type === 'changer' && enCours.id === espace.id}
                  libelleEnCours={TEXTES_ESPACES.changementEnCours}
                  onClick={() => void agir({ type: 'changer', id: espace.id })}
                  className="justify-start text-left wrap-anywhere"
                >
                  {TEXTES_ESPACES.passer(espace.libelle)}
                </Bouton>
              )}
            </li>
          ))}
        </ul>
        {peutAjouter ? (
          <Bouton
            taille="ligne-dense"
            pleineLargeur
            enCours={enCours?.type === 'ajouter'}
            libelleEnCours={TEXTES_ESPACES.ajoutEnCours}
            onClick={() => void agir({ type: 'ajouter' })}
          >
            {TEXTES_ESPACES.ajouter}
          </Bouton>
        ) : null}
        {plusieurs ? (
          <div className="flex flex-col items-start">
            <button
              type="button"
              aria-disabled={enCours?.type === 'retirer' || undefined}
              onClick={() => void agir({ type: 'retirer' })}
              className={cn(classesLien, 'aria-disabled:cursor-wait')}
            >
              {enCours?.type === 'retirer' ? TEXTES_ESPACES.retraitEnCours : TEXTES_ESPACES.retirer}
            </button>
            <p className="text-note text-encre-3">
              {TEXTES_ESPACES.deconnexionDeTous(liste.length)}
            </p>
          </div>
        ) : null}
        {erreur ? (
          <p role="alert" className="bg-alerte-fond px-3.5 py-3 text-detail text-alerte">
            {erreur}
          </p>
        ) : null}
      </div>
    </div>
  )
}
