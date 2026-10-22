import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { LienSignalement } from '@/features/signalement/LienSignalement'
import { LIBELLES_ECRAN, TEXTES_SIGNALEMENT } from '@/features/signalement/textes'

const TIRETS = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`)

function textesDe(valeur: unknown): string[] {
  if (typeof valeur === 'string') return [valeur]
  if (typeof valeur === 'object' && valeur !== null) return Object.values(valeur).flatMap(textesDe)
  return []
}

describe('LienSignalement', () => {
  it('mène à /signaler avec l’écran d’origine, sous le texte « Signaler une difficulté »', () => {
    render(
      <MemoryRouter>
        <LienSignalement ecran="saisie_evenement" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Signaler une difficulté' })).toHaveAttribute(
      'href',
      '/signaler?ecran=saisie_evenement',
    )
  })

  it('un lien dans une phrase reste en ligne ; seul le lien seul a une cible de 44 px', () => {
    const { rerender } = render(
      <MemoryRouter>
        <LienSignalement ecran="saisie_reunion" enLigne />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link')).not.toHaveClass('min-h-cible')
    rerender(
      <MemoryRouter>
        <LienSignalement ecran="saisie_reunion" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link')).toHaveClass('min-h-cible')
  })
})

describe('textes du signalement', () => {
  it('ne dit pas qui lit le signalement à l’écran (T66, t149), ni l’administration', () => {
    expect('phraseTitre' in TEXTES_SIGNALEMENT).toBe(false)
    expect(TEXTES_SIGNALEMENT.confirmation).toBe(
      "Signalement envoyé. La réponse s'affichera sur cette page.",
    )
    for (const texte of [...textesDe(TEXTES_SIGNALEMENT), ...Object.values(LIBELLES_ECRAN)]) {
      expect(texte).not.toMatch(/administration/i)
      expect(texte).not.toMatch(/berger|conseil/i)
    }
  })

  it('écrit la ligne de contexte avec le nom de l’écran', () => {
    expect(TEXTES_SIGNALEMENT.ligneContexte('saisie_evenement')).toBe(
      'Écran concerné : Ajouter un événement',
    )
  })

  it('garde les messages de date refusée et de ligne identique de la section 7', () => {
    expect(TEXTES_SIGNALEMENT.dateRefuseeAjout).toBe(
      "Cette date est passée. Choisissez aujourd'hui ou une date à venir.",
    )
    // Une seule phrase de date passée, à l'ajout comme à la mise à jour (T66, t140 et m125).
    expect(TEXTES_SIGNALEMENT.dateRefuseeMiseAJour).toBe(
      "Cette date est passée. Choisissez aujourd'hui ou une date à venir.",
    )
    expect(TEXTES_SIGNALEMENT.questionDate).toBe('Vous ne pouvez pas choisir de date ?')
    // Formule « déjà enregistré » (m134, proposé le 12 octobre 2026).
    expect(TEXTES_SIGNALEMENT.ligneIdentique).toBe(
      "Ce statut et cette date sont déjà enregistrés. Changez l'un des deux.",
    )
  })

  it('n’emploie ni tiret cadratin, ni « cliquez », ni point d’exclamation', () => {
    for (const texte of [...textesDe(TEXTES_SIGNALEMENT), ...Object.values(LIBELLES_ECRAN)]) {
      expect(texte).not.toMatch(TIRETS)
      expect(texte).not.toMatch(/cliquez/i)
      expect(texte).not.toContain('!')
    }
  })
})
