interface Props {
  texte: string
}

/** Un mot composé : des lettres de part et d'autre d'un trait d'union (« Anti-Dispersion »). */
const MOT_COMPOSE = /(\S+-\S+)/

/**
 * Un texte dont les mots composés ne se coupent jamais au trait d'union (proposition 9, T69) :
 * « Anti-Dispersion » reste sur une ligne, la ligne passe encore aux espaces. Le texte lu et le
 * nom accessible restent les mêmes ; sans trait d'union, le texte sort tel quel.
 */
export function SansCoupureAuTrait({ texte }: Props) {
  if (!MOT_COMPOSE.test(texte)) return texte
  return texte.split(MOT_COMPOSE).map((morceau, rang) =>
    MOT_COMPOSE.test(morceau) ? (
      <span key={`${rang}-${morceau}`} className="whitespace-nowrap">
        {morceau}
      </span>
    ) : (
      morceau
    ),
  )
}
