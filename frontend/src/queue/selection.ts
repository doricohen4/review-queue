export function toggleSelectedId(current: number[], id: number): number[] {
  return current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
}

export function pageAllSelected(pageIds: number[], selectedIds: number[]): boolean {
  return pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))
}

export function togglePageSelection(
  current: number[],
  pageIds: number[],
  allSelected: boolean,
): number[] {
  if (allSelected) {
    return current.filter((id) => !pageIds.includes(id))
  }
  return [...new Set([...current, ...pageIds])]
}

export function clearSelection(): number[] {
  return []
}
