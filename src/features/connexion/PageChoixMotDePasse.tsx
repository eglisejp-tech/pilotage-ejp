import { useState } from 'react'
import { EcranMotDePasse } from '@/features/connexion/EcranMotDePasse'
import type { ValeursNouveauMotDePasse } from '@/features/connexion/schemas'
import { choisirMotDePasse } from '@/features/session/actions'
import { useEtatVerifie } from '@/features/session/contexte'
import { useMotDePasseAChoisir } from '@/features/session/motDePasseAChoisir'

/**
 * /acces/mot-de-passe : « Choisissez votre mot de passe » (invitation) ou « Nouveau mot de passe »
 * (récupération, après le code si le compte en a un). La garde de la zone s'en assure.
 */
export function PageChoixMotDePasse() {
  const etat = useEtatVerifie()
  const etape = useMotDePasseAChoisir() ?? 'recuperation'
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string>()

  async function enregistrer(valeurs: ValeursNouveauMotDePasse) {
    setErreur(undefined)
    setEnCours(true)
    const resultat = await choisirMotDePasse(valeurs)
    // Réussite : l'étape s'efface et la garde affiche la suite (activation ou accueil).
    if (resultat.erreur) {
      setErreur(resultat.erreur)
      setEnCours(false)
    }
  }

  const compte = etat.statut === 'activation' || etat.statut === 'connecte' ? etat : null

  return (
    <EcranMotDePasse
      variante={etape}
      onSubmit={(valeurs) => void enregistrer(valeurs)}
      enCours={enCours}
      erreur={erreur}
      libelleCompte={compte?.compte.libelle}
      email={compte?.email ?? undefined}
    />
  )
}
