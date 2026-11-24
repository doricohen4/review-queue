const drafts = new Map<string, string>()

function draftKey(itemId: string, persona: string): string {
  return `${itemId}\0${persona}`
}

export function readReviewDraft(itemId: string, persona: string): string {
  return drafts.get(draftKey(itemId, persona)) ?? ''
}

export function writeReviewDraft(itemId: string, persona: string, note: string): void {
  const key = draftKey(itemId, persona)
  if (note === '') {
    drafts.delete(key)
    return
  }
  drafts.set(key, note)
}

export function clearReviewDraft(itemId: string, persona: string): void {
  drafts.delete(draftKey(itemId, persona))
}

export function resetReviewDrafts(): void {
  drafts.clear()
}
