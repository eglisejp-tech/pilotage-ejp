/**
 * Donne le focus au champ qui porte l'erreur. Pour un groupe (la grille de répartition), le focus
 * va à sa première case en erreur (`aria-invalid`), sinon à sa première case : le lecteur d'écran
 * y lit le message qui la concerne (sa propre consigne, comme « Saisissez un nombre entier, sans
 * virgule ni lettre. », ou celui du groupe), relié par `aria-describedby`, et la personne peut
 * corriger tout de suite.
 */
export function focaliserChamp(id: string): void {
  const element = document.getElementById(id)
  if (element === null) return
  const premiereCase =
    element.getAttribute('role') === 'group'
      ? (element.querySelector<HTMLElement>('input[aria-invalid="true"]') ??
        element.querySelector<HTMLElement>('input'))
      : null
  ;(premiereCase ?? element).focus()
}
