/**
 * Donne le focus au champ qui porte l'erreur. Pour un groupe (la grille de répartition), le focus
 * va à sa première case : le lecteur d'écran y lit le message du groupe, relié à chaque case par
 * `aria-describedby`, et la personne peut corriger tout de suite.
 */
export function focaliserChamp(id: string): void {
  const element = document.getElementById(id)
  if (element === null) return
  const premiereCase =
    element.getAttribute('role') === 'group' ? element.querySelector('input') : null
  ;(premiereCase ?? element).focus()
}
