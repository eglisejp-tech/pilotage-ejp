type Proprietes = {
  onClick: () => void
  enCours?: boolean
}

/** « Se déconnecter », dessiné comme un lien (maquette 04), cible de 44 px. */
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
      {enCours ? 'Déconnexion en cours' : 'Se déconnecter'}
    </button>
  )
}
