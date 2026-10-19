import { LibelleEnvoi } from '@/components/etats/LibelleEnvoi'

type Proprietes = {
  onClick: () => void
  enCours?: boolean
}

/**
 * « Se déconnecter », dessiné comme un lien (maquette 04), cible de 44 px. Pendant la
 * déconnexion, la petite flamme accompagne « Déconnexion en cours » (T65, moment 4).
 */
export function BoutonDeconnexion({ onClick, enCours = false }: Proprietes) {
  return (
    <button
      type="button"
      aria-disabled={enCours || undefined}
      onClick={() => {
        if (!enCours) onClick()
      }}
      className="inline-flex min-h-cible items-center text-sm whitespace-nowrap text-encre-3 underline underline-offset-4 aria-disabled:cursor-wait"
    >
      <LibelleEnvoi enCours={enCours} libelleEnCours="Déconnexion en cours">
        Se déconnecter
      </LibelleEnvoi>
    </button>
  )
}
