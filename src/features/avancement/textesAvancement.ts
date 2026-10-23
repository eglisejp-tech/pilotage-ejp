import type { Etape } from '@/features/avancement/etapes'
import { premierePrevue } from '@/features/avancement/resumer'
import { formaterJourCourt, formaterJourSemaine } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'

export const TEXTES = {
  region: 'Avancement de Pilotage EJP',
  voir: 'Voir les étapes',
  voirCourt: 'Voir',
  voirSuite: 'les étapes',
  masquer: 'Masquer les étapes',
  fermer: 'Fermer',
  fermerSuite: "le bandeau d'avancement",
}

export function phraseEnLigne(enLigne: number, total: number): string {
  return `${enLigne === 1 ? 'étape' : 'étapes'} sur ${total} en ligne.`
}

export function phraseProchaine(quoi: string, date: DateIso): string {
  return `Prochaine : ${quoi}, prévue ${formaterJourSemaine(date)}`
}

/** Quand plus rien n'est prévu, il n'y a plus de date à venir : la seconde phrase tombe. */
export function notePanneau(miseAJour: DateIso, resteAVenir: boolean): string {
  const jour = formaterJourCourt(miseAJour)
  const miseAJourLe = `Mis à jour le ${jour}${jour.endsWith('.') ? '' : '.'}`
  // T66 (t055) : « point » et « plan » prêtaient à confusion.
  return resteAVenir ? `${miseAJourLe} Les dates à venir peuvent changer.` : miseAJourLe
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
