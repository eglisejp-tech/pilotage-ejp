import { useState } from 'react'
import { Bouton } from '@/components/ui/Bouton'
import { changerDEspace } from '@/features/espaces/actions'
import { TEXTES_ESPACES } from '@/features/espaces/textes'
import { useRegistre } from '@/features/espaces/useRegistre'
import { espaceActif, espacesConnus } from '@/lib/espaces'

/**
 * Connexion et code d'un espace en cours d'ajout, ou dont la connexion a expiré (T73) : les autres
 * comptes ouverts sur l'appareil restent à un appui, « Revenir à EJP Tech, compte 1 ». Quitter
 * cet espace inachevé le ferme. Rien sans autre compte ouvert.
 */
export function RetourEspaces() {
  const registre = useRegistre()
  const [enCours, setEnCours] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string>()
  const actif = espaceActif(registre)
  const autres = espacesConnus(registre).filter(({ id }) => id !== actif.id)
  if (autres.length === 0) return null

  async function revenir(id: string) {
    if (enCours) return
    setErreur(undefined)
    setEnCours(id)
    const resultat = await changerDEspace(id)
    if (resultat.erreur) {
      setErreur(resultat.erreur)
      setEnCours(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {actif.libelle === undefined ? (
        <p className="text-interface leading-normal text-encre-2">{TEXTES_ESPACES.ajout}</p>
      ) : null}
      {autres.map((espace) => (
        <Bouton
          key={espace.id}
          pleineLargeur
          enCours={enCours === espace.id}
          libelleEnCours={TEXTES_ESPACES.changementEnCours}
          onClick={() => void revenir(espace.id)}
          className="wrap-anywhere"
        >
          {TEXTES_ESPACES.revenir(espace.libelle ?? '')}
        </Bouton>
      ))}
      {erreur ? (
        <p role="alert" className="bg-alerte-fond px-3.5 py-3 text-detail text-alerte">
          {erreur}
        </p>
      ) : null}
    </div>
  )
}
