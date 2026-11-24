export type Persona = {
  name: string
  role: 'submitter' | 'reviewer'
}

/** Seed demo people. No login — the header picker is identity. */
export const PERSONAS: Persona[] = [
  { name: 'Alice Johnson', role: 'submitter' },
  { name: 'Bob Smith', role: 'reviewer' },
  { name: 'Carol Williams', role: 'reviewer' },
]

export const TITLE_MAX = 120
export const DESCRIPTION_MAX = 5000
export const NOTE_MAX = 2000
