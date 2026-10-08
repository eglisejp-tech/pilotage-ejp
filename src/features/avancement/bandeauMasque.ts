/** Pages de saisie : le bandeau d'avancement y est masqué (T50). */
export function bandeauMasque(chemin: string): boolean {
  return ['/saisir', '/signaler'].some(
    (debut) => chemin === debut || chemin.startsWith(`${debut}/`),
  )
}
