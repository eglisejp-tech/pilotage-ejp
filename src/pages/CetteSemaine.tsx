// Accueil provisoire. La vraie vue « Cette semaine » (maquettes 01 à 03) arrive à l'étape 3.
export function CetteSemaine() {
  return (
    <section aria-labelledby="titre-page">
      <h1 id="titre-page" className="font-lecture text-titre leading-tight font-medium">
        Cette semaine
      </h1>
      <div className="mt-2 border-t-2 border-encre" />
      <p className="mt-6 max-w-prose text-encre-2">
        L'application se construit étape par étape. Les chiffres de l'église, les points d'attention
        et les ministères s'afficheront ici à partir de l'étape 3.
      </p>
    </section>
  )
}
