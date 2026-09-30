import { useEffect } from 'react'

/** Titre de l'onglet : « {écran}, Pilotage EJP » (BRIEF section 10, « Textes »). */
export function useTitrePage(ecran: string) {
  useEffect(() => {
    const precedent = document.title
    document.title = `${ecran}, Pilotage EJP`
    return () => {
      document.title = precedent
    }
  }, [ecran])
}
