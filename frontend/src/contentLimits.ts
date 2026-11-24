/** Same numbers as App\Domain\ContentLimits. */
export const TITLE_MIN = 3
export const TITLE_MAX = 120
export const DESCRIPTION_MIN = 10
export const DESCRIPTION_MAX = 5000
export const NOTE_MAX = 2000

export function fieldError(
  value: string,
  min: number,
  max: number,
  label: string,
): string | null {
  const length = value.trim().length
  if (length === 0) {
    return `${label} is required.`
  }
  if (length < min) {
    return `${label} needs at least ${min} characters (${length}/${min}).`
  }
  if (length > max) {
    return `${label} is too long (${length}/${max}).`
  }
  return null
}

export function titleError(value: string): string | null {
  return fieldError(value, TITLE_MIN, TITLE_MAX, 'Title')
}

export function descriptionError(value: string): string | null {
  return fieldError(value, DESCRIPTION_MIN, DESCRIPTION_MAX, 'Description')
}

export function itemCopyIsValid(title: string, description: string): boolean {
  return titleError(title) === null && descriptionError(description) === null
}
