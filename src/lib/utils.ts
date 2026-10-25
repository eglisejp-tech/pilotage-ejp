import { createCn } from 'cn/config'

// cn fusionne les classes Tailwind. Il doit connaître les échelles des tokens (src/index.css) :
// sans elles, « text-note » (une taille) et « text-encre-3 » (une couleur) passent toutes deux
// pour des couleurs, et la taille disparaît de la fusion. Les tailles par rôle, les espacements
// et la largeur de lecture des fondations (T69, src/styles/fondations.css) en font partie.
export const cn = createCn({
  extend: {
    theme: {
      text: [
        'semaine',
        'phrase',
        'titre',
        'section',
        'chiffre',
        'texte',
        'note',
        'detail',
        'interface',
        'enregistrer',
        'citation',
        'priorite',
        'titre-point',
        'titre-fenetre',
        'titre-panneau',
      ],
      spacing: ['marge', 'cible', 'cible-saisie', 'sections', 'bloc', 'entete'],
      container: ['contenu', 'lecture'],
      font: ['lecture', 'chiffres', 'interface', 'heading'],
    },
  },
})
