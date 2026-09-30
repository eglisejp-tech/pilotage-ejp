import { createCn } from 'cn/config'

// cn fusionne les classes Tailwind. Il doit connaître les échelles des tokens (src/index.css) :
// sans elles, « text-note » (une taille) et « text-encre-3 » (une couleur) passent toutes deux
// pour des couleurs, et la taille disparaît de la fusion.
export const cn = createCn({
  extend: {
    theme: {
      text: ['semaine', 'phrase', 'titre', 'section', 'chiffre', 'texte', 'note'],
      spacing: ['marge', 'cible', 'cible-saisie'],
      container: ['contenu'],
      font: ['lecture', 'chiffres', 'interface', 'heading'],
    },
  },
})
