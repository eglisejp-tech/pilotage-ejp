import { useSyncExternalStore } from 'react'

// Après un lien d'invitation ou de récupération (/acces), le compte doit choisir un mot de passe
// avant d'aller plus loin : invitation, puis activation (17) ; récupération, code (18) d'abord si
// le compte a un facteur, puis nouveau mot de passe (BRIEF section 8). L'étape survit à un
// rechargement de l'onglet (sessionStorage), jamais au-delà.

export type EtapeMotDePasse = 'invitation' | 'recuperation'

const CLE = 'pilotage-ejp.mot-de-passe-a-choisir'
const abonnes = new Set<() => void>()
// Repli quand sessionStorage est refusé (navigation privée stricte).
let memoire: EtapeMotDePasse | null = null

function lire(): EtapeMotDePasse | null {
  try {
    const valeur = window.sessionStorage.getItem(CLE)
    return valeur === 'invitation' || valeur === 'recuperation' ? valeur : null
  } catch {
    return memoire
  }
}

function ecrire(valeur: EtapeMotDePasse | null) {
  memoire = valeur
  try {
    if (valeur) window.sessionStorage.setItem(CLE, valeur)
    else window.sessionStorage.removeItem(CLE)
  } catch {
    // sessionStorage indisponible : la mémoire suffit pour cet onglet.
  }
  abonnes.forEach((abonne) => abonne())
}

export function definirMotDePasseAChoisir(etape: EtapeMotDePasse) {
  ecrire(etape)
}

export function effacerMotDePasseAChoisir() {
  ecrire(null)
}

export function lireMotDePasseAChoisir(): EtapeMotDePasse | null {
  return lire()
}

function sAbonner(abonne: () => void) {
  abonnes.add(abonne)
  return () => {
    abonnes.delete(abonne)
  }
}

export function useMotDePasseAChoisir(): EtapeMotDePasse | null {
  return useSyncExternalStore(sAbonner, lire, () => null)
}
