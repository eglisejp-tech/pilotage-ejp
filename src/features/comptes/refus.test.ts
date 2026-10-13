import { describe, expect, it } from 'vitest'
import { schemaCibleCompte } from '../../../supabase/functions/_shared/schemas.ts'
import { ErreurCompte, MESSAGES_ERREURS_COMPTES } from '@/data/comptes'
import { lireRefusCompte } from '@/features/comptes/refus'

describe('lireRefusCompte', () => {
  it('identifiant de compte illisible avant l’appel : le compte est introuvable (m197)', () => {
    const erreur = schemaCibleCompte.safeParse({ user_id: 'pas-un-uuid' }).error
    expect(lireRefusCompte(erreur)).toEqual({
      ou: 'formulaire',
      message: 'Ce compte est introuvable. Rechargez la page.',
    })
  })

  it('un autre champ refusé par le schéma : vérifier les champs', () => {
    const erreur = schemaCibleCompte.safeParse({ user_id: crypto.randomUUID(), autre: 1 }).error
    expect(lireRefusCompte(erreur)).toEqual({
      ou: 'formulaire',
      message: MESSAGES_ERREURS_COMPTES.requete_invalide,
    })
  })

  it('adresse et nom déjà pris : sous leur champ ; les autres codes sous le bouton', () => {
    expect(lireRefusCompte(new ErreurCompte('adresse_deja_utilisee')).ou).toBe('email')
    expect(lireRefusCompte(new ErreurCompte('nom_ministere_deja_pris')).ou).toBe('nom')
    expect(lireRefusCompte(new ErreurCompte('conflit'))).toEqual({
      ou: 'formulaire',
      message: "Une autre modification vient d'avoir lieu. Vérifiez la liste, puis réessayez.",
    })
  })

  it('réponse absente : vérifier la liste avant de réessayer', () => {
    expect(lireRefusCompte(new TypeError('Failed to fetch'))).toEqual({
      ou: 'formulaire',
      message: MESSAGES_ERREURS_COMPTES.connexion,
    })
  })
})
