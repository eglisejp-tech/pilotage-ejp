import type { ReactNode, Ref } from 'react'

interface Props {
  /** Le titre de l'écran (h1), le même que celui de l'onglet (« {écran}, Pilotage EJP »). */
  titre: ReactNode
  /** La phrase sous le titre : ce que montre l'écran, en environ 75 caractères par ligne. */
  phrase?: ReactNode
  /** L'action principale de l'écran (« Ajouter un ministère »), à droite à partir de 1024 px. */
  action?: ReactNode
  /** Ce qui suit la phrase dans l'en-tête (message d'état, compte des lignes). */
  children?: ReactNode
  idTitre?: string
  /**
   * Titre qui reçoit le focus par programme (retour d'un panneau en page entière, création) :
   * `tabIndex={-1}`, sans contour, car il n'est pas dans l'ordre du clavier.
   */
  titreRef?: Ref<HTMLHeadingElement>
}

/**
 * En-tête de page commun (proposition 14, T69) : titre en Newsreader, phrase en `--encre-2`
 * bornée à la largeur de lecture (`max-w-lecture`, environ 75 caractères, écart 7), puis
 * l'action. Écart de 10 px entre le titre et la phrase (`gap-entete`).
 */
export function EnTetePage({ titre, phrase, action, children, idTitre, titreRef }: Props) {
  return (
    <header className="flex flex-col gap-6 ordinateur:flex-row ordinateur:items-end ordinateur:justify-between">
      <div className="flex min-w-0 flex-col gap-entete">
        <h1
          id={idTitre}
          ref={titreRef}
          tabIndex={titreRef ? -1 : undefined}
          className="font-lecture text-titre leading-tight font-medium focus:outline-hidden"
        >
          {titre}
        </h1>
        {phrase ? <p className="max-w-lecture leading-relaxed text-encre-2">{phrase}</p> : null}
        {children}
      </div>
      {action ? <div className="flex shrink-0 flex-col">{action}</div> : null}
    </header>
  )
}
