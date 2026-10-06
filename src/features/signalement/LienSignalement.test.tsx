import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { LienSignalement } from '@/features/signalement/LienSignalement'
import {
  LECTEUR_SIGNALEMENT,
  LIBELLES_ECRAN,
  TEXTES_SIGNALEMENT,
} from '@/features/signalement/textes'

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
  it('dit que EJP Tech lit le signalement, et jamais que l’administration le lit', () => {
    expect(LECTEUR_SIGNALEMENT).toBe('EJP Tech lit votre signalement.')
    expect(TEXTES_SIGNALEMENT.phraseTitre).toBe(
      'EJP Tech lit votre signalement. Décrivez ce qui vous bloque en une ou deux phrases.',
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
    expect(TEXTES_SIGNALEMENT.dateRefuseeMiseAJour).toBe(
      "La nouvelle date doit être aujourd'hui ou plus tard.",
    )
    expect(TEXTES_SIGNALEMENT.questionDate).toBe('Vous ne pouvez pas choisir de date ?')
    expect(TEXTES_SIGNALEMENT.ligneIdentique).toBe(
      "Rien n'a changé : ce statut et cette date sont déjà enregistrés.",
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
