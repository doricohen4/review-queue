export type PersonaRole = 'submitter' | 'reviewer'

/** A person can hold both roles; `same_person` still blocks reviewing your own item. */
export type Persona = {
  name: string
  roles: PersonaRole[]
}

/** Seed demo people. No login — the header picker is identity. */
export const PERSONAS: Persona[] = [
  { name: 'Alice Johnson', roles: ['submitter'] },
  { name: 'Bob Smith', roles: ['reviewer'] },
  { name: 'Carol Williams', roles: ['reviewer'] },
  { name: 'Dana Cole', roles: ['submitter', 'reviewer'] },
]

export function personaByName(name: string): Persona | undefined {
  return PERSONAS.find((persona) => persona.name === name)
}

export function hasRole(persona: Persona | undefined, role: PersonaRole): boolean {
  return persona?.roles.includes(role) === true
}

export function canSubmitAs(name: string): boolean {
  return hasRole(personaByName(name), 'submitter')
}

export function canReviewAs(name: string): boolean {
  return hasRole(personaByName(name), 'reviewer')
}

export function roleLabel(persona: Persona | undefined): string {
  return (persona?.roles ?? []).join(' · ')
}
