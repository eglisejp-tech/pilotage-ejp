/**
 * Charge la page à cette adresse, comme un nouvel accès : toute la mémoire de la page (cache,
 * écrans, client Supabase et ses minuteurs) disparaît. Sert au passage d'un espace à l'autre (T73).
 */
export function rechargerA(adresse: string): void {
  window.location.assign(adresse)
}
