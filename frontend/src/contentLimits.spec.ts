import { describe, expect, it } from 'vitest'
import {
  DESCRIPTION_MIN,
  TITLE_MIN,
  descriptionError,
  itemCopyIsValid,
  titleError,
} from './contentLimits'

describe('item copy limits', () => {
  it('rejects an empty or too-short title', () => {
    expect(titleError('')).toBe('Title is required.')
    expect(titleError('  Hi  ')).toBe(`Title needs at least ${TITLE_MIN} characters (2/${TITLE_MIN}).`)
    expect(titleError('Lab recap')).toBeNull()
  })

  it('rejects a description under the minimum', () => {
    expect(descriptionError('Too short')).toBe(
      `Description needs at least ${DESCRIPTION_MIN} characters (9/${DESCRIPTION_MIN}).`,
    )
    expect(descriptionError('Body copy for the classroom.')).toBeNull()
  })

  it('only treats the form as ready when both fields pass', () => {
    expect(itemCopyIsValid('Hi', 'Body copy for the classroom.')).toBe(false)
    expect(itemCopyIsValid('Lab recap', 'Body copy for the classroom.')).toBe(true)
  })
})
