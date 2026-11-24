/** Needs-work must carry a note; approve/reject may omit one. */
export function reviewNotePayload(decision: string, note: string): string | null {
  const trimmed = note.trim()
  if (decision === 'needs_work') {
    return trimmed
  }
  return trimmed === '' ? null : trimmed
}

export function needsWorkNoteError(note: string): string | null {
  if (note.trim() === '') {
    return 'Add a note so the submitter knows what to change.'
  }
  return null
}

export function canSendReview(decision: string, note: string): boolean {
  return decision !== 'needs_work' || note.trim() !== ''
}
