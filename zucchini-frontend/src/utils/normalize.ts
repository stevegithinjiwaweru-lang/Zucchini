export const LIST_KEYS = ['data', 'items', 'orders', 'riders', 'results', 'rows'] as const;
type AnyObj = Record<string, any>;

/**
 * Ensure the value is an array.
 * - If value is an array -> return it
 * - If value is an object with a known list key -> return that array
 * - If value is null/undefined/primitive -> []
 * - If value is a plain object but does not contain list keys -> []
 *
 * This is intentionally conservative: we DO NOT wrap single objects into arrays
 * automatically to avoid accidental mistaken mappings.
 */
export function ensureArray<T = any>(value: unknown): T[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'object') {
    const obj = value as AnyObj;
    for (const key of LIST_KEYS) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
    return [];
  }
  return [];
}

/**
 * Return a normalized response object { data: T[] } for predictable use.
 */
export function normalizeApiResponse<T = any>(payload: unknown): { data: T[] } {
  return { data: ensureArray<T>(payload) };
}
