import type { HeuristicFlag } from '@/types/api'

const EMPTY = '—'

/** Risk for a table cell; pass a different `empty` for the panel summary. */
export function riskLabel(risk: string | null | undefined, empty = EMPTY): string {
  return risk == null || risk === '' ? empty : risk
}

/** Submitter / reviewer name, or a dash when the relation was not loaded. */
export function personName(name: string | undefined, empty = EMPTY): string {
  return name == null || name === '' ? empty : name
}

export function hasFlags(flags: HeuristicFlag[] | null | undefined): boolean {
  return (flags ?? []).length > 0
}

/** One heuristic flag as "key (weight) — reason". */
export function flagLine(flag: HeuristicFlag): string {
  return `${flag.key} (${flag.weight}) — ${flag.reason}`
}
