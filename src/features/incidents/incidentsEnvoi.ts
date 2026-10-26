import { useEffect } from 'react'
import { surEchecEnvoi, surEnvoiReussi } from '@/data/envoi'
import { incidentDepuisEchec, noterIncidents } from '@/data/incidents'
import { espaceActif } from '@/lib/espaces'
import { ajouterAFile, envoyerFile } from '@/lib/fileIncidents'

// Branchement des incidents d'envoi (T76, lot C ; conception erreurs-envoi, 6.3). Tout échec
// d'envoi vu par `envoyer` entre dans la file de l'espace actif, à tout moment, même sans session.
// La file ne part que quand la session de cet espace est en aal2 (la mise en page connectée est
// montée) : juste après l'incident, au retour du réseau (`online`), à l'ouverture de la session,
// et après toute écriture réussie. Un seul envoi à la fois ; un échec ne dit rien.

/** Espace dont la session est en aal2, ou null (connexion, double authentification...). */
let espacePret: string | null = null
let installe = false

function envoyerSiPret(): void {
  if (espacePret === null) return
  void envoyerFile(espacePret, noterIncidents)
}

/** Une fois, au démarrage de l'outil (src/main.tsx). */
export function installerIncidents(): void {
  if (installe) return
  installe = true
  surEchecEnvoi((echec) => {
    const incident = incidentDepuisEchec(echec, {
      chemin: window.location.pathname,
      userAgent: navigator.userAgent,
      visible: typeof document === 'undefined' ? null : document.visibilityState === 'visible',
      maintenant: new Date(),
    })
    if (incident === null) return
    ajouterAFile(espaceActif().id, incident)
    envoyerSiPret()
  })
  surEnvoiReussi(envoyerSiPret)
  window.addEventListener('online', envoyerSiPret)
}

/**
 * Session de l'espace actif en aal2 (`espaceId`), ou plus de session (null). La file de l'espace
 * part dès qu'il est prêt.
 */
export function sessionPrete(espaceId: string | null): void {
  espacePret = espaceId
  envoyerSiPret()
}

/** Dans la mise en page du compte connecté en aal2 : la file de son espace peut partir. */
export function useIncidentsEnvoi(): void {
  useEffect(() => {
    sessionPrete(espaceActif().id)
    return () => {
      sessionPrete(null)
    }
  }, [])
}
