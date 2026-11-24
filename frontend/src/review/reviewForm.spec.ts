import { describe, expect, it } from 'vitest'
import { canSendReview, needsWorkNoteError, reviewNotePayload } from './reviewForm'

describe('reviewForm', () => {
  it('blocks needs_work until the note has text', () => {
    expect(canSendReview('needs_work', '')).toBe(false)
    expect(canSendReview('needs_work', '   ')).toBe(false)
    expect(needsWorkNoteError('')).toBe('Add a note so the submitter knows what to change.')
    expect(canSendReview('needs_work', 'Add safety warnings.')).toBe(true)
    expect(needsWorkNoteError('Add safety warnings.')).toBeNull()
  })

  it('lets approve and reject go out with no note', () => {
    expect(canSendReview('approved', '')).toBe(true)
    expect(reviewNotePayload('approved', '')).toBeNull()
    expect(reviewNotePayload('rejected', '  nope  ')).toBe('nope')
    expect(reviewNotePayload('needs_work', '  fix copy  ')).toBe('fix copy')
  })
})
