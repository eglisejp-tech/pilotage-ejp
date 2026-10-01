import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { chargerEtatSessionSuivi } from '@/features/session/chargement'
import { clientRequetes, CLE_SESSION, viderDonnees } from '@/lib/requetes'
import { supabase } from '@/lib/supabase'

let abonne = false

/**
 * Réévalue l'état à chaque onAuthStateChange (BRIEF section 8, règle 7). Un seul abonnement pour
 * toute l'application. Le rappel ne doit pas appeler Supabase lui-même (verrou d'auth-js) : le
 * travail part au tour suivant de la boucle d'événements.
 */
function abonnerAuxChangements() {
  if (abonne) return
  abonne = true
  let utilisateurPrecedent: string | null | undefined
  try {
    supabase().auth.onAuthStateChange((evenement, session) => {
      const utilisateur = session?.user.id ?? null
      setTimeout(() => {
        // Autre compte ou déconnexion : aucune donnée du compte précédent ne reste en cache.
        if (utilisateurPrecedent !== undefined && utilisateur !== utilisateurPrecedent) {
          viderDonnees()
        }
        utilisateurPrecedent = utilisateur
        if (evenement !== 'INITIAL_SESSION') {
          void clientRequetes.invalidateQueries({ queryKey: CLE_SESSION })
        }
      }, 0)
    })
  } catch (erreur) {
    // Configuration absente : la requête de session échoue aussi et l'écran d'erreur s'affiche.
    abonne = false
    if (import.meta.env.DEV) console.error(erreur)
  }
}

/** État de la session (TanStack Query) : seule source de vérité des gardes et de la navigation. */
export function useEtatSession() {
  useEffect(() => {
    abonnerAuxChangements()
  }, [])
  return useQuery({
    queryKey: CLE_SESSION,
    queryFn: chargerEtatSessionSuivi,
    staleTime: Infinity,
    gcTime: Infinity,
    // Jamais de chargement sans fin : pas de nouvel essai caché (l'écran d'erreur propose
    // « Réessayer »), et pas de mise en pause hors ligne (la lecture échoue et le dit).
    retry: false,
    networkMode: 'always',
  })
}

/** Relit l'état de la session après une action (connexion, code, mot de passe). */
export function rafraichirSession() {
  return clientRequetes.invalidateQueries({ queryKey: CLE_SESSION })
}
