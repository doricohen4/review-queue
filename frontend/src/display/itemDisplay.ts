import type { HeuristicFlag } from '@/types/api'

const EMPTY = '—'

export function riskLabel(risk: string | null | undefined, empty = EMPTY): string {
  return risk == null || risk === '' ? empty : risk
}

export function personName(name: string | undefined, empty = EMPTY): string {
  return name == null || name === '' ? empty : name
}

export function hasFlags(flags: HeuristicFlag[] | null | undefined): boolean {
  return (flags ?? []).length > 0
}

export function flagLine(flag: HeuristicFlag): string {
  return `${flag.key} (${flag.weight}) — ${flag.reason}`
}
