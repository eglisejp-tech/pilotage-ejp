interface Props {
  titre: string
  texte: string
}

/**
 * L'aperçu d'un panneau (« Publications, septembre 2026 : __ », « Par exemple : 16 sur 20, soit
 * 80 % ») : un encadré discret qui montre ce que la personne va créer, avant l'envoi.
 */
export function ApercuDeSaisie({ titre, texte }: Props) {
  return (
    <div className="flex flex-col gap-1 border border-filet bg-fond px-3.5 py-3">
      <p className="text-note font-semibold text-encre-3">{titre}</p>
      <p className="font-lecture text-[17px] leading-snug wrap-anywhere">{texte}</p>
    </div>
  )
}
