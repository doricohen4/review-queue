import { describe, expect, it } from 'vitest'
import { PERSONAS, canSubmitAs, hasRole, personaByName, roleLabel } from './personas'

describe('personas', () => {
  it('keeps a submitter-only, a reviewer-only, and a dual-role persona', () => {
    expect(hasRole(personaByName('Alice Johnson'), 'submitter')).toBe(true)
    expect(hasRole(personaByName('Alice Johnson'), 'reviewer')).toBe(false)
    expect(hasRole(personaByName('Bob Smith'), 'reviewer')).toBe(true)
    expect(hasRole(personaByName('Bob Smith'), 'submitter')).toBe(false)
    expect(canSubmitAs('Dana Cole')).toBe(true)
    expect(hasRole(personaByName('Dana Cole'), 'reviewer')).toBe(true)
    expect(roleLabel(personaByName('Dana Cole'))).toBe('submitter · reviewer')
    expect(PERSONAS.some((persona) => persona.name === 'Dana Cole')).toBe(true)
  })
})
