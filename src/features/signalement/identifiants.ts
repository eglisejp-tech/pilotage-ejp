// Identifiants des en-têtes de signalement (T77) : la cible du focus après un geste, et de
// l'ancre `/signalements#<id>` côté ministère. À part des composants (Fast Refresh).

/** L'en-tête d'un signalement dans « Mes signalements » (ministère). */
export function idTitreSignalement(signalementId: string): string {
  return `titre-${signalementId}`
}

/** L'en-tête d'une ligne du bloc « Signalements » d'EJP Tech. */
export function idTitreLigne(signalementId: string): string {
  return `ligne-${signalementId}`
}
