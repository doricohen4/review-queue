import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearReviewDraft,
  readReviewDraft,
  resetReviewDrafts,
  writeReviewDraft,
} from './reviewDrafts'

describe('reviewDrafts', () => {
  beforeEach(() => {
    resetReviewDrafts()
  })

  it('keeps notes per item and persona, and drops empty drafts', () => {
    writeReviewDraft('12', 'Bob Martinez', 'Fix the caption.')
    writeReviewDraft('12', 'Dana Kim', 'Different reviewer.')
    writeReviewDraft('8', 'Bob Martinez', 'Other item.')

    expect(readReviewDraft('12', 'Bob Martinez')).toBe('Fix the caption.')
    expect(readReviewDraft('12', 'Dana Kim')).toBe('Different reviewer.')
    expect(readReviewDraft('8', 'Bob Martinez')).toBe('Other item.')
    expect(readReviewDraft('12', 'Alice Johnson')).toBe('')

    writeReviewDraft('12', 'Bob Martinez', '')
    expect(readReviewDraft('12', 'Bob Martinez')).toBe('')
    expect(readReviewDraft('12', 'Dana Kim')).toBe('Different reviewer.')

    clearReviewDraft('12', 'Dana Kim')
    expect(readReviewDraft('12', 'Dana Kim')).toBe('')
  })
})
