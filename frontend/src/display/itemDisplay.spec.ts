import { describe, expect, it } from 'vitest'
import { flagLine, hasFlags, personName, riskLabel } from './itemDisplay'

describe('itemDisplay', () => {
  it('prints a dash when risk or submitter name is missing', () => {
    expect(riskLabel(null)).toBe('—')
    expect(personName(undefined)).toBe('—')
  })

  it('formats flag lines outside the template', () => {
    expect(hasFlags([])).toBe(false)
    expect(flagLine({ key: 'keyword:password', weight: 40, reason: 'password token' })).toBe(
      'keyword:password (40) — password token',
    )
  })
})
