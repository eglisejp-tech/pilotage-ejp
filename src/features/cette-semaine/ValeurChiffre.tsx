interface Props {
  valeur: string | null
  unite?: string
}

/** Valeur d'un chiffre de l'église, en Big Shoulders à chasse fixe. */
export function ValeurChiffre({ valeur, unite }: Props) {
  if (valeur === null) {
    return <span className="text-sm text-encre-3">Pas encore de saisie</span>
  }
  return (
    <span className="font-chiffres text-chiffre leading-none font-extrabold whitespace-nowrap tabular-nums">
      {valeur}
      {unite ? <span className="ml-0.5 text-[0.5em]">{unite}</span> : null}
    </span>
  )
}
