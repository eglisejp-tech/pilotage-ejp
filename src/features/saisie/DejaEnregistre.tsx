interface Props {
  /** « Ce statut est déjà enregistré. Choisissez-en un autre. » ; null : rien à dire. */
  message: string | null
  /** Numéro de l'essai : un nouvel appui sur le bouton annonce de nouveau la phrase. */
  essai: number
}

/**
 * « Déjà enregistré » (guide des messages, 10.10) : la personne enregistre exactement ce qui l'est
 * déjà, rien ne part, et la phrase dit quoi changer. Sous le bouton d'enregistrement, dans une
 * région `role="status"` toujours présente (pour être annoncée) qui ne prend pas de place vide :
 * sa marge négative annule l'écart de 20 px du formulaire.
 */
export function DejaEnregistre({ message, essai }: Props) {
  return (
    <div role="status" className="-mt-5 has-[p]:mt-0">
      {message !== null ? (
        <p key={essai} className="text-[15px] leading-normal text-encre-3">
          {message}
        </p>
      ) : null}
    </div>
  )
}
