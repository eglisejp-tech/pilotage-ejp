import type { Etape } from '@/features/avancement/etapes'
import { premierePrevue } from '@/features/avancement/resumer'
import { formaterJourCourt, formaterJourSemaine } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'

export const TEXTES = {
  region: "Avancement de l'outil",
  voir: 'Voir les étapes',
  voirCourt: 'Voir',
  voirSuite: 'les étapes',
  masquer: 'Masquer les étapes',
  fermer: 'Fermer',
  fermerSuite: "le bandeau d'avancement",
  toutEnLigne: 'Toutes les étapes sont en ligne.',
}

export function phraseEnLigne(enLigne: number, total: number): string {
  return `${enLigne === 1 ? 'étape' : 'étapes'} sur ${total} en ligne.`
}

export function phraseProchaine(quoi: string, date: DateIso): string {
  return `Prochaine : ${quoi}, prévue ${formaterJourSemaine(date)}`
}

export function notePanneau(miseAJour: DateIso): string {
  const jour = formaterJourCourt(miseAJour)
  return `Point du ${jour}${jour.endsWith('.') ? '' : '.'} Les dates à venir sont celles du plan : elles peuvent bouger.`
}

export function prevueLe(date: DateIso): string {
  return `Prévue ${formaterJourSemaine(date)}`
}

export function enPartie(etape: Etape): string {
  const total = etape.livre.length + etape.prevu.length
  const nombre = etape.livre.length
  return `En partie : ${nombre} ${nombre === 1 ? 'partie' : 'parties'} sur ${total} en ligne.`
}

export function prochainePartie(etape: Etape): string | null {
  const suivante = premierePrevue(etape)
  return suivante ? `Prochaine : ${suivante.quoi}, ${formaterJourSemaine(suivante.date)}` : null
}
