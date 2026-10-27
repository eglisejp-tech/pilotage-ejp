/** Pages de saisie et suivi des signalements (T77) : le bandeau d'avancement y est masqué (T50). */
export function bandeauMasque(chemin: string): boolean {
  return ['/saisir', '/signaler', '/signalements'].some(
    (debut) => chemin === debut || chemin.startsWith(`${debut}/`),
  )
}
