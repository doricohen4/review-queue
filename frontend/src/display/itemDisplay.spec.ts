import { describe, expect, it } from 'vitest'
import {
  canEditItem,
  editableSelection,
  canReviewItem,
  flagLine,
  formatTimestamp,
  hasFlags,
  initials,
  personName,
  submitterHue,
} from './itemDisplay'

describe('itemDisplay', () => {
  it('prints a dash when the submitter name is missing', () => {
    expect(personName(undefined)).toBe('—')
  })

  it('builds initials from a persona name', () => {
    expect(initials('Alice Johnson')).toBe('AJ')
  })

  it('hides review when the actor submitted a pending item', () => {
    const item = { status: 'pending', submitter: { name: 'Alice Johnson' } }
    expect(canReviewItem(item, 'Alice Johnson')).toBe(false)
    expect(canReviewItem(item, 'Bob Smith')).toBe(true)
    expect(canReviewItem({ status: 'approved', submitter: { name: 'Bob Smith' } }, 'Alice Johnson')).toBe(
      false,
    )
  })

  it('lets only reviewer personas review, including a dual-role persona on someone else’s item', () => {
    const aliceItem = { status: 'pending', submitter: { name: 'Alice Johnson' } }
    const danaItem = { status: 'pending', submitter: { name: 'Dana Cole' } }
    expect(canReviewItem(aliceItem, 'Alice Johnson')).toBe(false)
    expect(canReviewItem({ status: 'pending', submitter: { name: 'Bob Smith' } }, 'Alice Johnson')).toBe(
      false,
    )
    expect(canReviewItem(aliceItem, 'Dana Cole')).toBe(true)
    expect(canReviewItem(danaItem, 'Dana Cole')).toBe(false)
    expect(canReviewItem(danaItem, 'Bob Smith')).toBe(true)
  })

  it('lets only the submitter edit a pending or needs-work item', () => {
    const pending = { status: 'pending', submitter: { name: 'Alice Johnson' } }
    const sentBack = { status: 'needs_work', submitter: { name: 'Alice Johnson' } }
    expect(canEditItem(pending, 'Alice Johnson')).toBe(true)
    expect(canEditItem(sentBack, 'Alice Johnson')).toBe(true)
    expect(canEditItem(pending, 'Bob Smith')).toBe(false)
    expect(canEditItem(sentBack, 'Dana Cole')).toBe(false)
    expect(canEditItem({ status: 'approved', submitter: { name: 'Alice Johnson' } }, 'Alice Johnson')).toBe(
      false,
    )
  })

  it('offers update only for one selected item the actor can edit', () => {
    const alice = { id: 1, status: 'pending', submitter: { name: 'Alice Johnson' } }
    const bob = { id: 2, status: 'pending', submitter: { name: 'Bob Smith' } }
    expect(editableSelection([alice, bob], [1], 'Alice Johnson')).toEqual(alice)
    expect(editableSelection([alice, bob], [1, 2], 'Alice Johnson')).toBeNull()
    expect(editableSelection([alice, bob], [], 'Alice Johnson')).toBeNull()
    expect(editableSelection([bob], [2], 'Alice Johnson')).toBeNull()
  })

  it('gives each submitter a different icon color', () => {
    const names = ['Alice Johnson', 'Bob Smith', 'Carol Williams', 'Dana Cole', 'Maria Lopez']
    const hues = names.map((name) => submitterHue(name))
    expect(new Set(hues).size).toBe(names.length)
    expect(submitterHue('Alice Johnson')).toBe(submitterHue('  alice johnson '))
  })

  it('uses a recent label for timestamps from the last day, otherwise a calendar time', () => {
    const now = Date.parse('2026-11-24T12:00:00.000Z')
    expect(formatTimestamp('2026-11-24T11:59:20.000Z', now)).toBe('just now')
    expect(formatTimestamp('2026-11-24T11:10:00.000Z', now)).toBe('50m ago')
    expect(formatTimestamp('2026-11-22T09:05:00.000Z', now)).toBe('22 Nov 2026, 09:05')
  })

  it('formats flag lines outside the template', () => {
    expect(hasFlags([])).toBe(false)
    expect(flagLine({ key: 'keyword:password', weight: 40, reason: 'password token' })).toBe(
      'keyword:password (40) — password token',
    )
  })
})
